// Team Collaboration, Workspace & Auth Server Functions
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import crypto from "node:crypto";
import { getDb, hashPassword } from "./db.server";
import { analyzePrompt } from "./analyzer";

export type User = {
  id: string;
  email: string;
  name: string;
  avatar: string;
  role: string;
};

export type Team = {
  id: string;
  name: string;
  ownerId: string;
  memberCount: number;
  userRole: "admin" | "editor" | "viewer";
};

export type TeamMember = {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatar: string;
  role: "admin" | "editor" | "viewer";
  joinedAt: number;
};

export type TeamPrompt = {
  id: string;
  teamId: string;
  authorId: string;
  authorName: string;
  title: string;
  prompt: string;
  category: string;
  score: number;
  commentsCount: number;
  createdAt: number;
  updatedAt: number;
};

export type PromptComment = {
  id: string;
  promptId: string;
  userId: string;
  userName: string;
  comment: string;
  createdAt: number;
};

export type TeamActivity = {
  id: string;
  teamId: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  createdAt: number;
};

// 1. Auth: Login
export const loginUser = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ email: z.string().email(), password: z.string().min(4) }).parse(d))
  .handler(async ({ data }): Promise<{ ok: boolean; user?: User; message?: string }> => {
    try {
      const db = getDb();
      const hash = hashPassword(data.password);
      const user = db.prepare("SELECT * FROM users WHERE email = ? AND password_hash = ?;").get(data.email, hash) as any;

      if (!user) {
        return { ok: false, message: "Invalid email or password." };
      }

      return {
        ok: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.name}`,
          role: user.role,
        },
      };
    } catch (err: any) {
      return { ok: false, message: err.message };
    }
  });

// 2. Auth: Register
export const registerUser = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(6),
    }).parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; user?: User; message?: string }> => {
    try {
      const db = getDb();
      const existing = db.prepare("SELECT id FROM users WHERE email = ?;").get(data.email);
      if (existing) {
        return { ok: false, message: "An account with this email already exists." };
      }

      const userId = "usr_" + crypto.randomUUID().slice(0, 8);
      const now = Date.now();
      const hash = hashPassword(data.password);
      const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${data.name}`;

      db.prepare(`
        INSERT INTO users (id, email, password_hash, name, avatar, role, created_at)
        VALUES (?, ?, ?, ?, ?, 'member', ?);
      `).run(userId, data.email, hash, data.name, avatar, now);

      // Auto-create a default workspace team
      const teamId = "team_" + crypto.randomUUID().slice(0, 8);
      db.prepare("INSERT INTO teams (id, name, owner_id, created_at) VALUES (?, ?, ?, ?);").run(
        teamId,
        `${data.name}'s Workspace`,
        userId,
        now,
      );
      db.prepare("INSERT INTO team_members (id, team_id, user_id, role, joined_at) VALUES (?, ?, ?, 'admin', ?);").run(
        crypto.randomUUID(),
        teamId,
        userId,
        now,
      );

      return {
        ok: true,
        user: { id: userId, email: data.email, name: data.name, avatar, role: "member" },
      };
    } catch (err: any) {
      return { ok: false, message: err.message };
    }
  });

// 3. Get Teams for user
export const getUserTeams = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ userId: z.string() }).parse(d))
  .handler(async ({ data }): Promise<Team[]> => {
    try {
      const db = getDb();
      let rows = db.prepare(`
        SELECT t.id, t.name, t.owner_id as ownerId, tm.role as userRole,
          (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as memberCount
        FROM teams t
        JOIN team_members tm ON tm.team_id = t.id
        WHERE tm.user_id = ?
        ORDER BY t.created_at ASC;
      `).all(data.userId) as any[];

      // If user is not yet part of any team, auto-enroll them in the core engineering team
      if (rows.length === 0) {
        const coreTeam = db.prepare("SELECT id, name FROM teams ORDER BY created_at ASC LIMIT 1;").get() as any;
        if (coreTeam) {
          const inCore = db.prepare("SELECT id FROM team_members WHERE team_id = ? AND user_id = ?;").get(coreTeam.id, data.userId);
          if (!inCore) {
            db.prepare("INSERT OR IGNORE INTO team_members (id, team_id, user_id, role, joined_at) VALUES (?, ?, ?, 'admin', ?);").run(
              crypto.randomUUID(),
              coreTeam.id,
              data.userId,
              Date.now(),
            );
          }
        } else {
          const newTeamId = "team_core_001";
          const now = Date.now();
          db.prepare("INSERT INTO teams (id, name, owner_id, created_at) VALUES (?, ?, ?, ?);").run(
            newTeamId,
            "PromptIQ Engineering Team",
            data.userId,
            now,
          );
          db.prepare("INSERT INTO team_members (id, team_id, user_id, role, joined_at) VALUES (?, ?, ?, 'admin', ?);").run(
            crypto.randomUUID(),
            newTeamId,
            data.userId,
            now,
          );
        }

        rows = db.prepare(`
          SELECT t.id, t.name, t.owner_id as ownerId, tm.role as userRole,
            (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as memberCount
          FROM teams t
          JOIN team_members tm ON tm.team_id = t.id
          WHERE tm.user_id = ?
          ORDER BY t.created_at ASC;
        `).all(data.userId) as any[];
      }

      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        ownerId: r.ownerId,
        memberCount: r.memberCount,
        userRole: r.userRole || "admin",
      }));
    } catch {
      return [];
    }
  });

