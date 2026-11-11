import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  Gauge,
  Cpu,
  Layers,
  Sparkles,
  ShieldAlert,
  GitBranch,
  BookOpen,
  Users,
  ShoppingBag,
  Code2,
  BarChart3,
  Menu,
  X,
  Languages,
  CheckCircle2,
  ChevronDown,
  User as UserIcon,
  LogOut,
  Building2,
  ExternalLink,
  LayoutDashboard,
  History,
  Settings,
  ShieldCheck,
  LogIn,
  UserPlus,
  FileText,
  Sun,
  Moon,
} from "lucide-react";
import { useLang } from "@/lib/i18n";
import { useAuth } from "@/lib/auth.context";
import { useTheme } from "@/lib/theme.context";
import { Button } from "@/components/ui/button";

export function PromptIQLayout({
  title,
  subtitle,
  children,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const { t, lang, setLang } = useLang();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const handleSignOut = async () => {
    await logout();
    navigate({ to: "/login" });
  };

  const navGroups = [
    {
      group: t.grp_user_workspace,
      items: [
        { to: "/dashboard", label: t.nav_dashboard, icon: LayoutDashboard, badge: "Live" },
        { to: "/activity-history", label: t.nav_activity_audit, icon: History },
        { to: "/profile", label: t.nav_profile, icon: Settings },
      ],
    },
    ...(isAdmin
      ? [
          {
            group: t.grp_administration,
            items: [
              { to: "/admin", label: t.nav_admin, icon: ShieldCheck, badge: "Admin" },
            ],
          },
        ]
      : []),
    {
      group: t.grp_prompt_eng,
      items: [
        { to: "/", label: t.nav_checker, icon: Gauge },
        { to: "/multi-model", label: t.nav_multimodel, icon: Cpu, badge: "New" },
        { to: "/builder", label: t.nav_builder, icon: Sparkles },
      ],
    },
    {
      group: t.grp_benchmark_eval,
      items: [
        { to: "/evaluator", label: t.nav_evaluator, icon: Layers, badge: "AI" },
        { to: "/ab-test", label: t.nav_ab, icon: GitBranch },
        { to: "/test-inputs", label: "Test Inputs", icon: FileText },
      ],
    },
    {
      group: t.grp_security_defense,
      items: [
        { to: "/security", label: t.nav_security, icon: ShieldAlert },
        { to: "/attack-simulator", label: t.nav_simulator, icon: ShieldAlert, badge: "Shield" },
      ],
    },
    {
      group: t.grp_automation_wf,
      items: [
        { to: "/workflow", label: t.nav_workflow, icon: GitBranch, badge: "Nodes" },
      ],
    },
    {
      group: t.grp_collab,
      items: [
        { to: "/library", label: t.nav_library, icon: BookOpen },
        { to: "/teams", label: t.nav_teams, icon: Users },
        { to: "/marketplace", label: t.nav_marketplace, icon: ShoppingBag, badge: "Hub" },
      ],
    },
    {
      group: t.grp_developer_api,
      items: [
        { to: "/api-portal", label: t.nav_api_portal, icon: Code2 },
        { to: "/analytics", label: t.nav_analytics, icon: BarChart3 },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-border bg-card/85 px-4 backdrop-blur md:px-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle Navigation Menu"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          <Link to="/" className="flex items-center gap-2.5 font-display text-lg font-extrabold tracking-tight">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Gauge className="h-5 w-5" />
            </span>
            <span className="flex items-baseline gap-1">
              <span>Prompt<span className="text-primary">IQ</span></span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">SaaS</span>
            </span>
          </Link>

          <span className="hidden text-xs text-muted-foreground sm:inline-block">·</span>
          <div className="hidden items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-2.5 py-1 text-xs sm:flex">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-semibold text-foreground">Prompt Engineering Core</span>
            <span className="rounded bg-primary/10 px-1 py-0.2 text-[10px] font-bold text-primary">v2.0</span>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            className="h-8 gap-1.5 px-2.5 text-xs font-semibold transition hover:border-primary/50"
          >
            {theme === "dark" ? (
              <>
                <Sun className="h-3.5 w-3.5 text-amber-400" />
                <span className="hidden sm:inline">Light</span>
              </>
            ) : (
              <>
                <Moon className="h-3.5 w-3.5 text-indigo-400" />
                <span className="hidden sm:inline">Dark</span>
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setLang(lang === "en" ? "te" : "en")}
            className="h-8 text-xs font-semibold"
          >
            <Languages className="h-3.5 w-3.5" />
            {lang === "en" ? "తెలుగు" : "English"}
          </Button>

          {isAuthenticated && user ? (
            <div className="flex items-center gap-2">
              <Link to="/profile" className="flex items-center gap-2 rounded-xl border border-border bg-card p-1 pr-2.5 transition hover:bg-muted/30">
                <img
                  src={user.profileImage || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.fullName}`}
                  alt="User Avatar"
                  className="h-7 w-7 rounded-lg border border-border bg-muted shrink-0"
                />
                <div className="hidden text-left sm:block">
                  <p className="text-xs font-semibold leading-none">{user.fullName}</p>
                  <p className="text-[10px] text-muted-foreground leading-none mt-0.5">{user.email}</p>
                </div>
                <span className="hidden rounded bg-primary/10 px-1 py-0.2 text-[9px] font-bold uppercase text-primary sm:inline-block">
                  {user.role}
                </span>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSignOut}
                title={t.sign_out}
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
                  <LogIn className="h-3.5 w-3.5" />
                  {t.sign_in}
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm" className="gap-1.5 text-xs font-semibold">
                  <UserPlus className="h-3.5 w-3.5" />
                  {t.auth_signup_btn}
                </Button>
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Main SaaS Shell: Sidebar + Content */}
      <div className="flex">
        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-background/80 backdrop-blur-sm md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Left Sidebar (Sticky on Desktop) */}
        <aside
          className={`fixed inset-y-0 left-0 z-30 flex w-64 shrink-0 flex-col border-r border-border bg-card transition-transform duration-300 md:sticky md:top-16 md:h-[calc(100vh-4rem)] md:translate-x-0 pt-16 md:pt-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex-1 overflow-y-auto px-3 py-4">
            {navGroups.map((group, idx) => (
              <div key={idx} className="mb-5">
                <p className="mb-2 px-2 text-[10px] font-bold tracking-wider text-muted-foreground">
                  {group.group}
                </p>
                <nav className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.to === "/" ? currentPath === "/" : currentPath === item.to || currentPath.startsWith(item.to + "/");
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setSidebarOpen(false)}
                        className={`group flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-semibold transition ${
                          isActive
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <Icon className={`h-4 w-4 ${isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"}`} />
                          <span>{item.label}</span>
                        </span>
                        {item.badge && (
                          <span
                            className={`rounded-full px-1.5 py-0.2 text-[9px] font-bold ${
                              isActive
                                ? "bg-white/20 text-white"
                                : "bg-primary/10 text-primary"
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </nav>
              </div>
            ))}
          </div>

          <div className="border-t border-border p-3 text-xs text-muted-foreground">
            {isAuthenticated ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground text-[11px] truncate">{user?.fullName}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">
                    {user?.role === "admin" ? t.admin_access : user?.role === "editor" ? t.editor_access : user?.role === "viewer" ? t.viewer_access : t.user_access}
                  </p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="text-muted-foreground hover:text-destructive text-[11px] font-semibold"
                >
                  {t.sign_out}
                </button>
              </div>
            ) : (
              <div>
                <p className="font-medium text-foreground">PromptIQ Enterprise</p>
                <p className="text-[10px] text-muted-foreground">B.Tech CSE Mini Project</p>
              </div>
            )}
          </div>
        </aside>

        {/* Content View */}
        <main className="min-w-0 flex-1 px-4 py-8 md:px-8">
          {(title || subtitle) && (
            <div className="mb-8 border-b border-border pb-6">
              {title && <h1 className="font-display text-2xl font-extrabold md:text-3xl">{title}</h1>}
              {subtitle && <p className="mt-1.5 text-xs text-muted-foreground">{subtitle}</p>}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
