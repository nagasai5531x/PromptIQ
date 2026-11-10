// Developer API, Key Management & Integrations Server Functions
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import crypto from "node:crypto";
import { getDb, hashApiKey, logActivity } from "./db.server";
import { analyzePrompt, type Category } from "./analyzer";
import { scanPrompt, sanitizeSecrets } from "./security";

export type ApiKeyInfo = {
  id: string;
  name: string;
  prefix: string;
  permissions: string;
  rateLimit: number;
  usageCount: number;
  isActive: boolean;
  createdAt: number;
  lastUsedAt?: number;
};

export type ApiLogEntry = {
  id: string;
  endpoint: string;
  method: string;
  status: number;
  responseTimeMs: number;
  createdAt: number;
};

export type ApiStats = {
  totalRequests: number;
  successRate: number; // 0-100%
  avgLatencyMs: number;
  activeKeysCount: number;
};

// 1. List API Keys for User
export const listApiKeys = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ userId: z.string().default("usr_admin_001") }).parse(d))
  .handler(async ({ data }): Promise<ApiKeyInfo[]> => {
    try {
      const db = getDb();
      const rows = db.prepare("SELECT * FROM api_keys WHERE user_id = ? ORDER BY created_at DESC;").all(data.userId) as any[];
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        prefix: r.key_prefix,
        permissions: r.permissions,
        rateLimit: r.rate_limit,
        usageCount: r.usage_count,
        isActive: Boolean(r.is_active),
        createdAt: r.created_at,
        lastUsedAt: r.last_used_at,
      }));
    } catch {
      return [];
    }
  });

// 2. Generate New API Key
export const generateApiKey = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      name: z.string().min(1),
      userId: z.string().default("usr_admin_001"),
      permissions: z.string().default("read,write"),
    }).parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; rawKey?: string; keyId?: string }> => {
    try {
      const db = getDb();
      const rawSecret = crypto.randomBytes(24).toString("hex");
      const rawKey = `piq_live_${rawSecret}`;
      const prefix = `piq_live_${rawSecret.slice(0, 4)}...`;
      const keyHash = hashApiKey(rawKey);
      const keyId = "key_" + crypto.randomUUID().slice(0, 8);
      const now = Date.now();

      db.prepare(`
        INSERT INTO api_keys (id, user_id, name, key_hash, key_prefix, permissions, rate_limit, usage_count, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 60, 0, 1, ?);
      `).run(keyId, data.userId, data.name, keyHash, prefix, data.permissions, now);

      return { ok: true, rawKey, keyId };
    } catch {
      return { ok: false };
    }
  });

// 3. Revoke API Key
export const revokeApiKey = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ keyId: z.string() }).parse(d))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    try {
      const db = getDb();
      db.prepare("UPDATE api_keys SET is_active = 0 WHERE id = ?;").run(data.keyId);
      return { ok: true };
    } catch {
      return { ok: false };
    }
  });

// 4. API Logs & Usage Stats
export const getApiAnalytics = createServerFn({ method: "GET" }).handler(async (): Promise<{ stats: ApiStats; recentLogs: ApiLogEntry[] }> => {
  try {
    const db = getDb();
    const logs = db.prepare("SELECT * FROM api_logs ORDER BY created_at DESC LIMIT 20;").all() as any[];
    const totalCountStmt = db.prepare("SELECT COUNT(*) as count, AVG(response_time_ms) as avgLatency FROM api_logs;").get() as any;
    const successCountStmt = db.prepare("SELECT COUNT(*) as count FROM api_logs WHERE status < 400;").get() as any;
    const activeKeysStmt = db.prepare("SELECT COUNT(*) as count FROM api_keys WHERE is_active = 1;").get() as any;

    const total = totalCountStmt?.count || 0;
    const success = successCountStmt?.count || 0;
    const successRate = total > 0 ? Math.round((success / total) * 100) : 100;
    const avgLatencyMs = Math.round(totalCountStmt?.avgLatency || 42);

    return {
      stats: {
        totalRequests: total,
        successRate,
        avgLatencyMs,
        activeKeysCount: activeKeysStmt?.count || 0,
      },
      recentLogs: logs.map((l) => ({
        id: l.id,
        endpoint: l.endpoint,
        method: l.method,
        status: l.status,
        responseTimeMs: l.response_time_ms,
        createdAt: l.created_at,
      })),
    };
  } catch {
    return {
      stats: { totalRequests: 0, successRate: 100, avgLatencyMs: 0, activeKeysCount: 0 },
      recentLogs: [],
    };
  }
});

// 5. Interactive API Simulator Endpoint
export const executeSimulatedApiCall = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      endpoint: z.enum(["/api/v1/analyze", "/api/v1/security", "/api/v1/optimize"]),
      payload: z.record(z.any()),
      apiKey: z.string(),
    }).parse(d),
  )
  .handler(async ({ data }): Promise<{ status: number; data: any; latencyMs: number }> => {
    const start = Date.now();
    const db = getDb();

    // Verify key hash or allow demo
    const keyHash = hashApiKey(data.apiKey);
    const keyRecord = db.prepare("SELECT id FROM api_keys WHERE key_hash = ? AND is_active = 1;").get(keyHash) as any;

    const latencyMs = Math.max(18, Date.now() - start);

    if (!keyRecord && !data.apiKey.startsWith("piq_live_")) {
      db.prepare("INSERT INTO api_logs (id, endpoint, method, status, response_time_ms, created_at) VALUES (?, ?, 'POST', 401, ?, ?);").run(
        crypto.randomUUID(),
        data.endpoint,
        latencyMs,
        Date.now(),
      );
      return { status: 401, data: { error: "Unauthorized: Invalid or revoked API key" }, latencyMs };
    }

    let responseData: any = {};
    if (data.endpoint === "/api/v1/analyze") {
      const prompt = String(data.payload["prompt"] || "");
      const cat = (data.payload["category"] || "General") as Category;
      responseData = analyzePrompt(prompt, cat);
    } else if (data.endpoint === "/api/v1/security") {
      const prompt = String(data.payload["prompt"] || "");
      responseData = scanPrompt(prompt);
    } else if (data.endpoint === "/api/v1/optimize") {
      const prompt = String(data.payload["prompt"] || "");
      const { sanitized } = sanitizeSecrets(prompt);
      responseData = {
        originalPrompt: prompt,
        optimizedPrompt: `Act as a senior specialist. ${sanitized}\n\nConstraints: Provide output with structured formatting, clear headings, and actionable recommendations.`,
        improvements: ["Added role directive", "Established negative constraints", "Defined Markdown output schema"],
      };
    }

    // Update key usage and log
    if (keyRecord) {
      db.prepare("UPDATE api_keys SET usage_count = usage_count + 1, last_used_at = ? WHERE id = ?;").run(Date.now(), keyRecord.id);
    }
    db.prepare("INSERT INTO api_logs (id, endpoint, method, status, response_time_ms, created_at) VALUES (?, ?, 'POST', 200, ?, ?);").run(
      crypto.randomUUID(),
      data.endpoint,
      latencyMs,
      Date.now(),
    );

    logActivity({
      userId: keyRecord?.user_id || "usr_admin_001",
      activityType: "API_CALL_EXECUTE",
      activityDescription: `Developer API invocation on ${data.endpoint} (200 OK)`,
      moduleName: "Developer API",
      metadata: { endpoint: data.endpoint, latencyMs },
    });

    return { status: 200, data: responseData, latencyMs };
  });
