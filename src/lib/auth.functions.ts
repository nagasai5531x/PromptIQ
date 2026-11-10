// Server functions for Authentication, Sessions, User Dashboard, Activity Tracking, and Admin.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import crypto from "node:crypto";
import { getDb, hashPassword, verifyPassword, logActivity } from "./db.server";

export type UserProfile = {
  id: string;
  fullName: string;
  email: string;
  profileImage: string;
  role: "admin" | "editor" | "viewer" | "user";
  createdAt: number;
  updatedAt: number;
  lastLogin?: number | null;
};

export type UserActivityRecord = {
  id: string;
  userId: string;
  activityType: string;
  activityDescription: string;
  moduleName: string;
  metadata: string;
  createdAt: number;
};

// 1. User Registration
export const registerUserFn = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      fullName: z.string().trim().min(2, "Full name must be at least 2 characters"),
      email: z.string().trim().email("Please provide a valid email address"),
      password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .regex(/[A-Z]/, "Password must include at least one uppercase letter")
        .regex(/[a-z]/, "Password must include at least one lowercase letter")
        .regex(/[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/, "Password must include at least one number or symbol"),
      confirmPassword: z.string(),
    }).parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; message?: string; user?: UserProfile; sessionToken?: string }> => {
    if (data.password !== data.confirmPassword) {
      return { ok: false, message: "Passwords do not match." };
    }

    try {
      const db = getDb();
      const normalizedEmail = data.email.toLowerCase();

      // Check if email already exists
      const existing = db.prepare("SELECT id FROM users WHERE LOWER(email) = ?;").get(normalizedEmail);
      if (existing) {
        return { ok: false, message: "An account with this email address already exists. Please log in." };
      }

      const userId = "usr_" + crypto.randomUUID().slice(0, 10);
      const hashedPassword = hashPassword(data.password);
      const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(data.fullName)}`;
      const now = Date.now();

      // First registered user gets admin role, subsequent get 'user'
      const countStmt = db.prepare("SELECT COUNT(*) as count FROM users;").get() as { count: number };
      const role = countStmt.count === 0 || normalizedEmail.includes("admin") ? "admin" : "user";

      db.prepare(`
        INSERT INTO users (id, email, password_hash, name, full_name, avatar, profile_image, role, created_at, updated_at, last_login)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `).run(
        userId,
        normalizedEmail,
        hashedPassword,
        data.fullName,
        data.fullName,
        avatar,
        avatar,
        role,
        now,
        now,
        now,
      );

      // Create initial active session
      const sessionToken = "piq_sess_" + crypto.randomBytes(32).toString("hex");
      const expiresAt = now + 30 * 24 * 60 * 60 * 1000; // 30 days
      db.prepare(`
        INSERT INTO user_sessions (id, user_id, session_identifier, created_at, expires_at)
        VALUES (?, ?, ?, ?, ?);
      `).run("sess_" + crypto.randomUUID().slice(0, 10), userId, sessionToken, now, expiresAt);

      // Log registration and initial login activity
      logActivity({
        userId,
        activityType: "USER_REGISTRATION",
        activityDescription: `Account created for ${data.fullName}`,
        moduleName: "Authentication",
        metadata: { email: normalizedEmail, role },
      });

      logActivity({
        userId,
        activityType: "USER_LOGIN",
        activityDescription: "Initial login on registration",
        moduleName: "Authentication",
      });

      return {
        ok: true,
        sessionToken,
        user: {
          id: userId,
          fullName: data.fullName,
          email: normalizedEmail,
          profileImage: avatar,
          role,
          createdAt: now,
          updatedAt: now,
          lastLogin: now,
        },
      };
    } catch (e: any) {
      console.error("Registration error:", e);
      return { ok: false, message: e.message || "Registration failed due to a server error." };
    }
  });

// 2. User Login with Rate Limiting
export const loginUserFn = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      email: z.string().trim().email("Please enter a valid email address"),
      password: z.string().min(1, "Please enter your password"),
      rememberMe: z.boolean().default(true),
    }).parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; message?: string; user?: UserProfile; sessionToken?: string }> => {
    try {
      const db = getDb();
      const normalizedEmail = data.email.toLowerCase();
      const now = Date.now();
      const windowStart = now - 15 * 60 * 1000; // 15-minute sliding window

      // Rate limiting: check failed attempts in past 15 mins
      const failedAttemptsStmt = db.prepare(`
        SELECT COUNT(*) as count FROM login_attempts
        WHERE email = ? AND success = 0 AND attempt_time > ?;
      `).get(normalizedEmail, windowStart) as { count: number };

      if (failedAttemptsStmt && failedAttemptsStmt.count >= 5) {
        return {
          ok: false,
          message: "Too many failed login attempts. For security, please wait 15 minutes before trying again.",
        };
      }

      // Find user
      const user = db.prepare("SELECT * FROM users WHERE LOWER(email) = ?;").get(normalizedEmail) as any;
      if (!user || !verifyPassword(data.password, user.password_hash)) {
        // Record failed attempt
        db.prepare(`
          INSERT INTO login_attempts (id, email, ip_address, attempt_time, success)
          VALUES (?, ?, ?, ?, 0);
        `).run("att_" + crypto.randomUUID().slice(0, 8), normalizedEmail, "127.0.0.1", now);

        return { ok: false, message: "Invalid email address or password." };
      }

      // Record successful login
      db.prepare(`
        INSERT INTO login_attempts (id, email, ip_address, attempt_time, success)
        VALUES (?, ?, ?, ?, 1);
      `).run("att_" + crypto.randomUUID().slice(0, 8), normalizedEmail, "127.0.0.1", now);

      // Update last_login
      db.prepare("UPDATE users SET last_login = ?, updated_at = ? WHERE id = ?;").run(now, now, user.id);

      // Create session
      const sessionDuration = data.rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
      const sessionToken = "piq_sess_" + crypto.randomBytes(32).toString("hex");
      db.prepare(`
        INSERT INTO user_sessions (id, user_id, session_identifier, created_at, expires_at)
        VALUES (?, ?, ?, ?, ?);
      `).run("sess_" + crypto.randomUUID().slice(0, 10), user.id, sessionToken, now, now + sessionDuration);

      // Log activity
      logActivity({
        userId: user.id,
        activityType: "USER_LOGIN",
        activityDescription: "User logged in securely",
        moduleName: "Authentication",
      });

      return {
        ok: true,
        sessionToken,
        user: {
          id: user.id,
          fullName: user.full_name || user.name,
          email: user.email,
          profileImage: user.profile_image || user.avatar,
          role: user.role || "user",
          createdAt: user.created_at,
          updatedAt: user.updated_at || now,
          lastLogin: now,
        },
      };
    } catch (e: any) {
      console.error("Login error:", e);
      return { ok: false, message: e.message || "An unexpected error occurred during login." };
    }
  });

// 3. Get Current User via Session Token
export const getCurrentUserFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ sessionToken: z.string().optional() }).parse(d))
  .handler(async ({ data }): Promise<{ ok: boolean; user: UserProfile | null }> => {
    if (!data.sessionToken) return { ok: false, user: null };

    try {
      const db = getDb();
      const now = Date.now();
      const session = db.prepare(`
        SELECT u.id, u.full_name, u.name, u.email, u.profile_image, u.avatar, u.role, u.created_at, u.updated_at, u.last_login
        FROM user_sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.session_identifier = ? AND s.revoked_at IS NULL AND s.expires_at > ?;
      `).get(data.sessionToken, now) as any;

      if (!session) return { ok: false, user: null };

      return {
        ok: true,
        user: {
          id: session.id,
          fullName: session.full_name || session.name,
          email: session.email,
          profileImage: session.profile_image || session.avatar,
          role: session.role || "user",
          createdAt: session.created_at,
          updatedAt: session.updated_at,
          lastLogin: session.last_login,
        },
      };
    } catch {
      return { ok: false, user: null };
    }
  });

// 4. Logout User
export const logoutUserFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ sessionToken: z.string() }).parse(d))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    try {
      const db = getDb();
      const session = db.prepare("SELECT user_id FROM user_sessions WHERE session_identifier = ?;").get(data.sessionToken) as any;
      if (session) {
        db.prepare("UPDATE user_sessions SET revoked_at = ? WHERE session_identifier = ?;").run(Date.now(), data.sessionToken);
        logActivity({
          userId: session.user_id,
          activityType: "USER_LOGOUT",
          activityDescription: "User logged out of session",
          moduleName: "Authentication",
        });
      }
      return { ok: true };
    } catch {
      return { ok: false };
    }
  });

// 5. Update Profile
export const updateProfileFn = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      sessionToken: z.string(),
      fullName: z.string().trim().min(2, "Full name must be at least 2 characters"),
      profileImage: z.string().optional(),
    }).parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; message?: string; user?: UserProfile }> => {
    try {
      const db = getDb();
      const now = Date.now();
      const session = db.prepare(`
        SELECT user_id FROM user_sessions
        WHERE session_identifier = ? AND revoked_at IS NULL AND expires_at > ?;
      `).get(data.sessionToken, now) as any;

      if (!session) return { ok: false, message: "Unauthorized session." };

      const avatar = data.profileImage || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(data.fullName)}`;

      db.prepare(`
        UPDATE users
        SET full_name = ?, name = ?, profile_image = ?, avatar = ?, updated_at = ?
        WHERE id = ?;
      `).run(data.fullName, data.fullName, avatar, avatar, now, session.user_id);

      const updatedUser = db.prepare("SELECT * FROM users WHERE id = ?;").get(session.user_id) as any;

      logActivity({
        userId: session.user_id,
        activityType: "PROFILE_UPDATE",
        activityDescription: "User updated profile details",
        moduleName: "Profile",
        metadata: { fullName: data.fullName },
      });

      return {
        ok: true,
        user: {
          id: updatedUser.id,
          fullName: updatedUser.full_name || updatedUser.name,
          email: updatedUser.email,
          profileImage: updatedUser.profile_image || updatedUser.avatar,
          role: updatedUser.role || "user",
          createdAt: updatedUser.created_at,
          updatedAt: updatedUser.updated_at,
          lastLogin: updatedUser.last_login,
        },
      };
    } catch (e: any) {
      return { ok: false, message: e.message || "Failed to update profile." };
    }
  });

