import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Sparkles,
  Gauge,
  ShieldAlert,
  Layers,
  Clock,
  Calendar,
  Activity,
  ArrowRight,
  TrendingUp,
  FileText,
  User,
  Plus,
  Zap,
  Cpu,
  GitBranch,
  Globe,
  Languages,
} from "lucide-react";
import { useAuth } from "@/lib/auth.context";
import { useLang } from "@/lib/i18n";
import { getUserDashboardStatsFn } from "@/lib/auth.functions";
import { getMultilingualDashboardStatsFn } from "@/lib/multilingual.functions";
import { PromptIQLayout } from "./PromptIQLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function UserDashboardPage() {
  const { user, sessionToken, isAuthenticated } = useAuth();
  const { t } = useLang();
  const getStatsFn = useServerFn(getUserDashboardStatsFn);
  const getMlStatsFn = useServerFn(getMultilingualDashboardStatsFn);

  const [stats, setStats] = useState<any>(null);
  const [mlStats, setMlStats] = useState<any>(null);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [savedPrompts, setSavedPrompts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [sessionToken]);

  const loadDashboardData = async () => {
    if (!sessionToken) {
      setIsLoading(false);
      return;
    }

    try {
      const [res, mlRes] = await Promise.all([
        getStatsFn({ data: { sessionToken } }),
        getMlStatsFn({ data: {} }),
      ]);
      if (res.ok && res.stats) {
        setStats(res.stats);
        setRecentActivities(res.recentActivities || []);
        setSavedPrompts(res.savedPrompts || []);
      }
      if (mlRes.ok && mlRes.stats) {
        setMlStats(mlRes.stats);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated && !isLoading) {
    return (
      <PromptIQLayout
        title={t.dash_title}
        subtitle={t.dash_sub}
      >
        <div className="rounded-2xl border border-dashed border-border p-12 text-center max-w-md mx-auto space-y-4">
          <User className="h-10 w-10 text-muted-foreground mx-auto" />
          <div>
            <h3 className="font-display text-lg font-bold text-foreground">{t.sign_in}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {t.auth_signin_sub}
            </p>
          </div>
          <div className="flex justify-center gap-3 pt-2">
            <Link to="/login">
              <Button size="sm" className="text-xs">
                {t.sign_in}
              </Button>
            </Link>
            <Link to="/register">
              <Button size="sm" variant="outline" className="text-xs">
                {t.auth_signup_btn}
              </Button>
            </Link>
          </div>
        </div>
      </PromptIQLayout>
    );
  }

  return (
    <PromptIQLayout
      title={`${t.dash_welcome}, ${user?.fullName || "Prompt Specialist"} 👋`}
      subtitle={`${t.dash_member_since}: ${user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "2026"} · ${t.dash_role}: ${user?.role || "user"}`}
    >
      <div className="space-y-6">
        {/* Top 4 Real Telemetry Metrics Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">{t.dash_prompts_analyzed}</span>
              <Gauge className="h-4 w-4 text-primary" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-foreground">{stats?.totalAnalyses ?? 0}</span>
              <span className="text-[11px] text-muted-foreground">runs</span>
            </div>
            <p className="text-[11px] text-muted-foreground">Heuristic 5-criteria quality checks</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">{t.dash_prompts_optimized}</span>
              <Sparkles className="h-4 w-4 text-purple-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-purple-600">{stats?.totalOptimizations ?? 0}</span>
              <span className="text-[11px] text-muted-foreground">enhanced</span>
            </div>
            <p className="text-[11px] text-muted-foreground">AI rewrites & structured improvements</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">{t.dash_security_scans}</span>
              <ShieldAlert className="h-4 w-4 text-red-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-emerald-600">{stats?.totalSecurityChecks ?? 0}</span>
              <span className="text-[11px] text-muted-foreground">scanned</span>
            </div>
            <p className="text-[11px] text-muted-foreground">Injection defenses & secret redaction</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">{t.dash_benchmarks}</span>
              <Layers className="h-4 w-4 text-blue-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-blue-600">{stats?.totalEvaluations ?? 0}</span>
              <span className="text-[11px] text-muted-foreground">evaluated</span>
            </div>
            <p className="text-[11px] text-muted-foreground">6-dimension prompt test matrices</p>
          </div>
        </div>

        {/* Quick Launchpad Actions */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3">
          <h3 className="font-display text-sm font-bold text-foreground">{t.dash_quick_launch}</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Link
              to="/"
              className="flex items-center gap-2.5 rounded-xl border border-border bg-muted/20 p-3 text-xs font-semibold text-foreground transition hover:border-primary hover:bg-muted/40"
            >
              <Gauge className="h-4 w-4 text-primary" />
              <span>{t.nav_checker}</span>
            </Link>
            <Link
              to="/multi-model"
              className="flex items-center gap-2.5 rounded-xl border border-border bg-muted/20 p-3 text-xs font-semibold text-foreground transition hover:border-primary hover:bg-muted/40"
            >
              <Cpu className="h-4 w-4 text-purple-500" />
              <span>{t.nav_multimodel}</span>
            </Link>
            <Link
              to="/attack-simulator"
              className="flex items-center gap-2.5 rounded-xl border border-border bg-muted/20 p-3 text-xs font-semibold text-foreground transition hover:border-primary hover:bg-muted/40"
            >
              <ShieldAlert className="h-4 w-4 text-red-500" />
              <span>{t.nav_simulator}</span>
            </Link>
            <Link
              to="/workflow"
              className="flex items-center gap-2.5 rounded-xl border border-border bg-muted/20 p-3 text-xs font-semibold text-foreground transition hover:border-primary hover:bg-muted/40"
            >
              <GitBranch className="h-4 w-4 text-cyan-500" />
              <span>{t.nav_workflow}</span>
            </Link>
          </div>
        </div>

        {/* Recent Activities & Saved Prompts Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Recent User Activities */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <h3 className="font-display text-sm font-bold text-foreground">{t.dash_recent_activity}</h3>
              </div>
              <Link to="/activity-history" className="text-xs font-semibold text-primary hover:underline">
                {t.dash_view_all_history} →
              </Link>
            </div>

            {recentActivities.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">{t.dash_empty_activity}</p>
            ) : (
              <div className="space-y-3">
                {recentActivities.map((act) => (
                  <div
                    key={act.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-border bg-muted/10 p-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">{act.activityDescription}</span>
                        <Badge variant="outline" className="text-[9px] uppercase font-mono">
                          {act.moduleName}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-[10px] text-muted-foreground font-mono">
                        {act.activityType} · {new Date(act.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {new Date(act.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Account Overview & Session Telemetry */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                <h3 className="font-display text-sm font-bold text-foreground">Account & Session Telemetry</h3>
              </div>
              <Link to="/profile" className="text-xs font-semibold text-primary hover:underline">
                Manage Profile →
              </Link>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between rounded-xl bg-muted/20 p-3">
                <span className="text-muted-foreground">Account Email</span>
                <span className="font-semibold text-foreground">{user?.email}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-muted/20 p-3">
                <span className="text-muted-foreground">Account Role</span>
                <Badge variant="outline" className="font-bold uppercase text-[10px] text-primary border-primary/30">
                  {user?.role || "user"}
                </Badge>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-muted/20 p-3">
                <span className="text-muted-foreground">Account Created</span>
                <span className="font-semibold text-foreground">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleString() : "Recently"}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-muted/20 p-3">
                <span className="text-muted-foreground">Active Browser Sessions</span>
                <span className="font-bold text-emerald-600">{stats?.activeSessionsCount ?? 1} Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Multilingual & Romanized Language Telemetry */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Languages className="h-5 w-5 text-primary" />
              <div>
                <h3 className="font-display text-sm font-bold text-foreground">
                  Multilingual & Romanized Intelligence Telemetry
                </h3>
                <p className="text-xs text-muted-foreground">
                  Language breakdown, Romanized vs Native script distribution, and fairness benchmarks
                </p>
              </div>
            </div>
            <Badge variant="outline" className="border-primary/40 bg-primary/5 text-primary text-xs">
              20 Languages Supported
            </Badge>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Writing Style Distribution */}
            <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Writing Style Breakdown
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Romanized (Latin Letters):</span>
                  <span className="font-bold text-foreground">{mlStats?.styleBreakdown?.romanized ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Native Script:</span>
                  <span className="font-bold text-foreground">{mlStats?.styleBreakdown?.native_script ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mixed Code-Switching:</span>
                  <span className="font-bold text-foreground">{mlStats?.styleBreakdown?.mixed ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">English:</span>
                  <span className="font-bold text-foreground">{mlStats?.styleBreakdown?.english ?? 0}</span>
                </div>
              </div>
            </div>

            {/* Top Used Languages */}
            <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3 md:col-span-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Top Detected Languages & Avg Quality Scores
              </h4>
              {!mlStats?.topLanguages || mlStats.topLanguages.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">
                  No multilingual prompts recorded yet. Enter a prompt in Telugu, Hindi, Tamil or other languages to start tracking.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 text-xs">
                  {mlStats.topLanguages.map((l: any, idx: number) => (
                    <div key={idx} className="rounded-lg border border-border bg-card p-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">{l.language}</span>
                        <span className="font-mono text-[11px] text-muted-foreground">{l.count} runs</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">Avg Score:</span>
                        <span className="font-bold text-primary">{l.avgScore}/100</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Multilingual Prompts */}
          {mlStats?.recentPrompts && mlStats.recentPrompts.length > 0 && (
            <div className="space-y-3 border-t border-border pt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Recent Multilingual Prompts
              </h4>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {mlStats.recentPrompts.map((p: any) => (
                  <div key={p.id} className="rounded-xl border border-border bg-muted/10 p-3 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-primary">{p.detected_language}</span>
                      <Badge variant="outline" className="text-[9px] uppercase font-mono">
                        {p.writing_style?.replace("_", " ")}
                      </Badge>
                    </div>
                    <p className="line-clamp-2 text-muted-foreground font-mono text-[11px]">
                      "{p.original_prompt}"
                    </p>
                    <div className="flex items-center justify-between pt-1 text-[10px] text-muted-foreground border-t border-border/50">
                      <span>Score: <strong className="text-foreground">{p.overall_score}/100</strong></span>
                      <span>{new Date(p.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </PromptIQLayout>
  );
}
