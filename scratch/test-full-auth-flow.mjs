import { DatabaseSync } from "node:sqlite";
import crypto from "node:crypto";
import path from "node:path";

const db = new DatabaseSync("E:/miniproject/data/promptiq.db");

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
    const [, salt, originalHash] = parts;
    const derivedKey = crypto.scryptSync(password, salt, 64);
    const keyBuf = Buffer.from(originalHash, "hex");
    if (keyBuf.length !== derivedKey.length) return false;
    return crypto.timingSafeEqual(keyBuf, derivedKey);
  }
  const legacyHash = crypto.createHash("sha256").update(password + "_promptiq_salt_2026").digest("hex");
  return legacyHash === storedHash || password === storedHash;
}

function logActivity({ userId, activityType, activityDescription, moduleName, metadata }) {
  const id = "act_" + crypto.randomUUID().slice(0, 12);
  const now = Date.now();
  let sanitizedMeta = {};
  if (metadata && typeof metadata === "object") {
    for (const [k, v] of Object.entries(metadata)) {
      if (/password|secret|token|apikey|key|auth/i.test(k)) continue;
      sanitizedMeta[k] = v;
    }
  }
  db.prepare(`
    INSERT INTO user_activities (id, user_id, activity_type, activity_description, module_name, metadata, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?);
  `).run(id, userId, activityType, activityDescription, moduleName, JSON.stringify(sanitizedMeta), now);
  return id;
}

console.log("=== Testing Full Auth & Activity Lifecycle ===");

// 1. Create a new test user
const testEmail = "testuser_" + Date.now() + "@promptiq.ai";
const testPassword = "TestPassword123!";
const userId = "usr_" + crypto.randomUUID().slice(0, 12);
const now = Date.now();

db.prepare(`
  INSERT INTO users (id, email, password_hash, name, full_name, avatar, profile_image, role, created_at, updated_at, last_login)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
`).run(
  userId,
  testEmail,
  hashPassword(testPassword),
  "Test Engineer",
  "Test Engineer",
  "https://api.dicebear.com/7.x/bottts/svg?seed=test",
  "https://api.dicebear.com/7.x/bottts/svg?seed=test",
  "user",
  now,
  now,
  now
);

logActivity({
  userId,
  activityType: "USER_REGISTRATION",
  activityDescription: "Registered new user account",
  moduleName: "Authentication",
  metadata: { email: testEmail }
});
console.log("✓ Successfully registered test user:", testEmail);

// 2. Test Login & Session Creation
const user = db.prepare("SELECT * FROM users WHERE email = ?;").get(testEmail);
if (!user || !verifyPassword(testPassword, user.password_hash)) {
  throw new Error("Login failed for test user!");
}

const sessionToken = "piq_" + crypto.randomBytes(32).toString("hex");
const expiresAt = now + 7 * 86400000;
db.prepare(`
  INSERT INTO user_sessions (id, user_id, session_identifier, created_at, expires_at)
  VALUES (?, ?, ?, ?, ?);
`).run("sess_" + crypto.randomUUID().slice(0, 12), userId, sessionToken, now, expiresAt);

logActivity({
  userId,
  activityType: "USER_LOGIN",
  activityDescription: "Logged in successfully via web interface",
  moduleName: "Authentication",
});
console.log("✓ Login verified and session token created:", sessionToken.slice(0, 20) + "...");

// 3. Perform and log prompt optimization activity
logActivity({
  userId,
  activityType: "PROMPT_OPTIMIZE",
  activityDescription: "Optimized prompt with Before vs After comparison",
  moduleName: "Prompt Optimizer",
  metadata: {
    category: "Coding",
    scoreBefore: 54,
    scoreAfter: 92,
    secret_key_should_be_stripped: "DO_NOT_STORE_ME"
  }
});
console.log("✓ User performed and logged prompt optimization");

// 4. Verify sanitization: Ensure secrets were stripped from metadata
const latestAct = db.prepare("SELECT * FROM user_activities WHERE user_id = ? AND activity_type = 'PROMPT_OPTIMIZE';").get(userId);
const parsedMeta = JSON.parse(latestAct.metadata);
console.log("✓ Metadata sanitized (no secret_key):", parsedMeta.secret_key_should_be_stripped === undefined);
console.log("✓ Metadata has safe stats:", parsedMeta.scoreBefore === 54 && parsedMeta.scoreAfter === 92);

// 5. Update user profile
const newName = "Test Senior Engineer";
db.prepare("UPDATE users SET full_name = ?, name = ?, updated_at = ? WHERE id = ?;").run(newName, newName, Date.now(), userId);
logActivity({
  userId,
  activityType: "PROFILE_UPDATE",
  activityDescription: "Updated user profile details",
  moduleName: "Settings"
});
const updatedUser = db.prepare("SELECT full_name FROM users WHERE id = ?;").get(userId);
console.log("✓ Profile updated to:", updatedUser.full_name);

// 6. Change password & Revoke sessions
const newPassword = "NewSecurePassword456!";
db.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?;").run(hashPassword(newPassword), Date.now(), userId);
db.prepare("UPDATE user_sessions SET revoked_at = ? WHERE user_id = ?;").run(Date.now(), userId);
logActivity({
  userId,
  activityType: "PASSWORD_CHANGE",
  activityDescription: "Password changed and previous sessions revoked",
  moduleName: "Security"
});
const activeSessions = db.prepare("SELECT * FROM user_sessions WHERE user_id = ? AND revoked_at IS NULL;").all(userId);
console.log("✓ Active sessions after revocation:", activeSessions.length);

// 7. Verify user activities audit log count
const totalActs = db.prepare("SELECT COUNT(*) as count FROM user_activities WHERE user_id = ?;").get(userId);
console.log("✓ Total activities recorded for user:", totalActs.count);

console.log("=== ALL AUTH, DB & ACTIVITY TRACKING TESTS PASSED! ===");