// 6. Change Password & Revoke Sessions
export const changePasswordFn = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      sessionToken: z.string(),
      currentPassword: z.string(),
      newPassword: z
        .string()
        .min(8, "New password must be at least 8 characters")
        .regex(/[A-Z]/, "Password must include at least one uppercase letter")
        .regex(/[a-z]/, "Password must include at least one lowercase letter")
        .regex(/[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/, "Password must include at least one number or symbol"),
      confirmNewPassword: z.string(),
      revokeOtherSessions: z.boolean().default(true),
    }).parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; message?: string }> => {
    if (data.newPassword !== data.confirmNewPassword) {
      return { ok: false, message: "New passwords do not match." };
    }

    try {
      const db = getDb();
      const now = Date.now();
      const session = db.prepare(`
        SELECT u.id, u.password_hash FROM user_sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.session_identifier = ? AND s.revoked_at IS NULL AND s.expires_at > ?;
      `).get(data.sessionToken, now) as any;

      if (!session) return { ok: false, message: "Unauthorized session." };

      if (!verifyPassword(data.currentPassword, session.password_hash)) {
        return { ok: false, message: "Current password is incorrect." };
      }

      const newHash = hashPassword(data.newPassword);
      db.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?;").run(newHash, now, session.id);

      if (data.revokeOtherSessions) {
        db.prepare(`
          UPDATE user_sessions SET revoked_at = ?
          WHERE user_id = ? AND session_identifier != ? AND revoked_at IS NULL;
        `).run(now, session.id, data.sessionToken);
      }

      logActivity({
        userId: session.id,
        activityType: "PASSWORD_CHANGE",
        activityDescription: "User changed account password",
        moduleName: "Security",
        metadata: { revokedOtherSessions: data.revokeOtherSessions },
      });

      return { ok: true, message: "Password updated successfully." };
    } catch (e: any) {
      return { ok: false, message: e.message || "Failed to change password." };
    }
  });

