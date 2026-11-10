// Prompt Marketplace Server Functions
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import crypto from "node:crypto";
import { getDb, logActivity } from "./db.server";
import { analyzePrompt, type Category } from "./analyzer";

export type MarketplacePrompt = {
  id: string;
  authorId: string;
  authorName: string;
  title: string;
  description: string;
  prompt: string;
  category: string;
  tags: string[];
  score: number;
  ratingAvg: number;
  ratingCount: number;
  savesCount: number;
  isFeatured: boolean;
  createdAt: number;
};

export type MarketplaceReview = {
  id: string;
  promptId: string;
  userId: string;
  userName: string;
  rating: number;
  review: string;
  createdAt: number;
};

// 1. Get Marketplace Prompts with search, category & sort
export const getMarketplacePrompts = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      category: z.string().default("All"),
      search: z.string().default(""),
      sort: z.enum(["trending", "top_rated", "newest"]).default("trending"),
    }).parse(d),
  )
  .handler(async ({ data }): Promise<MarketplacePrompt[]> => {
    try {
      const db = getDb();
      let query = "SELECT * FROM marketplace_prompts WHERE 1=1";
      const params: any[] = [];

      if (data.category !== "All") {
        query += " AND category = ?";
        params.push(data.category);
      }
      if (data.search.trim()) {
        query += " AND (title LIKE ? OR description LIKE ? OR tags LIKE ?)";
        const term = `%${data.search.trim()}%`;
        params.push(term, term, term);
      }

      if (data.sort === "top_rated") {
        query += " ORDER BY rating_avg DESC, rating_count DESC";
      } else if (data.sort === "newest") {
        query += " ORDER BY created_at DESC";
      } else {
        query += " ORDER BY is_featured DESC, (saves_count * 2 + rating_count) DESC, rating_avg DESC";
      }

      const rows = db.prepare(query).all(...params) as any[];
      return rows.map((r) => ({
        id: r.id,
        authorId: r.author_id,
        authorName: r.author_name,
        title: r.title,
        description: r.description,
        prompt: r.prompt,
        category: r.category,
        tags: r.tags ? r.tags.split(",") : [],
        score: r.score,
        ratingAvg: Number(r.rating_avg.toFixed(1)),
        ratingCount: r.rating_count,
        savesCount: r.saves_count,
        isFeatured: Boolean(r.is_featured),
        createdAt: r.created_at,
      }));
    } catch {
      return [];
    }
  });

// 2. Publish Prompt to Marketplace
export const publishMarketplacePrompt = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      title: z.string().min(3).max(100),
      description: z.string().min(10).max(500),
      prompt: z.string().min(10).max(8000),
      category: z.string(),
      tags: z.string().default(""),
      authorId: z.string().default("usr_admin_001"),
      authorName: z.string().default("Prompt Engineer"),
    }).parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; promptId?: string; message?: string }> => {
    try {
      const db = getDb();
      const promptId = "mkt_" + crypto.randomUUID().slice(0, 8);
      const now = Date.now();
      const score = analyzePrompt(data.prompt, (data.category as Category) || "General").total;

      db.prepare(`
        INSERT INTO marketplace_prompts (id, author_id, author_name, title, description, prompt, category, tags, score, rating_avg, rating_count, saves_count, is_featured, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 5.0, 1, 0, 0, ?);
      `).run(promptId, data.authorId, data.authorName, data.title, data.description, data.prompt, data.category, data.tags, score, now);

      logActivity({
        userId: data.authorId || "usr_admin_001",
        activityType: "MARKETPLACE_PUBLISH",
        activityDescription: `Published prompt to Marketplace: "${data.title}"`,
        moduleName: "Prompt Marketplace",
        metadata: { promptId, title: data.title, category: data.category, score },
      });

      return { ok: true, promptId };
    } catch (err: any) {
      return { ok: false, message: err.message };
    }
  });

// 3. Rate and Review Prompt
export const submitPromptReview = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      promptId: z.string(),
      userId: z.string().default("usr_user_demo"),
      userName: z.string().default("Community Reviewer"),
      rating: z.number().min(1).max(5),
      review: z.string().default(""),
    }).parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; message: string }> => {
    try {
      const db = getDb();
      const reviewId = "rev_" + crypto.randomUUID().slice(0, 8);
      const now = Date.now();

      db.prepare(`
        INSERT INTO marketplace_reviews (id, prompt_id, user_id, user_name, rating, review, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?);
      `).run(reviewId, data.promptId, data.userId, data.userName, data.rating, data.review, now);

      // Recalculate average rating
      const stats = db.prepare("SELECT AVG(rating) as avg, COUNT(*) as count FROM marketplace_reviews WHERE prompt_id = ?;").get(data.promptId) as any;
      if (stats) {
        db.prepare("UPDATE marketplace_prompts SET rating_avg = ?, rating_count = ? WHERE id = ?;").run(stats.avg, stats.count, data.promptId);
      }

      return { ok: true, message: "Review submitted successfully!" };
    } catch (err: any) {
      return { ok: false, message: err.message };
    }
  });

// 4. Save to Personal Library count increment
export const incrementSaveCount = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ promptId: z.string() }).parse(d))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    try {
      const db = getDb();
      db.prepare("UPDATE marketplace_prompts SET saves_count = saves_count + 1 WHERE id = ?;").run(data.promptId);
      return { ok: true };
    } catch {
      return { ok: false };
    }
  });

// 5. Report Inappropriate Prompt
export const reportMarketplacePrompt = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      promptId: z.string(),
      userId: z.string().default("usr_user_demo"),
      reason: z.string().min(3),
      details: z.string().default(""),
    }).parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; message: string }> => {
    try {
      const db = getDb();
      db.prepare(`
        INSERT INTO marketplace_reports (id, prompt_id, user_id, reason, details, status, created_at)
        VALUES (?, ?, ?, ?, ?, 'pending', ?);
      `).run(crypto.randomUUID(), data.promptId, data.userId, data.reason, data.details, Date.now());
      return { ok: true, message: "Report received. Our moderation team will review this prompt." };
    } catch {
      return { ok: false, message: "Could not submit report." };
    }
  });

// 6. Delete Prompt (Author or Admin)
export const deleteMarketplacePrompt = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ promptId: z.string(), authorId: z.string() }).parse(d))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    try {
      const db = getDb();
      db.prepare("DELETE FROM marketplace_prompts WHERE id = ? AND (author_id = ? OR author_id = 'usr_admin_001');").run(
        data.promptId,
        data.authorId,
      );
      return { ok: true };
    } catch {
      return { ok: false };
    }
  });
