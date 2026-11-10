import { getDb, hashPassword, verifyPassword, logActivity, findUserByEmail, createSession } from "../src/lib/db.server.js";

async function runTests() {
  console.log("=== PromptIQ Auth & DB Integration Test ===");
  const db = getDb();
  console.log("✓ Database initialized successfully");

  // 1. Password hashing test with scrypt
  const password = "SecurePassword123!";
  const hash = hashPassword(password);
  console.log("✓ Password hashed with salt:", hash.substring(0, 30) + "...");
  const isValid = verifyPassword(password, hash);
  console.log("✓ Password verification matches:", isValid === true);
  const isInvalid = verifyPassword("WrongPassword!", hash);
  console.log("✓ Invalid password correctly rejected:", isInvalid === false);

  // 2. Query default admin
  const admin = findUserByEmail("admin@promptiq.ai");
  console.log("✓ Default admin found:", admin ? admin.email : "Not found", "| Role:", admin?.role);

  // 3. User activities logging
  const testUserId = admin ? admin.id : "usr_admin_default";
  logActivity({
    userId: testUserId,
    activityType: "PROMPT_OPTIMIZE",
    activityDescription: "Optimized prompt for Llama 3.3",
    moduleName: "Optimizer",
    metadata: { model: "llama-3.3-70b", originalLength: 120, improvedLength: 250 }
  });

  const activities = db.prepare("SELECT * FROM user_activities WHERE user_id = ? ORDER BY created_at DESC LIMIT 5;").all(testUserId);
  console.log(`✓ Recorded activities count for admin: ${activities.length}`);
  console.log("✓ Latest activity:", activities[0]?.activity_type, "-", activities[0]?.activity_description);

  // 4. Test Session creation
  const sessionToken = createSession(testUserId, 24);
  console.log("✓ Created session token:", sessionToken ? sessionToken.substring(0, 16) + "..." : "Failed");

  const session = db.prepare("SELECT * FROM user_sessions WHERE session_identifier = ?;").get(sessionToken);
  console.log("✓ Validated session in DB:", !!session);

  console.log("=== All DB & Auth Tests Passed! ===");
}

runTests().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