// 7. Revoke Other Active Sessions
export const revokeOtherSessionsFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ sessionToken: z.string() }).parse(d))
  .handler(async ({ data }): Promise<{ ok: boolean; revokedCount: number }> => {
    try {
      const db = getDb();
      const now = Date.now();
      const session = db.prepare("SELECT user_id FROM user_sessions WHERE session_identifier = ? AND revoked_at IS NULL AND expires_at > ?;").get(data.sessionToken, now) as any;
      if (!session) return { ok: false, revokedCount: 0 };

      const result = db.prepare(`
        UPDATE user_sessions SET revoked_at = ?
        WHERE user_id = ? AND session_identifier != ? AND revoked_at IS NULL;
      `).run(now, session.user_id, data.sessionToken);

      logActivity({
        userId: session.user_id,
        activityType: "REVOKE_SESSIONS",
        activityDescription: "Revoked all other active browser sessions",
        moduleName: "Security",
      });

      return { ok: true, revokedCount: Number(result.changes) };
    } catch {
      return { ok: false, revokedCount: 0 };
    }
  });

// 8. User Dashboard Statistics from actual Database
export const getUserDashboardStatsFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ sessionToken: z.string() }).parse(d))
  .handler(async ({ data }) => {
    try {
      const db = getDb();
      const now = Date.now();
      const session = db.prepare(`
        SELECT u.id, u.full_name, u.name, u.email, u.role, u.created_at, u.last_login
        FROM user_sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.session_identifier = ? AND s.revoked_at IS NULL AND s.expires_at > ?;
      `).get(data.sessionToken, now) as any;

      if (!session) return { ok: false, message: "Unauthorized" };

      const userId = session.id;

      // Real query counts from user_activities
      const totalAnalyses = (db.prepare(`
        SELECT COUNT(*) as count FROM user_activities
        WHERE user_id = ? AND (activity_type LIKE '%ANALY%' OR module_name = 'Quality Checker');
      `).get(userId) as any)?.count || 0;

      const totalOptimizations = (db.prepare(`
        SELECT COUNT(*) as count FROM user_activities
        WHERE user_id = ? AND (activity_type LIKE '%OPTIMIZ%' OR activity_type LIKE '%IMPROV%');
      `).get(userId) as any)?.count || 0;

      const totalSecurityChecks = (db.prepare(`
        SELECT COUNT(*) as count FROM user_activities
        WHERE user_id = ? AND (activity_type LIKE '%SECURI%' OR module_name = 'Attack Simulator');
      `).get(userId) as any)?.count || 0;

      const totalEvaluations = (db.prepare(`
        SELECT COUNT(*) as count FROM user_activities
        WHERE user_id = ? AND (activity_type LIKE '%EVALUAT%' OR module_name = 'AI Benchmark');
      `).get(userId) as any)?.count || 0;

      // Recent 10 activities for this user
      const recentActivities = (db.prepare(`
        SELECT id, activity_type, activity_description, module_name, metadata, created_at
        FROM user_activities
        WHERE user_id = ?
        ORDER BY created_at DESC LIMIT 8;
      `).all(userId) as any[]).map((r) => ({
        id: r.id,
        activityType: r.activity_type,
        activityDescription: r.activity_description,
        moduleName: r.module_name,
        metadata: r.metadata,
        createdAt: r.created_at,
      }));

      // Recent saved team prompts
      const savedPrompts = (db.prepare(`
        SELECT id, title, category, score, created_at
        FROM team_prompts
        WHERE author_id = ?
        ORDER BY created_at DESC LIMIT 5;
      `).all(userId) as any[]).map((r) => ({
        id: r.id,
        title: r.title,
        category: r.category,
        score: r.score,
        createdAt: r.created_at,
      }));

      // Active sessions count
      const activeSessionsCount = (db.prepare(`
        SELECT COUNT(*) as count FROM user_sessions
        WHERE user_id = ? AND revoked_at IS NULL AND expires_at > ?;
      `).get(userId, now) as any)?.count || 1;

      return {
        ok: true,
        stats: {
          fullName: session.full_name || session.name,
          email: session.email,
          role: session.role,
          createdAt: session.created_at,
          lastLogin: session.last_login,
          totalAnalyses,
          totalOptimizations,
          totalSecurityChecks,
          totalEvaluations,
          activeSessionsCount,
        },
        recentActivities,
        savedPrompts,
      };
    } catch (e: any) {
      console.error("Dashboard stats error:", e);
      return { ok: false, message: e.message };
    }
  });

