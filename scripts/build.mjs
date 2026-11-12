#!/usr/bin/env node
import { spawnSync } from "node:child_process";

process.env.NITRO_PRESET = "node-server";

console.log("[PromptIQ Build] Compiling production build with NITRO_PRESET=node-server...");

const isWin = process.platform === "win32";
const result = isWin
  ? spawnSync("cmd.exe", ["/d", "/s", "/c", "npx vite build"], {
      stdio: "inherit",
      env: process.env,
    })
  : spawnSync("npx", ["vite", "build"], {
      stdio: "inherit",
      env: process.env,
    });

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
