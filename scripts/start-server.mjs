#!/usr/bin/env node
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

// 1. Force network interface binding to 0.0.0.0 and propagate PORT
process.env.HOST = process.env.HOST || "0.0.0.0";
process.env.NITRO_HOST = process.env.NITRO_HOST || "0.0.0.0";

const rawPort = process.env.PORT || process.env.NITRO_PORT || "10000";
const parsedPort = Number.parseInt(rawPort, 10);
const finalPort = Number.isNaN(parsedPort) ? 10000 : parsedPort;

process.env.PORT = String(finalPort);
process.env.NITRO_PORT = String(finalPort);

console.log(`[PromptIQ Server] Initializing production server on ${process.env.HOST}:${finalPort}...`);

// 2. Locate built server entrypoint
const serverEntry = resolve(process.cwd(), ".output/server/index.mjs");
if (!existsSync(serverEntry)) {
  console.error(`[PromptIQ Server] ERROR: Server entry not found at ${serverEntry}. Did you run "npm run build"?`);
  process.exit(1);
}

// 3. Catch any unhandled rejections to prevent silent crashes or hangs
process.on("unhandledRejection", (reason) => {
  console.error("[PromptIQ Server] Unhandled Promise Rejection:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("[PromptIQ Server] Uncaught Exception:", error);
});

// 4. Import and boot the Nitro production server
const entryUrl = pathToFileURL(serverEntry).href;
import(entryUrl)
  .then(() => {
    console.log(`[PromptIQ Server] Ready to accept requests on http://${process.env.HOST}:${finalPort}`);
  })
  .catch((err) => {
    console.error("[PromptIQ Server] Fatal error booting server:", err);
    process.exit(1);
  });
