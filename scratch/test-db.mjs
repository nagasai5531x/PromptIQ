import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

console.log("CWD:", process.cwd());
const dataDir = path.resolve(process.cwd(), "data");
console.log("dataDir:", dataDir, "exists:", fs.existsSync(dataDir));
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const dbPath = path.join(dataDir, "promptiq.db");
console.log("dbPath:", dbPath);
try {
  const db = new DatabaseSync(dbPath.replace(/\\/g, "/"));
  console.log("Successfully opened db with forward slashes!");
} catch (e) {
  console.error("Forward slash failed:", e.message);
}
try {
  const db = new DatabaseSync(dbPath);
  console.log("Successfully opened db with backslashes!");
} catch (e) {
  console.error("Backslash failed:", e.message);
}
