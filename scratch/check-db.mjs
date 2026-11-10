import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const dataDir = path.resolve(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new DatabaseSync(path.join(dataDir, "promptiq.db"));
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table';").all();
console.log("Tables:", tables.map((t) => t.name));