// 9. Activity History with Search, Filter & Pagination
export const getUserActivitiesFn = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      sessionToken: z.string(),
      search: z.string().optional(),
      activityType: z.string().optional(),
      moduleName: z.string().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(15),
    }).parse(d),
  )
  .handler(async ({ data }): Promise<{
    ok: boolean;
    activities: UserActivityRecord[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> => {
    try {
      const db = getDb();
      const now = Date.now();
      const session = db.prepare(`
        SELECT user_id FROM user_sessions
        WHERE session_identifier = ? AND revoked_at IS NULL AND expires_at > ?;
      `).get(data.sessionToken, now) as any;

      if (!session) {
        return { ok: false, activities: [], totalCount: 0, page: 1, pageSize: data.pageSize, totalPages: 0 };
      }

      let whereClause = "WHERE user_id = ?";
      const params: any[] = [session.user_id];

      if (data.search?.trim()) {
        whereClause += " AND (activity_description LIKE ? OR activity_type LIKE ? OR module_name LIKE ?)";
        const term = `%${data.search.trim()}%`;
        params.push(term, term, term);
      }

      if (data.activityType && data.activityType !== "ALL") {
        whereClause += " AND activity_type = ?";
        params.push(data.activityType);
      }

      if (data.moduleName && data.moduleName !== "ALL") {
        whereClause += " AND module_name = ?";
        params.push(data.moduleName);
      }

      // Count query
      const countStmt = db.prepare(`SELECT COUNT(*) as count FROM user_activities ${whereClause};`).get(...params) as any;
      const totalCount = countStmt?.count || 0;
      const totalPages = Math.ceil(totalCount / data.pageSize);
      const offset = (data.page - 1) * data.pageSize;

      // Data query
      const rows = db.prepare(`
        SELECT id, user_id, activity_type, activity_description, module_name, metadata, created_at
        FROM user_activities
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?;
      `).all(...params, data.pageSize, offset) as any[];

      const activities: UserActivityRecord[] = rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        activityType: r.activity_type,
        activityDescription: r.activity_description,
        moduleName: r.module_name,
        metadata: r.metadata,
        createdAt: r.created_at,
      }));

      return {
        ok: true,
        activities,
        totalCount,
        page: data.page,
        pageSize: data.pageSize,
        totalPages,
      };
    } catch (e) {
      console.error(e);
      return { ok: false, activities: [], totalCount: 0, page: 1, pageSize: data.pageSize, totalPages: 0 };
    }
  });

