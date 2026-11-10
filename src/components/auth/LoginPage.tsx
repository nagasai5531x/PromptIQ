import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  LogIn,
  Mail,
  Lock,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Sparkles,
  Eye,
  EyeOff,
  Languages,
} from "lucide-react";
import { useAuth } from "@/lib/auth.context";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginPage() {
  const { login } = useAuth();
  const { t, lang, setLang } = useLang();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email.trim() || !password) {
      setErrorMsg("Please enter both email and password.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await login(email.trim(), password, rememberMe);
      if (res.ok) {
        navigate({ to: "/dashboard" });
      } else {
        setErrorMsg(res.message || "Invalid email or password.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Login failed. Please check your credentials.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDemoAdmin = () => {
    setEmail("admin@promptiq.ai");
    setPassword("admin123");
  };

  const fillDemoMember = () => {
    setEmail("alex@promptiq.ai");
    setPassword("alex123");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-12">
      {/* Top Language Toggle */}
      <div className="absolute top-4 right-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLang(lang === "en" ? "te" : "en")}
          aria-label="Switch language"
          className="text-xs"
        >
          <Languages className="h-3.5 w-3.5 mr-1" /> {lang === "en" ? "తెలుగు" : "English"}
        </Button>
      </div>

      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center">
          <Link to="/login" className="inline-flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Sparkles className="h-5 w-5" />
            </span>
            <span>
              Prompt<span className="text-primary">IQ</span>
            </span>
          </Link>
          <h2 className="mt-4 font-display text-2xl font-extrabold text-foreground">{t.auth_signin_title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {t.auth_signin_sub}
          </p>
        </div>

        {/* Card Form */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
          {errorMsg && (
            <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-foreground">{t.auth_email}</label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="pl-9 text-xs"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">{t.auth_password}</label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your account password"
                  className="pl-9 text-xs font-mono"
                />
              </div>
            </div>

            {/* Remember me & Forgot Password */}
            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-muted-foreground select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary"
                />
                <span>{t.auth_remember_me}</span>
              </label>

              <button
                type="button"
                onClick={() => alert("Password reset link has been dispatched to your email address (simulated).")}
                className="text-primary hover:underline font-medium"
              >
                Forgot Password?
              </button>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || !email.trim() || !password}
              className="w-full gap-2 font-semibold shadow-sm text-xs mt-2"
            >
              <LogIn className="h-4 w-4" />
              {isSubmitting ? "Authenticating..." : t.auth_signin_btn}
            </Button>
          </form>

          {/* Quick Demo Credentials Autofill */}
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-3 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              {t.auth_quick_demo}
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={fillDemoAdmin}
                className="flex-1 text-[11px] h-7"
              >
                {t.auth_demo_admin}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={fillDemoMember}
                className="flex-1 text-[11px] h-7"
              >
                {t.auth_demo_member}
              </Button>
            </div>
          </div>

          <div className="text-center text-xs text-muted-foreground pt-2 border-t border-border">
            {t.auth_need_account}{" "}
            <Link to="/register" className="font-semibold text-primary hover:underline">
              {t.auth_signup_btn}
            </Link>
          </div>
        </div>

        {/* Security Assurance Banner */}
        <div className="flex items-center justify-center gap-2 text-center text-[11px] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          <span>Brute-force rate limiting active (5 attempts / 15 mins).</span>
        </div>
      </div>
    </div>
  );
}