// 4. Create new Team
export const createTeam = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ userId: z.string(), teamName: z.string().min(2) }).parse(d))
  .handler(async ({ data }): Promise<{ ok: boolean; teamId?: string; message?: string }> => {
    try {
      const db = getDb();
      const teamId = "team_" + crypto.randomUUID().slice(0, 8);
      const now = Date.now();

      db.prepare("INSERT INTO teams (id, name, owner_id, created_at) VALUES (?, ?, ?, ?);").run(
        teamId,
        data.teamName,
        data.userId,
        now,
      );
      db.prepare("INSERT INTO team_members (id, team_id, user_id, role, joined_at) VALUES (?, ?, ?, 'admin', ?);").run(
        crypto.randomUUID(),
        teamId,
        data.userId,
        now,
      );

      // Log activity
      const user = db.prepare("SELECT name FROM users WHERE id = ?;").get(data.userId) as any;
      db.prepare("INSERT INTO team_activity (id, team_id, user_id, user_name, action, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?);").run(
        crypto.randomUUID(),
        teamId,
        data.userId,
        user?.name || "User",
        "Created Workspace",
        `Created team ${data.teamName}`,
        now,
      );

      return { ok: true, teamId };
    } catch (err: any) {
      return { ok: false, message: err.message };
    }
  });

// 5. Get Team Members
export const getTeamMembers = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ teamId: z.string() }).parse(d))
  .handler(async ({ data }): Promise<TeamMember[]> => {
    try {
      const db = getDb();
      const rows = db.prepare(`
        SELECT tm.id, tm.user_id as userId, u.name, u.email, u.avatar, tm.role, tm.joined_at as joinedAt
        FROM team_members tm
        JOIN users u ON u.id = tm.user_id
        WHERE tm.team_id = ?
        ORDER BY tm.joined_at ASC;
      `).all(data.teamId) as any[];

      return rows.map((r) => ({
        id: r.id,
        userId: r.userId,
        name: r.name,
        email: r.email,
        avatar: r.avatar,
        role: r.role,
        joinedAt: r.joinedAt,
      }));
    } catch {
      return [];
    }
  });

// 6. Invite Member to Team
export const inviteTeamMember = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      teamId: z.string(),
      email: z.string().email(),
      role: z.enum(["admin", "editor", "viewer"]).default("editor"),
      inviterId: z.string(),
    }).parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; message: string }> => {
    try {
      const db = getDb();
      // Check inviter permissions: owner, team admin, or system admin
      const isOwner = db.prepare("SELECT id FROM teams WHERE id = ? AND owner_id = ?;").get(data.teamId, data.inviterId);
      const inviter = db.prepare("SELECT role FROM team_members WHERE team_id = ? AND user_id = ?;").get(data.teamId, data.inviterId) as any;
      const sysUser = db.prepare("SELECT role, name, full_name FROM users WHERE id = ?;").get(data.inviterId) as any;

      if (!isOwner && inviter?.role !== "admin" && sysUser?.role !== "admin") {
        return { ok: false, message: "Only team admins can invite members." };
      }

      // Check if user exists or create placeholder
      let targetUser = db.prepare("SELECT * FROM users WHERE email = ?;").get(data.email) as any;
      if (!targetUser) {
        const newUserId = "usr_" + crypto.randomUUID().slice(0, 8);
        const name = (data.email.split("@")[0] || "User");
        db.prepare(`
          INSERT INTO users (id, email, password_hash, name, full_name, avatar, profile_image, role, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'member', ?, ?);
        `).run(newUserId, data.email, hashPassword("welcome123"), name, name, `https://api.dicebear.com/7.x/bottts/svg?seed=${name}`, `https://api.dicebear.com/7.x/bottts/svg?seed=${name}`, Date.now(), Date.now());
        targetUser = { id: newUserId, name };
      }

      const existing = db.prepare("SELECT id FROM team_members WHERE team_id = ? AND user_id = ?;").get(data.teamId, targetUser.id);
      if (existing) {
        return { ok: false, message: "User is already a member of this team." };
      }

      const now = Date.now();
      db.prepare("INSERT INTO team_members (id, team_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?);").run(
        crypto.randomUUID(),
        data.teamId,
        targetUser.id,
        data.role,
        now,
      );

      // Log activity
      db.prepare("INSERT INTO team_activity (id, team_id, user_id, user_name, action, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?);").run(
        crypto.randomUUID(),
        data.teamId,
        data.inviterId,
        sysUser?.full_name || sysUser?.name || "Admin",
        "Invited Member",
        `Invited ${data.email} as ${data.role}`,
        now,
      );

      return { ok: true, message: `Invited ${data.email} as ${data.role}.` };
    } catch (err: any) {
      return { ok: false, message: err.message };
    }
  });

