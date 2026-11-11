// Server-side SQLite Database using Node 24 native node:sqlite.
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

let dbInstance: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (dbInstance) return dbInstance;

  let dbPath = ":memory:";
  try {
    const dataDir = path.resolve(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    dbPath = path.join(dataDir, "promptiq.db");
  } catch (err) {
    console.warn("Could not create project data directory, attempting /tmp fallback:", err);
    try {
      const tmpDir = path.resolve("/tmp", "promptiq-data");
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
      dbPath = path.join(tmpDir, "promptiq.db");
    } catch (tmpErr) {
      console.warn("Could not create /tmp fallback, defaulting to :memory: SQLite:", tmpErr);
      dbPath = ":memory:";
    }
  }

  const db = new DatabaseSync(dbPath);
  try {
    db.exec("PRAGMA journal_mode = WAL;");
    db.exec("PRAGMA foreign_keys = ON;");
  } catch (pragmaErr) {
    console.warn("Pragma setup warning:", pragmaErr);
  }

  initSchema(db);
  runMigrations(db);
  seedInitialData(db);

  dbInstance = db;
  return db;
}

function initSchema(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      full_name TEXT NOT NULL,
      avatar TEXT,
      profile_image TEXT,
      role TEXT DEFAULT 'user',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      last_login INTEGER
    );

    CREATE TABLE IF NOT EXISTS user_activities (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      activity_type TEXT NOT NULL,
      activity_description TEXT NOT NULL,
      module_name TEXT NOT NULL,
      metadata TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_user_activities_user ON user_activities(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_user_activities_type ON user_activities(activity_type);
    CREATE INDEX IF NOT EXISTS idx_user_activities_module ON user_activities(module_name);

    CREATE TABLE IF NOT EXISTS user_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      session_identifier TEXT UNIQUE NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      revoked_at INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_identifier);
    CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);

    CREATE TABLE IF NOT EXISTS login_attempts (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      ip_address TEXT,
      attempt_time INTEGER NOT NULL,
      success INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email, attempt_time DESC);

    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS team_members (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT DEFAULT 'viewer',
      joined_at INTEGER NOT NULL,
      UNIQUE(team_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS team_prompts (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL,
      author_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      title TEXT NOT NULL,
      prompt TEXT NOT NULL,
      category TEXT NOT NULL,
      score INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS prompt_comments (
      id TEXT PRIMARY KEY,
      prompt_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      comment TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS team_activity (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      key_hash TEXT NOT NULL,
      key_prefix TEXT NOT NULL,
      permissions TEXT DEFAULT 'read,write',
      rate_limit INTEGER DEFAULT 60,
      usage_count INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at INTEGER NOT NULL,
      last_used_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS api_logs (
      id TEXT PRIMARY KEY,
      api_key_id TEXT,
      endpoint TEXT NOT NULL,
      method TEXT NOT NULL,
      status INTEGER NOT NULL,
      response_time_ms INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS marketplace_prompts (
      id TEXT PRIMARY KEY,
      author_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      prompt TEXT NOT NULL,
      category TEXT NOT NULL,
      tags TEXT,
      score INTEGER DEFAULT 0,
      rating_avg REAL DEFAULT 5.0,
      rating_count INTEGER DEFAULT 1,
      saves_count INTEGER DEFAULT 0,
      is_featured INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS marketplace_reviews (
      id TEXT PRIMARY KEY,
      prompt_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      rating INTEGER NOT NULL,
      review TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS marketplace_reports (
      id TEXT PRIMARY KEY,
      prompt_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      details TEXT,
      status TEXT DEFAULT 'pending',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workflows (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      team_id TEXT,
      name TEXT NOT NULL,
      description TEXT,
      nodes_json TEXT NOT NULL,
      edges_json TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS evaluations (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      prompt TEXT NOT NULL,
      test_cases_json TEXT NOT NULL,
      results_json TEXT NOT NULL,
      overall_score INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS multilingual_prompts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      original_prompt TEXT NOT NULL,
      detected_language TEXT NOT NULL,
      writing_style TEXT NOT NULL,
      confidence INTEGER NOT NULL,
      output_language TEXT NOT NULL,
      improved_prompt TEXT,
      transliterated_prompt TEXT,
      scores_json TEXT,
      overall_score INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_ml_prompts_user ON multilingual_prompts(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_ml_prompts_lang ON multilingual_prompts(detected_language);
    CREATE INDEX IF NOT EXISTS idx_ml_prompts_style ON multilingual_prompts(writing_style);
  `);
}

function runMigrations(db: DatabaseSync) {
  try {
    const userColumns = db.prepare("PRAGMA table_info(users);").all() as { name: string }[];
    const columnNames = new Set(userColumns.map((c) => c.name));

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
  } catch (e) {
    console.warn("Migration notice:", e);
  }
}

// Memory-hard scrypt salt password hashing (cryptographically secure, no plaintext)
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `scrypt:${salt}:${derivedKey.toString("hex")}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
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
  // Fallback for legacy sha256 seeded users
  const legacyHash = crypto.createHash("sha256").update(password + "_promptiq_salt_2026").digest("hex");
  return legacyHash === storedHash || password === storedHash;
}

export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

// Reusable activity logging service across all modules
export function logActivity(params: {
  userId: string;
  activityType: string;
  activityDescription: string;
  moduleName: string;
  metadata?: Record<string, any> | undefined;
}): void {
  try {
    const db = getDb();
    const id = "act_" + crypto.randomUUID().slice(0, 12);
    const now = Date.now();

    // Sanitize metadata to never store passwords, tokens, API keys, or sensitive prompt secrets
    let sanitizedMeta: Record<string, any> = {};
    if (params.metadata && typeof params.metadata === "object") {
      for (const [k, v] of Object.entries(params.metadata)) {
        if (/password|secret|token|apikey|key|auth|bearer|credential/i.test(k)) {
          sanitizedMeta[k] = "[REDACTED]";
        } else if (typeof v === "string" && v.length > 250) {
          sanitizedMeta[k] = v.slice(0, 250) + "...";
        } else {
          sanitizedMeta[k] = v;
        }
      }
    }

    db.prepare(`
      INSERT INTO user_activities (id, user_id, activity_type, activity_description, module_name, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?);
    `).run(
      id,
      params.userId,
      params.activityType,
      params.activityDescription,
      params.moduleName,
      JSON.stringify(sanitizedMeta),
      now,
    );
  } catch (err) {
    console.error("Failed to log activity:", err);
  }
}

function seedInitialData(db: DatabaseSync) {
  const userCountStmt = db.prepare("SELECT COUNT(*) as count FROM users;");
  const result = userCountStmt.get() as { count: number };
  if (result.count > 0) return;

  const now = Date.now();
  const adminId = "usr_admin_001";
  const alexId = "usr_alex_002";
  const teamId = "team_core_001";

  // 1. Seed Users (Admin Director and Member)
  const insertUser = db.prepare(`
    INSERT INTO users (id, email, password_hash, name, full_name, avatar, profile_image, role, created_at, updated_at, last_login)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `);
  insertUser.run(
    adminId,
    "admin@promptiq.ai",
    hashPassword("admin123"),
    "Admin Director",
    "Admin Director",
    "https://api.dicebear.com/7.x/bottts/svg?seed=admin",
    "https://api.dicebear.com/7.x/bottts/svg?seed=admin",
    "admin",
    now - 14 * 86400000,
    now,
    now,
  );
  insertUser.run(
    alexId,
    "alex@promptiq.ai",
    hashPassword("alex123"),
    "Alex Chen",
    "Alex Chen",
    "https://api.dicebear.com/7.x/bottts/svg?seed=alex",
    "https://api.dicebear.com/7.x/bottts/svg?seed=alex",
    "editor",
    now - 7 * 86400000,
    now,
    now - 3600000,
  );

  // 2. Seed Initial User Activities
  logActivity({
    userId: adminId,
    activityType: "USER_REGISTRATION",
    activityDescription: "System initialized with Admin Director account",
    moduleName: "Authentication",
    metadata: { role: "admin" },
  });
  logActivity({
    userId: adminId,
    activityType: "PROMPT_ANALYSIS",
    activityDescription: "Analyzed senior code review prompt",
    moduleName: "Quality Checker",
    metadata: { category: "Coding", score: 92 },
  });
  logActivity({
    userId: adminId,
    activityType: "SECURITY_SCAN",
    activityDescription: "Defensive scan against instruction injection",
    moduleName: "Attack Simulator",
    metadata: { threatLevel: "Safe", score: 95 },
  });

  // 3. Seed Team & Members
  db.prepare(`
    INSERT INTO teams (id, name, owner_id, created_at)
    VALUES (?, ?, ?, ?);
  `).run(teamId, "AI Core Engineering", adminId, now - 14 * 86400000);

  const insertMember = db.prepare(`
    INSERT INTO team_members (id, team_id, user_id, role, joined_at)
    VALUES (?, ?, ?, ?, ?);
  `);
  insertMember.run("mem_001", teamId, adminId, "admin", now - 14 * 86400000);
  insertMember.run("mem_002", teamId, alexId, "editor", now - 7 * 86400000);

  // 4. Seed Team Prompts
  const insertPrompt = db.prepare(`
    INSERT INTO team_prompts (id, team_id, author_id, author_name, title, prompt, category, score, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `);
  insertPrompt.run(
    "tpr_001",
    teamId,
    adminId,
    "Admin Director",
    "Production PostgreSQL Query Optimizer",
    "Act as a principal PostgreSQL database administrator. Review the following SQL query and execution plan. Suggest index additions, analyze table scan risks, and provide an optimized rewriting.\n\nFormatting: Use markdown tables for query plan analysis and code blocks for SQL.",
    "Engineering",
    94,
    now - 5 * 86400000,
    now - 5 * 86400000,
  );

  // 5. Seed API Keys
  db.prepare(`
    INSERT INTO api_keys (id, user_id, name, key_hash, key_prefix, permissions, rate_limit, usage_count, is_active, created_at, last_used_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `).run(
    "key_prod_001",
    adminId,
    "Production API Server",
    hashApiKey("piq_live_seeded_prod_key_9981"),
    "piq_live_seed...",
    "read,write",
    120,
    284,
    1,
    now - 10 * 86400000,
    now - 60000,
  );

  // 6. Seed Marketplace Prompts
  const insertMarketplace = db.prepare(`
    INSERT INTO marketplace_prompts (id, author_id, author_name, title, description, prompt, category, tags, score, rating_avg, rating_count, saves_count, is_featured, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `);
  insertMarketplace.run(
    "mp_001",
    adminId,
    "Admin Director",
    "TypeScript Strict Clean Code Reviewer",
    "Detailed code review agent enforcing zero any types, immutability, and single responsibility principles.",
    "Act as a principal TypeScript architect. Conduct an exhaustive code review of the submitted source code. Flag: 1) Any usage of 'any' or untyped casts, 2) Mutation of incoming arguments, 3) Missing error boundary handling, 4) Performance bottlenecks.\n\nConstraints: Provide code diffs with explanations.",
    "Coding",
    "typescript,clean-code,refactor",
    96,
    4.9,
    18,
    42,
    1,
    now - 12 * 86400000,
  );

  // 7. Seed Workflows
  db.prepare(`
    INSERT INTO workflows (id, user_id, team_id, name, description, nodes_json, edges_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
  `).run(
    "wf_default",
    adminId,
    teamId,
    "Enterprise Prompt Optimization Pipeline",
    "Linear multi-stage pipeline: Input -> Optimizer -> Security Guardrail -> AI Model -> Production Response",
    JSON.stringify([
      { id: "node_1", type: "input_prompt", label: "Input Prompt", position: { x: 50, y: 50 }, data: { prompt: "Explain quantum computing in simple terms for high school students." } },
      { id: "node_2", type: "optimizer", label: "Prompt Optimizer", position: { x: 50, y: 150 }, data: {} },
      { id: "node_3", type: "security_checker", label: "Security Guardrail", position: { x: 50, y: 250 }, data: {} },
      { id: "node_4", type: "ai_model", label: "AI Model (Groq Llama 3.3 70B)", position: { x: 50, y: 350 }, data: { model: "llama-3.3-70b-versatile" } },
      { id: "node_5", type: "final_response", label: "Production Response", position: { x: 50, y: 450 }, data: {} },
    ]),
    JSON.stringify([
      { id: "e1", source: "node_1", target: "node_2" },
      { id: "e2", source: "node_2", target: "node_3" },
      { id: "e3", source: "node_3", target: "node_4" },
      { id: "e4", source: "node_4", target: "node_5" },
    ]),
    now - 3 * 86400000,
    now - 3 * 86400000,
  );
}

export interface MultilingualPromptRecord {
  id?: string;
  userId: string;
  originalPrompt: string;
  detectedLanguage: string;
  writingStyle: string;
  confidence: number;
  outputLanguage: string;
  improvedPrompt?: string | undefined;
  transliteratedPrompt?: string | undefined;
  scoresJson?: string | undefined;
  overallScore?: number | undefined;
  createdAt?: number | undefined;
}

export function saveMultilingualPromptRecord(record: MultilingualPromptRecord): string {
  const db = getDb();
  const id = record.id || `mlp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now = record.createdAt || Date.now();

  db.prepare(`
    INSERT INTO multilingual_prompts (
      id, user_id, original_prompt, detected_language, writing_style, confidence,
      output_language, improved_prompt, transliterated_prompt, scores_json, overall_score, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `).run(
    id,
    record.userId,
    record.originalPrompt,
    record.detectedLanguage,
    record.writingStyle,
    record.confidence,
    record.outputLanguage,
    record.improvedPrompt || null,
    record.transliteratedPrompt || null,
    record.scoresJson || null,
    record.overallScore || 0,
    now,
  );

  return id;
}

export function getMultilingualDashboardStats(userId?: string) {
  const db = getDb();

  let userClause = "";
  const params: any[] = [];
  if (userId) {
    userClause = "WHERE user_id = ?";
    params.push(userId);
  }

  const totalRow = db.prepare(`SELECT COUNT(*) as count FROM multilingual_prompts ${userClause};`).get(...params) as { count: number } | undefined;
  const total = totalRow ? Number(totalRow.count) : 0;

  const languages = db.prepare(`
    SELECT detected_language, COUNT(*) as count, AVG(overall_score) as avg_score
    FROM multilingual_prompts ${userClause}
    GROUP BY detected_language
    ORDER BY count DESC
    LIMIT 6;
  `).all(...params) as { detected_language: string; count: number | bigint; avg_score: number | null }[];

  const styles = db.prepare(`
    SELECT writing_style, COUNT(*) as count
    FROM multilingual_prompts ${userClause}
    GROUP BY writing_style;
  `).all(...params) as { writing_style: string; count: number | bigint }[];

  const recent = db.prepare(`
    SELECT id, original_prompt, detected_language, writing_style, confidence, output_language, overall_score, created_at
    FROM multilingual_prompts ${userClause}
    ORDER BY created_at DESC
    LIMIT 6;
  `).all(...params) as any[];

  const styleBreakdown = {
    native_script: 0,
    romanized: 0,
    english: 0,
    mixed: 0,
  };

  for (const s of styles) {
    const key = s.writing_style as keyof typeof styleBreakdown;
    if (key in styleBreakdown) {
      styleBreakdown[key] = Number(s.count);
    }
  }

  return {
    total,
    topLanguages: languages.map((l) => ({
      language: l.detected_language,
      count: Number(l.count),
      avgScore: Math.round(Number(l.avg_score || 0)),
    })),
    styleBreakdown,
    recentPrompts: recent,
  };
}
