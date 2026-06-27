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

// How long an alarm-induced "degraded" window lasts before it auto-resumes. The
// alarm CLEARING resumes it sooner; this is the backstop the API handler also
// honors on read (so recovery needs no further event — no 3 AM page).
const AUTORESUME_MIN = Math.max(1, Number(process.env.DEGRADE_AUTORESUME_MIN || 30));

// Current tier from the flag item (back-compat: legacy { paused:true } -> "paused").
async function getCurrentLevel() {
  try {
    const out = await ddb.send(new GetCommand({ TableName: CONFIG, Key: { key: FLAG_KEY } }));
    const it = out.Item || {};
    if (["active", "degraded", "paused"].includes(it.level)) return it.level;
    return it.paused === true ? "paused" : "active";
  } catch (err) {
    console.error("breaker getCurrentLevel failed", err);
    return "active";
  }
}

// Write the tier. Keeps a back-compat `paused` boolean. Sets `autoResumeAt` only
// for a degraded window (the handler's read-side backstop self-heals from it) and
// clears it otherwise. ExpressionAttributeNames dodge reserved-word clashes.
async function setLevel(level, reason, autoResumeAt) {
  const now = Date.now();
  const names = {
    "#level": "level",
    "#paused": "paused",
    "#reason": "reason",
    "#since": "since",
    "#updatedAt": "updatedAt",
    "#autoResumeAt": "autoResumeAt",
  };
  const values = {
    ":level": level,
    ":paused": level === "paused",
    ":reason": reason ?? null,
    ":now": now,
  };
  let expr = "SET #level = :level, #paused = :paused, #reason = :reason, #since = :now, #updatedAt = :now";
  if (autoResumeAt) {
    values[":ar"] = autoResumeAt;
    expr += ", #autoResumeAt = :ar";
  } else {
    expr += " REMOVE #autoResumeAt";
  }
  await ddb.send(
    new UpdateCommand({
      TableName: CONFIG,
      Key: { key: FLAG_KEY },
      UpdateExpression: expr,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
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

// Decide what to do from the trigger (Phase 3 tiered breaker):
//   • CloudWatch alarm ALARM transition (JSON msg w/ AlarmName) -> "degrade"
//     (transient real-time spike: shed cost, then auto-resume).
//   • CloudWatch alarm OK transition -> "auto_resume" (the spike cleared).
//   • Budget notification (non-alarm SNS) -> "pause" (hard cost cap, human resume).
//   • Manual direct invoke { action, reason } -> that action.
function classifyTrigger(event) {
  if (!Array.isArray(event?.Records) || !event.Records.some((r) => r.Sns)) {
    return { action: event?.action || "status", reason: event?.reason || "manual" };
  }
  const rec = event.Records.find((r) => r.Sns);
  const subject = rec.Sns.Subject || "";
  let msg = {};
  try { msg = JSON.parse(rec.Sns.Message); } catch { /* budget notifications aren't JSON */ }
  if (msg && msg.AlarmName && msg.NewStateValue) {
    if (msg.NewStateValue === "OK") {
      return { action: "auto_resume", reason: `${msg.AlarmName} cleared`, alarmName: msg.AlarmName };
    }
    if (msg.NewStateValue === "ALARM") {
      return {
        action: "degrade",
        reason: `${msg.AlarmName}: ${msg.NewStateReason || ""}`.trim().slice(0, 240),
        alarmName: msg.AlarmName,
      };
    }
    return { action: "status", reason: msg.AlarmName };
  }
  // Non-alarm SNS = the monthly budget LIMIT notification -> hard pause.
  return { action: "pause", reason: subject || String(rec.Sns.Message || "").slice(0, 240) || "budget limit" };
}

export const handler = async (event) => {
  const { action, reason } = classifyTrigger(event);

  if (action === "resume") {
    await setLevel("active", "manual resume");
    await notify(
      "Giftmaxxing — features RESUMED",
      "Manually resumed. All features (visual search, vector recommendations, /pins, Maxi) are live again at full quality."
    );
    return { ok: true, action, level: "active" };
  }

  if (action === "auto_resume") {
    // Only an alarm-induced DEGRADED window auto-resumes. Never silently un-pause a
    // hard budget pause — that needs a human plus a real fix / quota bump.
    const cur = await getCurrentLevel();
    if (cur !== "degraded") return { ok: true, action, level: cur, skipped: "not degraded" };
    await setLevel("active", reason);
    await notify(
      "Giftmaxxing — auto-resumed (alarm cleared)",
      `The real-time spike cleared (${reason}). Reduced features are back to full quality automatically — no action needed.`
    );
    return { ok: true, action, level: "active", from: cur };
  }

  if (action === "degrade") {
    // A hard budget pause outranks a transient alarm — don't soften it.
    const cur = await getCurrentLevel();
    if (cur === "paused") return { ok: true, action, level: "paused", skipped: "already paused" };
    const autoResumeAt = Date.now() + AUTORESUME_MIN * 60000;
    await setLevel("degraded", reason, autoResumeAt);
    await notify(
      "Giftmaxxing — DEGRADED (real-time cost spike)",
      [
        `Real-time tripwire fired: ${reason}`,
        "",
        "To shed cost WITHOUT an outage, non-essential AI is temporarily reduced:",
        "  - Visual search + vector recommendations + /pins: paused",
        "  - Maxi: cheap base model only, shorter tool loop (still answering)",
        "",
        "Essential stays at full quality: auth, feed/posts, data collection.",
        "",
        `Auto-resumes when the alarm clears, or by ${new Date(autoResumeAt).toISOString()} at the latest. No action needed.`,
      ].join("\n")
    );
    return { ok: true, action, level: "degraded", autoResumeAt };
  }

  if (action === "pause" || action === "engage") {
    await setLevel("paused", reason);
    await notify(
      "Giftmaxxing — COST KILL SWITCH ENGAGED (hard pause)",
      [
        `Hard cost cap hit: ${reason}`,
        "",
        "Non-essential, cost-driving features are now PAUSED:",
        "  - Visual search (Bedrock Titan)",
        "  - Vector recommendations + /pins (S3 Vectors)",
        "  - Maxi agent (Bedrock)",
        "",
        "Still serving (essential): auth, feed/posts, and data collection.",
        "",
        "This does NOT auto-resume. To approve and turn features back on, run:",
        `  ${RESUME_HINT}`,
      ].join("\n")
    );
    return { ok: true, action: "pause", level: "paused", reason };
  }

  // Unknown / status: report the current tier without changing anything.
  const level = await getCurrentLevel();
  return { ok: true, action: "status", level, paused: level === "paused" };
};
