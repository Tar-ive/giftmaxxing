# Giftmaxxing API container — the SAME handler.mjs that ran on Lambda, served
# over HTTP by server.mjs for AWS App Runner (no per-account concurrency cap).
#
# IMPORTANT: App Runner runs linux/amd64. On Apple Silicon build with:
#   docker build --platform linux/amd64 -t <ecr-repo>:latest .
FROM node:20-slim

ENV NODE_ENV=production
WORKDIR /app

# Install deps first (layer caching). Unlike the nodejs20.x Lambda runtime, a
# plain Node image does NOT bundle the AWS SDK, so package.json must list ALL
# @aws-sdk packages the handler imports — including client-dynamodb +
# lib-dynamodb, which the Lambda runtime provided for free.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Application code (handler.mjs, server.mjs, quality.mjs, breaker.mjs, reminders.mjs).
COPY *.mjs ./

EXPOSE 8080
CMD ["node", "server.mjs"]
