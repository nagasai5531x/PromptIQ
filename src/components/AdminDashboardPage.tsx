import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ShieldAlert,
  ShieldCheck,
  Users,
  Activity,
  BarChart3,
  Search,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  Lock,
  Layers,
  Sparkles,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/lib/auth.context";
import { useLang } from "@/lib/i18n";
import {
  getAdminDashboardStatsFn,
  updateUserRoleFn,
} from "@/lib/auth.functions";
import { PromptIQLayout } from "./PromptIQLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export function AdminDashboardPage() {
  const { sessionToken, user, isAdmin, isAuthenticated } = useAuth();
  const { t } = useLang();
  const getAdminStatsFn = useServerFn(getAdminDashboardStatsFn);
  const updateRoleFn = useServerFn(updateUserRoleFn);

  const [stats, setStats] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (sessionToken && isAdmin) {
      loadAdminData();
    } else {
      setIsLoading(false);
    }
  }, [sessionToken, isAdmin, searchQuery]);

  const loadAdminData = async () => {
    if (!sessionToken) return;
    setIsLoading(true);

    try {
      const res = await getAdminStatsFn({
        data: {
          sessionToken,
          searchQuery: searchQuery.trim() || undefined,
        },
      });

      if (res.ok && res.stats) {
        setStats(res.stats);
        setAllUsers(res.allUsers || []);
        setRecentActivities(res.recentActivities || []);
      } else {
        setStatusMsg({ type: "error", text: res.message || "Failed to load admin telemetry." });
      }
    } catch (e: any) {
      console.error(e);
      setStatusMsg({ type: "error", text: e.message || "Failed to load admin data." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (targetUserId: string, newRole: any) => {
    if (!sessionToken) return;
    try {
      const res = await updateRoleFn({
        data: { sessionToken, targetUserId, newRole },
      });
      if (res.ok) {
        setStatusMsg({ type: "success", text: `User role updated to ${newRole}!` });
        loadAdminData();
        setTimeout(() => setStatusMsg(null), 3000);
      } else {
        setStatusMsg({ type: "error", text: res.message || "Failed to update role." });
      }
    } catch (e: any) {
      setStatusMsg({ type: "error", text: e.message });
    }
  };

  // Guard: if not authenticated or not admin, show Access Denied
  if (!isAuthenticated || !isAdmin) {
    return (
      <PromptIQLayout title="Admin Console" subtitle="System administration and user management.">
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-12 text-center max-w-md mx-auto space-y-4">
          <ShieldAlert className="h-12 w-12 text-destructive mx-auto" />
          <h3 className="font-display text-lg font-bold text-destructive">403 Forbidden: Admin Access Required</h3>
          <p className="text-xs text-muted-foreground">
            This module is restricted to platform administrators. Regular users do not possess administrative clearance.
          </p>
          <div className="pt-2">
            <Link to="/dashboard">
              <Button size="sm" variant="outline" className="text-xs">
                Return to Personal Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </PromptIQLayout>
    );
  }

  return (
    <PromptIQLayout
      title={t.adm_title}
      subtitle={t.adm_sub}
    >
      <div className="space-y-6">
        {/* Status Toast */}
        {statusMsg && (
          <div
            className={`flex items-center justify-between rounded-xl p-3 text-xs ${
              statusMsg.type === "success"
                ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                : "border border-destructive/30 bg-destructive/10 text-destructive"
            }`}
          >
            <span>{statusMsg.text}</span>
            <button onClick={() => setStatusMsg(null)} className="font-bold">
              ×
            </button>
          </div>
        )}

        {/* 4 Admin Metric Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">{t.adm_total_users}</span>
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-foreground">{stats?.totalUsers ?? 0}</span>
              <span className="text-[11px] text-muted-foreground">registered</span>
            </div>
            <p className="text-[11px] text-muted-foreground">Total platform accounts in SQLite</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">{t.adm_active_users}</span>
              <UserCheck className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-emerald-600">{stats?.activeUsers ?? 0}</span>
              <span className="text-[11px] text-muted-foreground">active sessions</span>
            </div>
            <p className="text-[11px] text-muted-foreground">Sessions active in past 30 days</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">{t.adm_total_acts}</span>
              <TrendingUp className="h-4 w-4 text-purple-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-purple-600">{stats?.newRegistrations ?? 0}</span>
              <span className="text-[11px] text-muted-foreground">last 7 days</span>
            </div>
            <p className="text-[11px] text-muted-foreground">Recent user acquisition rate</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">{t.adm_total_acts}</span>
              <Activity className="h-4 w-4 text-blue-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-blue-600">{stats?.totalActivities ?? 0}</span>
              <span className="text-[11px] text-muted-foreground">events</span>
            </div>
            <p className="text-[11px] text-muted-foreground">Audited user activity log entries</p>
          </div>
        </div>

        {/* Most Frequently Used Modules */}
        {stats?.moduleUsage && stats.moduleUsage.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            <h3 className="font-display text-sm font-bold text-foreground">{t.adm_module_usage}</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {stats.moduleUsage.map((m: any, idx: number) => (
                <div key={idx} className="rounded-xl border border-border bg-muted/20 p-3 space-y-1">
                  <span className="text-[11px] font-bold text-foreground block truncate">{m.moduleName}</span>
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-muted-foreground text-[10px]">Total Events</span>
                    <span className="font-extrabold text-primary">{m.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* User Management Table */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3">
            <div>
              <h3 className="font-display text-sm font-bold text-foreground">{t.adm_user_roster}</h3>
              <p className="text-xs text-muted-foreground">
                Inspect registered users, activity counts, and promote or demote permissions.
              </p>
            </div>

            <div className="relative w-72">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.adm_search_users}
                className="pl-8 text-xs"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="pb-3 font-semibold">User</th>
                  <th className="pb-3 font-semibold">Email</th>
                  <th className="pb-3 font-semibold">Role</th>
                  <th className="pb-3 font-semibold">Registered</th>
                  <th className="pb-3 font-semibold">Activities</th>
                  <th className="pb-3 font-semibold">Change Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {allUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/20">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={u.profileImage || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.fullName}`}
                          alt=""
                          className="h-7 w-7 rounded-lg border border-border bg-muted shrink-0"
                        />
                        <span className="font-bold text-foreground">{u.fullName}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground font-mono text-[11px]">{u.email}</td>
                    <td className="py-3 pr-4">
                      <Badge
                        variant="outline"
                        className={`text-[9px] uppercase font-bold ${
                          u.role === "admin"
                            ? "border-primary text-primary bg-primary/10"
                            : u.role === "editor"
                              ? "border-blue-500 text-blue-600 bg-blue-500/10"
                              : "border-muted text-muted-foreground"
                        }`}
                      >
                        {u.role}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground font-mono text-[11px]">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 pr-4 font-bold text-foreground">{u.activityCount}</td>
                    <td className="py-3">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="rounded border border-input bg-background px-2 py-1 text-[11px] font-semibold text-foreground focus:ring-1 focus:ring-primary"
                      >
                        <option value="user">User</option>
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Global Recent Activity Audit Stream */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <h3 className="font-display text-sm font-bold text-foreground">
                Platform-Wide Recent Activity Audit Stream
              </h3>
            </div>
            <span className="text-xs text-muted-foreground">Latest 25 events</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="pb-3 font-semibold">Timestamp</th>
                  <th className="pb-3 font-semibold">User</th>
                  <th className="pb-3 font-semibold">Action Description</th>
                  <th className="pb-3 font-semibold">Module</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentActivities.map((act) => (
                  <tr key={act.id} className="hover:bg-muted/20">
                    <td className="py-2.5 text-muted-foreground text-[10px]">
                      {new Date(act.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2.5 font-bold text-foreground text-[11px]">
                      {act.userName} ({act.userEmail})
                    </td>
                    <td className="py-2.5 text-foreground">{act.activityDescription}</td>
                    <td className="py-2.5">
                      <Badge variant="outline" className="text-[9px] uppercase font-mono">
                        {act.moduleName}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PromptIQLayout>
  );
}