// 7. Get Team Prompts
export const getTeamPrompts = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ teamId: z.string() }).parse(d))
  .handler(async ({ data }): Promise<TeamPrompt[]> => {
    try {
      const db = getDb();
      const rows = db.prepare(`
        SELECT p.*,
          (SELECT COUNT(*) FROM prompt_comments WHERE prompt_id = p.id) as commentsCount
        FROM team_prompts p
        WHERE p.team_id = ?
        ORDER BY p.updated_at DESC;
      `).all(data.teamId) as any[];

      return rows.map((r) => ({
        id: r.id,
        teamId: r.team_id,
        authorId: r.author_id,
        authorName: r.author_name,
        title: r.title,
        prompt: r.prompt,
        category: r.category,
        score: r.score,
        commentsCount: r.commentsCount,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
    } catch {
      return [];
    }
  });

// 8. Share Prompt with Team
export const sharePromptWithTeam = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      teamId: z.string(),
      userId: z.string(),
      title: z.string().min(1),
      prompt: z.string().min(1),
      category: z.string(),
      score: z.number().default(0),
      tags: z.array(z.string()).optional(),
    }).parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; promptId?: string; message?: string }> => {
    try {
      const db = getDb();
      const user = db.prepare("SELECT name, full_name FROM users WHERE id = ?;").get(data.userId) as any;
      const authorName = user?.full_name || user?.name || "Author";
      const promptId = "pr_" + crypto.randomUUID().slice(0, 8);
      const now = Date.now();

      // Compute prompt quality score if not provided
      const promptScore = data.score > 0 ? data.score : analyzePrompt(data.prompt, data.category as any).total;

      db.prepare(`
        INSERT INTO team_prompts (id, team_id, author_id, author_name, title, prompt, category, score, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `).run(promptId, data.teamId, data.userId, authorName, data.title, data.prompt, data.category, promptScore, now, now);

      db.prepare("INSERT INTO team_activity (id, team_id, user_id, user_name, action, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?);").run(
        crypto.randomUUID(),
        data.teamId,
        data.userId,
        authorName,
        "Shared Prompt",
        `Shared prompt '${data.title}' (${data.category}) with score ${promptScore}/100`,
        now,
      );

      return { ok: true, promptId };
    } catch (err: any) {
      return { ok: false, message: err.message };
    }
  });

// 9. Comments on Prompt
export const getPromptComments = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ promptId: z.string() }).parse(d))
  .handler(async ({ data }): Promise<PromptComment[]> => {
    try {
      const db = getDb();
      const rows = db.prepare("SELECT * FROM prompt_comments WHERE prompt_id = ? ORDER BY created_at ASC;").all(data.promptId) as any[];
      return rows.map((r) => ({
        id: r.id,
        promptId: r.prompt_id,
        userId: r.user_id,
        userName: r.user_name,
        comment: r.comment,
        createdAt: r.created_at,
      }));
    } catch {
      return [];
    }
  });

export const addPromptComment = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      promptId: z.string(),
      userId: z.string(),
      comment: z.string().min(1),
    }).parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    try {
      const db = getDb();
      const user = db.prepare("SELECT name, full_name FROM users WHERE id = ?;").get(data.userId) as any;
      const userName = user?.full_name || user?.name || "Member";
      const now = Date.now();
      db.prepare("INSERT INTO prompt_comments (id, prompt_id, user_id, user_name, comment, created_at) VALUES (?, ?, ?, ?, ?, ?);").run(
        crypto.randomUUID(),
        data.promptId,
        data.userId,
        userName,
        data.comment,
        now,
      );

      // Log comment to team activity
      const prompt = db.prepare("SELECT team_id, title FROM team_prompts WHERE id = ?;").get(data.promptId) as any;
      if (prompt) {
        db.prepare("INSERT INTO team_activity (id, team_id, user_id, user_name, action, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?);").run(
          crypto.randomUUID(),
          prompt.team_id,
          data.userId,
          userName,
          "Added Comment",
          `Commented on '${prompt.title}': "${data.comment.slice(0, 40)}${data.comment.length > 40 ? "..." : ""}"`,
          now,
        );
      }

      return { ok: true };
    } catch {
      return { ok: false };
    }
  });

// 10. Team Activity
export const getTeamActivity = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ teamId: z.string() }).parse(d))
  .handler(async ({ data }): Promise<TeamActivity[]> => {
    try {
      const db = getDb();
      const rows = db.prepare("SELECT * FROM team_activity WHERE team_id = ? ORDER BY created_at DESC LIMIT 30;").all(data.teamId) as any[];
      return rows.map((r) => ({
        id: r.id,
        teamId: r.team_id,
        userId: r.user_id,
        userName: r.user_name,
        action: r.action,
        details: r.details,
        createdAt: r.created_at,
      }));
    } catch {
      return [];
    }
  });