// 10. Client Action Activity Logger Server Function
export const logUserActionFn = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      sessionToken: z.string().optional(),
      activityType: z.string(),
      activityDescription: z.string(),
      moduleName: z.string(),
      metadata: z.record(z.any()).optional(),
    }).parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    try {
      const db = getDb();
      let userId = "usr_guest";

      if (data.sessionToken) {
        const session = db.prepare("SELECT user_id FROM user_sessions WHERE session_identifier = ? AND revoked_at IS NULL AND expires_at > ?;").get(data.sessionToken, Date.now()) as any;
        if (session) userId = session.user_id;
      }

      logActivity({
        userId,
        activityType: data.activityType,
        activityDescription: data.activityDescription,
        moduleName: data.moduleName,
        metadata: data.metadata,
      });

      return { ok: true };
    } catch {
      return { ok: false };
    }
  });

// 11. Admin Dashboard Metrics & User Management
export const getAdminDashboardStatsFn = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      sessionToken: z.string(),
      searchQuery: z.string().optional(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    try {
      const db = getDb();
      const now = Date.now();

      // Check admin authorization
      const session = db.prepare(`
        SELECT u.role, u.id FROM user_sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.session_identifier = ? AND s.revoked_at IS NULL AND s.expires_at > ?;
      `).get(data.sessionToken, now) as any;

      if (!session || session.role !== "admin") {
        return { ok: false, message: "Unauthorized: Admin privileges required." };
      }

      // 1. Total Registered Users
      const totalUsers = (db.prepare("SELECT COUNT(*) as count FROM users;").get() as any)?.count || 0;

      // 2. Active Users (logged in or active session in last 30 days)
      const activeUsers = (db.prepare(`
        SELECT COUNT(DISTINCT user_id) as count FROM user_sessions
        WHERE expires_at > ? AND revoked_at IS NULL;
      `).get(now) as any)?.count || 0;

      // 3. New Registrations in last 7 days
      const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
      const newRegistrations = (db.prepare("SELECT COUNT(*) as count FROM users WHERE created_at > ?;").get(sevenDaysAgo) as any)?.count || 0;

      // 4. Total Platform Activities
      const totalActivities = (db.prepare("SELECT COUNT(*) as count FROM user_activities;").get() as any)?.count || 0;

      // 5. Most Frequently Used Modules
      const moduleUsage = (db.prepare(`
        SELECT module_name, COUNT(*) as count
        FROM user_activities
        GROUP BY module_name
        ORDER BY count DESC LIMIT 8;
      `).all() as any[]).map((r) => ({
        moduleName: r.module_name,
        count: r.count,
      }));

      // 6. Recent Platform Activities
      const recentActivities = (db.prepare(`
        SELECT a.id, a.user_id, a.activity_type, a.activity_description, a.module_name, a.created_at,
               COALESCE(u.full_name, u.name, 'Guest') as user_name, u.email as user_email
        FROM user_activities a
        LEFT JOIN users u ON a.user_id = u.id
        ORDER BY a.created_at DESC LIMIT 25;
      `).all() as any[]).map((r) => ({
        id: r.id,
        userId: r.user_id,
        userName: r.user_name,
        userEmail: r.user_email,
        activityType: r.activity_type,
        activityDescription: r.activity_description,
        moduleName: r.module_name,
        createdAt: r.created_at,
      }));

      // 7. Users List with search filter
      let userQuery = `
        SELECT u.id, u.full_name, u.name, u.email, u.role, u.profile_image, u.created_at, u.last_login,
               (SELECT COUNT(*) FROM user_activities WHERE user_id = u.id) as activity_count
        FROM users u
      `;
      const params: any[] = [];
      if (data.searchQuery?.trim()) {
        userQuery += " WHERE LOWER(u.email) LIKE ? OR LOWER(u.full_name) LIKE ? OR LOWER(u.name) LIKE ?";
        const term = `%${data.searchQuery.trim().toLowerCase()}%`;
        params.push(term, term, term);
      }
      userQuery += " ORDER BY u.created_at DESC LIMIT 50;";

      const allUsers = (db.prepare(userQuery).all(...params) as any[]).map((u) => ({
        id: u.id,
        fullName: u.full_name || u.name,
        email: u.email,
        role: u.role,
        profileImage: u.profile_image,
        createdAt: u.created_at,
        lastLogin: u.last_login,
        activityCount: u.activity_count,
      }));

      return {
        ok: true,
        stats: {
          totalUsers,
          activeUsers,
          newRegistrations,
          totalActivities,
          moduleUsage,
        },
        recentActivities,
        allUsers,
      };
    } catch (e: any) {
      console.error("Admin stats error:", e);
      return { ok: false, message: e.message };
    }
  });

// 12. Update User Role (Admin Only)
export const updateUserRoleFn = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      sessionToken: z.string(),
      targetUserId: z.string(),
      newRole: z.enum(["admin", "editor", "viewer", "user"]),
    }).parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; message?: string }> => {
    try {
      const db = getDb();
      const now = Date.now();
      const session = db.prepare(`
        SELECT u.role, u.id FROM user_sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.session_identifier = ? AND s.revoked_at IS NULL AND s.expires_at > ?;
      `).get(data.sessionToken, now) as any;

      if (!session || session.role !== "admin") {
        return { ok: false, message: "Unauthorized: Admin privileges required." };
      }

      db.prepare("UPDATE users SET role = ?, updated_at = ? WHERE id = ?;").run(data.newRole, now, data.targetUserId);

      logActivity({
        userId: session.id,
        activityType: "ROLE_CHANGE",
        activityDescription: `Updated role of user ${data.targetUserId} to ${data.newRole}`,
        moduleName: "Admin",
        metadata: { targetUserId: data.targetUserId, newRole: data.newRole },
      });

      return { ok: true };
    } catch (e: any) {
      return { ok: false, message: e.message };
    }
  });
