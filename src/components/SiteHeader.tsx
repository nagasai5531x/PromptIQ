import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Gauge, Menu, X, Languages, LayoutDashboard, LogOut, LogIn, User } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { useAuth } from "@/lib/auth.context";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const { t, lang, setLang } = useLang();
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false);

  const handleSignOut = async () => {
    await logout();
    navigate({ to: "/login" });
  };

  const nav = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/", label: t.nav_checker || "Quality Checker" },
    { to: "/multi-model", label: "Multi-Model" },
    { to: "/builder", label: t.nav_builder || "Builder" },
    { to: "/evaluator", label: "AI Benchmark" },
    { to: "/attack-simulator", label: "Attack Simulator" },
    { to: "/workflow", label: "Workflows" },
    { to: "/teams", label: "Teams" },
    { to: "/marketplace", label: "Marketplace" },
    { to: "/api-portal", label: "API" },
    { to: "/library", label: t.nav_library || "Library" },
    { to: "/analytics", label: t.nav_analytics || "Analytics" },
  ] as const;
  const langBtn = (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setLang(lang === "en" ? "te" : "en")}
      aria-label="Switch language"
    >
      <Languages className="h-3.5 w-3.5" /> {lang === "en" ? "తెలుగు" : "English"}
    </Button>
  );
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link to={isAuthenticated ? "/dashboard" : "/login"} className="flex items-center gap-2 font-display text-lg font-extrabold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-primary-foreground"><Gauge className="h-4 w-4" /></span>
          <span className="flex items-baseline gap-1">Prompt<span className="text-primary">IQ</span></span>
        </Link>
        <nav className="hidden items-center gap-0.5 text-xs font-medium xl:flex">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} className="rounded-md px-2 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              activeProps={{ className: "bg-accent !text-accent-foreground" }} activeOptions={{ exact: true }}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {langBtn}
          {isAuthenticated ? (
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-border">
              <Link to="/profile" className="flex items-center gap-2 rounded-lg px-2 py-1 text-xs font-medium text-foreground hover:bg-muted">
                {user?.profileImage ? (
                  <img src={user.profileImage} alt={user.fullName} className="h-6 w-6 rounded-full border border-border" />
                ) : (
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                    {user?.fullName?.charAt(0) || "U"}
                  </span>
                )}
                <span className="max-w-[100px] truncate">{user?.fullName?.split(" ")[0]}</span>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleSignOut} title="Sign Out" className="text-muted-foreground hover:text-destructive text-xs">
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <Link to="/login" className="hidden sm:inline-flex">
              <Button size="sm" className="bg-primary text-primary-foreground text-xs gap-1.5">
                <LogIn className="h-3.5 w-3.5" /> Sign In
              </Button>
            </Link>
          )}
          <Button variant="ghost" size="icon" className="xl:hidden" aria-label="Toggle menu" aria-expanded={menu} onClick={() => setMenu(!menu)}>
            {menu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>
      {menu && (
        <nav className="grid grid-cols-2 border-t border-border px-4 py-2 sm:grid-cols-3 xl:hidden">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} onClick={() => setMenu(false)} className="block rounded-md px-2 py-2 text-sm font-medium"
              activeProps={{ className: "bg-accent text-accent-foreground" }} activeOptions={{ exact: true }}>
              {n.label}
            </Link>
          ))}
          {isAuthenticated ? (
            <button
              onClick={() => { setMenu(false); handleSignOut(); }}
              className="col-span-2 sm:col-span-3 mt-2 flex items-center justify-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign Out ({user?.fullName})
            </button>
          ) : (
            <Link
              to="/login"
              onClick={() => setMenu(false)}
              className="col-span-2 sm:col-span-3 mt-2 flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
            >
              <LogIn className="h-3.5 w-3.5" /> Sign In
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}

export function PageTitle({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-6 pt-10">
      <h1 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">{title}</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">{sub}</p>
    </div>
  );
}

export const btn = "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed";
export const primaryBtn = `${btn} bg-brand text-primary-foreground shadow-card hover:opacity-95`;
export const ghostBtn = `${btn} border border-border bg-card text-foreground hover:bg-muted`;
export const card = "rounded-2xl border border-border bg-card p-5 shadow-card";
export const field = "w-full rounded-xl border border-input bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring";
