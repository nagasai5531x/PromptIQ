import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  History,
  Search,
  Download,
  Filter,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Activity,
  Layers,
  Sparkles,
  ShieldAlert,
  ArrowUpDown,
  Lock,
} from "lucide-react";
import { useAuth } from "@/lib/auth.context";
import { useLang } from "@/lib/i18n";
import { getUserActivitiesFn, type UserActivityRecord } from "@/lib/auth.functions";
import { PromptIQLayout } from "./PromptIQLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const MODULE_OPTIONS = [
  "ALL",
  "Quality Checker",
  "Prompt Builder",
  "Multi-Model",
  "AI Benchmark",
  "Attack Simulator",
  "Visual Workflow",
  "Workspace & Teams",
  "Marketplace",
  "Developer API",
  "Authentication",
  "Profile",
];

const ACTIVITY_TYPE_OPTIONS = [
  "ALL",
  "USER_REGISTRATION",
  "USER_LOGIN",
  "USER_LOGOUT",
  "PROMPT_ANALYSIS",
  "PROMPT_OPTIMIZE",
  "BEFORE_AFTER_COMPARISON",
  "PROMPT_BUILDER_GENERATE",
  "SECURITY_SCAN",
  "ATTACK_SIMULATION",
  "MULTI_MODEL_COMPARE",
  "AI_EVALUATION",
  "AB_TEST_RUN",
  "WORKFLOW_SAVE",
  "WORKFLOW_EXECUTE",
  "TEAM_SHARE_PROMPT",
  "MARKETPLACE_PUBLISH",
  "MARKETPLACE_REVIEW",
  "API_CALL_EXECUTE",
  "PROFILE_UPDATE",
  "PASSWORD_CHANGE",
];

export function ActivityHistoryPage() {
  const { sessionToken, isAuthenticated } = useAuth();
  const { t } = useLang();
  const getActivitiesFn = useServerFn(getUserActivitiesFn);

  const [activities, setActivities] = useState<UserActivityRecord[]>([]);
  const [search, setSearch] = useState("");
  const [selectedModule, setSelectedModule] = useState("ALL");
  const [selectedType, setSelectedType] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (sessionToken) {
      loadActivities();
    }
  }, [sessionToken, search, selectedModule, selectedType, page]);

  const loadActivities = async () => {
    if (!sessionToken) return;
    setIsLoading(true);

    try {
      const res = await getActivitiesFn({
        data: {
          sessionToken,
          search: search.trim() || undefined,
          moduleName: selectedModule === "ALL" ? undefined : selectedModule,
          activityType: selectedType === "ALL" ? undefined : selectedType,
          page,
          pageSize: 15,
        },
      });

      if (res.ok) {
        setActivities(res.activities);
        setTotalPages(res.totalPages || 1);
        setTotalCount(res.totalCount || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCsv = () => {
    if (activities.length === 0) return;

    const headers = ["Timestamp", "Date", "Time", "Activity Type", "Description", "Module", "Metadata"];
    const rows = activities.map((a) => {
      const d = new Date(a.createdAt);
      return [
        a.createdAt,
        d.toLocaleDateString(),
        d.toLocaleTimeString(),
        `"${a.activityType.replace(/"/g, '""')}"`,
        `"${a.activityDescription.replace(/"/g, '""')}"`,
        `"${a.moduleName.replace(/"/g, '""')}"`,
        `"${(a.metadata || "").replace(/"/g, '""')}"`,
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `promptiq-activity-export-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isAuthenticated) {
    return (
      <PromptIQLayout
        title="Activity Audit History"
        subtitle="Sign in to view your complete prompt optimization and account activity logs."
      >
        <div className="rounded-2xl border border-dashed border-border p-12 text-center max-w-md mx-auto space-y-4">
          <Lock className="h-10 w-10 text-muted-foreground mx-auto" />
          <h3 className="font-display text-lg font-bold">Authentication Required</h3>
          <p className="text-xs text-muted-foreground">Please sign in to inspect your personal activity history.</p>
          <Link to="/login">
            <Button size="sm" className="text-xs">
              Sign In
            </Button>
          </Link>
        </div>
      </PromptIQLayout>
    );
  }

  return (
    <PromptIQLayout
      title={t.act_title}
      subtitle={t.act_sub}
    >
      <div className="space-y-6">
        {/* Controls: Search, Filters, and CSV Export */}
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={t.act_search_placeholder}
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedModule}
              onChange={(e) => {
                setSelectedModule(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground focus:ring-1 focus:ring-primary"
            >
              {MODULE_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m === "ALL" ? t.act_all_modules : m}
                </option>
              ))}
            </select>

            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground focus:ring-1 focus:ring-primary"
            >
              {ACTIVITY_TYPE_OPTIONS.map((typeOption) => (
                <option key={typeOption} value={typeOption}>
                  {typeOption === "ALL" ? t.act_all_types : typeOption}
                </option>
              ))}
            </select>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={activities.length === 0}
              className="gap-1.5 text-xs font-semibold"
            >
              <Download className="h-3.5 w-3.5" />
              {t.act_export_csv}
            </Button>
          </div>
        </div>

        {/* Activity Table */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              <h3 className="font-display text-sm font-bold text-foreground">
                {t.act_col_activity} ({totalCount})
              </h3>
            </div>
            <span className="text-xs text-muted-foreground">{t.act_page} {page} / {totalPages}</span>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-xs text-muted-foreground animate-pulse">
              Loading activity records from database...
            </div>
          ) : activities.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              {t.act_empty}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="pb-3 font-semibold">{t.act_col_date}</th>
                    <th className="pb-3 font-semibold">{t.act_col_activity}</th>
                    <th className="pb-3 font-semibold">Type</th>
                    <th className="pb-3 font-semibold">{t.act_col_module}</th>
                    <th className="pb-3 font-semibold">Metadata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {activities.map((act) => (
                    <tr key={act.id} className="hover:bg-muted/20">
                      <td className="py-3 pr-4 whitespace-nowrap text-muted-foreground font-mono text-[11px]">
                        <div>{new Date(act.createdAt).toLocaleDateString()}</div>
                        <div className="text-[10px] text-muted-foreground/70">{new Date(act.createdAt).toLocaleTimeString()}</div>
                      </td>
                      <td className="py-3 pr-4 font-bold text-foreground max-w-xs truncate">
                        {act.activityDescription}
                      </td>
                      <td className="py-3 pr-4 font-mono text-[10px] text-primary">
                        {act.activityType}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant="outline" className="text-[10px] uppercase font-mono">
                          {act.moduleName}
                        </Badge>
                      </td>
                      <td className="py-3 text-muted-foreground max-w-xs truncate font-mono text-[10px]">
                        {act.metadata && act.metadata !== "{}" ? act.metadata : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isLoading}
                className="gap-1 text-xs"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> {t.act_prev}
              </Button>

              <span className="text-xs text-muted-foreground">
                {t.act_page} <span className="font-bold text-foreground">{page}</span> /{" "}
                <span className="font-bold text-foreground">{totalPages}</span>
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || isLoading}
                className="gap-1 text-xs"
              >
                {t.act_next} <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </PromptIQLayout>
  );
}
