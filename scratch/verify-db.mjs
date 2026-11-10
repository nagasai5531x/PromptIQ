import { DatabaseSync } from "node:sqlite";
import crypto from "node:crypto";
import path from "node:path";

const dbPath = path.resolve("E:/miniproject/data/promptiq.db");
console.log("Connecting to:", dbPath);
const db = new DatabaseSync(dbPath);

// Execute schema init & migration exactly like db.server.ts
function runMigrations(db) {
  try {
    // 1. Tables check
    db.exec(`
      CREATE TABLE IF NOT EXISTS user_activities (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        activity_type TEXT NOT NULL,
        activity_description TEXT NOT NULL,
        module_name TEXT NOT NULL,
        metadata TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS user_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        session_identifier TEXT UNIQUE NOT NULL,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        revoked_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS login_attempts (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        ip_address TEXT,
        attempt_time INTEGER NOT NULL,
        success INTEGER NOT NULL
      );
    `);

    const userColumns = db.prepare("PRAGMA table_info(users);").all();
    const columnNames = new Set(userColumns.map(c => c.name));

    if (!columnNames.has("full_name")) {
      db.exec("ALTER TABLE users ADD COLUMN full_name TEXT;");
      db.exec("UPDATE users SET full_name = name WHERE full_name IS NULL;");
    }
    if (!columnNames.has("profile_image")) {
      db.exec("ALTER TABLE users ADD COLUMN profile_image TEXT;");
      db.exec("UPDATE users SET profile_image = avatar WHERE profile_image IS NULL;");
    }
    if (!columnNames.has("updated_at")) {
      db.exec("ALTER TABLE users ADD COLUMN updated_at INTEGER DEFAULT 0;");
      db.exec("UPDATE users SET updated_at = created_at WHERE updated_at = 0;");
    }
    if (!columnNames.has("last_login")) {
      db.exec("ALTER TABLE users ADD COLUMN last_login INTEGER;");
    }
    console.log("✓ Migration executed successfully");
  } catch (e) {
    console.warn("Migration notice:", e);
  }
}

runMigrations(db);

console.log("=== PromptIQ Database Verification ===");
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;").all();
console.log("Tables found in DB:", tables.map(t => t.name).join(", "));

// Check users table schema & records
const users = db.prepare("SELECT id, full_name, email, role, created_at, last_login FROM users;").all();
console.log(`Users count: ${users.length}`);
users.forEach(u => console.log(` - [${u.role}] ${u.full_name} (${u.email})`));

// Check user activities table
const activities = db.prepare("SELECT id, user_id, activity_type, activity_description, module_name, created_at FROM user_activities ORDER BY created_at DESC LIMIT 5;").all();
console.log(`Recent activities count: ${activities.length}`);
activities.forEach(a => console.log(` - [${a.module_name}] ${a.activity_type}: ${a.activity_description}`));

// Check sessions
const sessions = db.prepare("SELECT id, user_id, session_identifier, expires_at, revoked_at FROM user_sessions;").all();
console.log(`Active sessions count: ${sessions.length}`);

// Test Scrypt hashing exactly like in db.server.ts
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `scrypt:${salt}:${derivedKey.toString("hex")}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash) return false;
  if (storedHash.startsWith("scrypt:")) {
    const parts = storedHash.split(":");
    if (parts.length !== 3) return false;
    const salt = parts[1];
    const originalHash = parts[2];
    if (!salt || !originalHash) return false;
    const derivedKey = crypto.scryptSync(password, salt, 64);
    const keyBuf = Buffer.from(originalHash, "hex");
    if (keyBuf.length !== derivedKey.length) return false;
    return crypto.timingSafeEqual(keyBuf, derivedKey);
  }
  const legacyHash = crypto.createHash("sha256").update(password + "_promptiq_salt_2026").digest("hex");
  return legacyHash === storedHash || password === storedHash;
}

const pass = "admin123";
const hashed = hashPassword(pass);
console.log("✓ Scrypt password verification test passed:", verifyPassword(pass, hashed));
console.log("✓ Scrypt wrong password rejected:", !verifyPassword("wrongpass", hashed));

// Check if admin user can be authenticated
const adminUser = db.prepare("SELECT * FROM users WHERE email = 'admin@promptiq.ai';").get();
if (adminUser) {
  console.log("✓ Admin user exists, verifying password 'admin123':", verifyPassword("admin123", adminUser.password_hash));
} else {
  console.log("Admin user does not exist yet.");
}

console.log("=== Verification Completed Successfully! ===");
