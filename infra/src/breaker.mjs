// Giftmaxxing cost circuit-breaker — the $1,000 kill switch.
//
// Triggered two ways:
//   • SNS  (the $1,000 budget notification OR a real-time CloudWatch alarm, via
//     the cost-killswitch topic) -> ENGAGE: flip the DynamoDB feature flag to
//     { paused: true }. The API Lambda reads that flag and 503s the non-essential
//     (cost-driving) routes — visual search, vector recs, /pins, and Maxi later —
//     while auth, feed/posts, and data collection keep serving.
//   • Direct invoke { "action": "resume" } -> RESUME: flip paused back to false.
//     Nothing auto-resumes; a human must approve by running the resume command.
//
// DynamoDB + lib-dynamodb come from the nodejs20.x runtime SDK; @aws-sdk/client-sns
// is bundled (see infra/src/package.json). No extra deps.
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});
const sns = new SNSClient({});

const CONFIG = process.env.CONFIG_TABLE;
const ALERTS_TOPIC = process.env.COST_ALERTS_TOPIC_ARN;
const RESUME_HINT =
  process.env.RESUME_HINT ||
  "aws lambda invoke --function-name <breaker> --payload '{\"action\":\"resume\"}' --cli-binary-format raw-in-base64-out /dev/stdout";

const FLAG_KEY = "feature-flags";

// Flip the flag. ExpressionAttributeNames avoid any DynamoDB reserved-word clash.
async function setPaused(paused, reason) {
  const now = Date.now();
  const tsField = paused ? "pausedAt" : "resumedAt";
  await ddb.send(
    new UpdateCommand({
      TableName: CONFIG,
      Key: { key: FLAG_KEY },
      UpdateExpression: "SET #paused = :p, #updatedAt = :now, #reason = :r, #ts = :now",
      ExpressionAttributeNames: {
        "#paused": "paused",
        "#updatedAt": "updatedAt",
        "#reason": "reason",
        "#ts": tsField,
      },
      ExpressionAttributeValues: { ":p": paused, ":now": now, ":r": reason ?? null },
    })
  );
}

async function notify(subject, message) {
  if (!ALERTS_TOPIC) return;
  try {
    await sns.send(
      new PublishCommand({ TopicArn: ALERTS_TOPIC, Subject: subject.slice(0, 100), Message: message })
    );
  } catch (err) {
    console.error("breaker notify failed", err);
  }
}

// Human-readable reason from whatever triggered us (SNS subject/message, alarm,
// or a manual { reason }).
function triggerReason(event) {
  const rec = event?.Records?.find((r) => r.Sns);
  if (rec) return rec.Sns.Subject || String(rec.Sns.Message || "").slice(0, 200) || "SNS trigger";
  return event?.reason || "manual";
}

export const handler = async (event) => {
  const fromSns = Array.isArray(event?.Records) && event.Records.some((r) => r.Sns);
  const action = event?.action ?? (fromSns ? "engage" : "status");

  if (action === "resume") {
    await setPaused(false, "manual resume");
    await notify(
      "Giftmaxxing — features RESUMED",
      "The cost kill switch was manually resumed. Non-essential features (visual search, vector recommendations, Maxi) are live again and autoscaling is restored."
    );
    return { ok: true, action: "resume", paused: false };
  }

  if (action === "engage") {
    const reason = triggerReason(event);
    await setPaused(true, reason);
    await notify(
      "Giftmaxxing — COST KILL SWITCH ENGAGED",
      [
        `Spend/usage tripwire fired: ${reason}`,
        "",
        "Non-essential, cost-driving features are now PAUSED:",
        "  - Visual search (Bedrock Titan)",
        "  - Vector recommendations + /pins (S3 Vectors)",
        "  - Maxi agent (Bedrock Haiku + AgentCore), once deployed",
        "",
        "Still serving (essential): auth, feed/posts, and data collection.",
        "",
        "Nothing auto-resumes. To approve and turn features back on, run:",
        `  ${RESUME_HINT}`,
      ].join("\n")
    );
    return { ok: true, action: "engage", paused: true, reason };
  }

  // Unknown / status: report the current flag without changing anything.
  let paused = false;
  try {
    const out = await ddb.send(new GetCommand({ TableName: CONFIG, Key: { key: FLAG_KEY } }));
    paused = out.Item?.paused === true;
  } catch (err) {
    console.error("breaker status read failed", err);
  }
  return { ok: true, action: "status", paused };
};
