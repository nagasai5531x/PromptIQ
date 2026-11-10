import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  UserPlus,
  Mail,
  Lock,
  User,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
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

export function RegisterPage() {
  const { register, isAuthenticated } = useAuth();
  const { t, lang, setLang } = useLang();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password strength checks
  const hasLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumberOrSymbol = /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
  const passwordsMatch = password && confirmPassword && password === confirmPassword;
  const isFormValid = fullName.trim().length >= 2 && email.includes("@") && hasLength && hasUpper && hasLower && hasNumberOrSymbol && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!fullName.trim() || fullName.trim().length < 2) {
      setErrorMsg("Please enter your full name (at least 2 characters).");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }
    if (!hasLength || !hasUpper || !hasLower || !hasNumberOrSymbol) {
      setErrorMsg("Password must meet all complexity requirements.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await register(fullName.trim(), email.trim(), password, confirmPassword);
      if (res.ok) {
        navigate({ to: "/dashboard" });
      } else {
        setErrorMsg(res.message || "Registration failed.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Registration failed.");
    } finally {
      setIsSubmitting(false);
    }
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
          <h2 className="mt-4 font-display text-2xl font-extrabold text-foreground">{t.auth_signup_title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {t.auth_signup_sub}
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
              <label className="text-xs font-semibold text-foreground">{t.auth_full_name}</label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="pl-9 text-xs"
                />
              </div>
            </div>

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
                  placeholder="At least 8 characters..."
                  className="pl-9 text-xs font-mono"
                />
              </div>

              {/* Password Requirements Checklist */}
              {password.length > 0 && (
                <div className="mt-2 space-y-1 rounded-lg bg-muted/30 p-2.5 text-[11px]">
                  <p className="font-semibold text-muted-foreground mb-1">Password Requirements:</p>
                  <div className="grid grid-cols-2 gap-1 text-[10px]">
                    <span className={`flex items-center gap-1 ${hasLength ? "text-emerald-600 font-bold" : "text-muted-foreground"}`}>
                      <CheckCircle2 className="h-3 w-3" /> 8+ Characters
                    </span>
                    <span className={`flex items-center gap-1 ${hasUpper ? "text-emerald-600 font-bold" : "text-muted-foreground"}`}>
                      <CheckCircle2 className="h-3 w-3" /> 1+ Uppercase
                    </span>
                    <span className={`flex items-center gap-1 ${hasLower ? "text-emerald-600 font-bold" : "text-muted-foreground"}`}>
                      <CheckCircle2 className="h-3 w-3" /> 1+ Lowercase
                    </span>
                    <span className={`flex items-center gap-1 ${hasNumberOrSymbol ? "text-emerald-600 font-bold" : "text-muted-foreground"}`}>
                      <CheckCircle2 className="h-3 w-3" /> Number or Symbol
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground">{t.auth_confirm_password}</label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password..."
                  className="pl-9 text-xs font-mono"
                />
              </div>
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="mt-1 text-[11px] text-destructive">Passwords do not match</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || !isFormValid}
              className="w-full gap-2 font-semibold shadow-sm text-xs mt-2"
            >
              <UserPlus className="h-4 w-4" />
              {isSubmitting ? "Creating Account..." : t.auth_signup_btn}
            </Button>
          </form>

          <div className="text-center text-xs text-muted-foreground pt-2 border-t border-border">
            {t.auth_have_account}{" "}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              {t.auth_signin_btn}
            </Link>
          </div>
        </div>

        {/* Security Assurance Banner */}
        <div className="flex items-center justify-center gap-2 text-center text-[11px] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          <span>Encrypted with memory-hard scrypt hashing. Zero plain-text storage.</span>
        </div>
      </div>
    </div>
  );
}
