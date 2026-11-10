import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  User,
  Mail,
  Lock,
  Save,
  ShieldAlert,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Clock,
  KeyRound,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/lib/auth.context";
import { useLang } from "@/lib/i18n";
import {
  updateProfileFn,
  changePasswordFn,
  revokeOtherSessionsFn,
} from "@/lib/auth.functions";
import { PromptIQLayout } from "./PromptIQLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export function ProfileSettingsPage() {
  const { user, sessionToken, logout, refreshUser, isAuthenticated } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();

  const updateProfileServerFn = useServerFn(updateProfileFn);
  const changePasswordServerFn = useServerFn(changePasswordFn);
  const revokeOtherSessionsServerFn = useServerFn(revokeOtherSessionsFn);

  // Profile Edit State
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [profileImage, setProfileImage] = useState(user?.profileImage || "");
  const [profileNotice, setProfileNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [revokeOthers, setRevokeOthers] = useState(true);
  const [passwordNotice, setPasswordNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Session revoke notice
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionToken || !fullName.trim()) return;

    setIsUpdatingProfile(true);
    setProfileNotice(null);

    try {
      const res = await updateProfileServerFn({
        data: {
          sessionToken,
          fullName: fullName.trim(),
          profileImage: profileImage.trim() || undefined,
        },
      });

      if (res.ok) {
        await refreshUser();
        setProfileNotice({ type: "success", text: "Profile updated successfully!" });
      } else {
        setProfileNotice({ type: "error", text: res.message || "Failed to update profile." });
      }
    } catch (err: any) {
      setProfileNotice({ type: "error", text: err.message || "Error updating profile." });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionToken) return;

    setIsChangingPassword(true);
    setPasswordNotice(null);

    try {
      const res = await changePasswordServerFn({
        data: {
          sessionToken,
          currentPassword,
          newPassword,
          confirmNewPassword,
          revokeOtherSessions: revokeOthers,
        },
      });

      if (res.ok) {
        setPasswordNotice({ type: "success", text: "Password changed successfully! Other sessions revoked." });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
      } else {
        setPasswordNotice({ type: "error", text: res.message || "Failed to change password." });
      }
    } catch (err: any) {
      setPasswordNotice({ type: "error", text: err.message || "Error changing password." });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleRevokeOtherSessions = async () => {
    if (!sessionToken) return;
    if (!confirm("Are you sure you want to log out from all other browsers and devices?")) return;

    try {
      const res = await revokeOtherSessionsServerFn({ data: { sessionToken } });
      if (res.ok) {
        setSessionNotice(`Successfully revoked ${res.revokedCount} other active session(s).`);
        setTimeout(() => setSessionNotice(null), 4000);
      }
    } catch (err: any) {
      alert(err.message || "Failed to revoke other sessions.");
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate({ to: "/login" });
  };

  if (!isAuthenticated) {
    return (
      <PromptIQLayout title="Account Settings" subtitle="Please sign in to view your profile.">
        <div className="rounded-2xl border border-dashed border-border p-12 text-center max-w-md mx-auto space-y-4">
          <User className="h-10 w-10 text-muted-foreground mx-auto" />
          <h3 className="font-display text-lg font-bold">Authentication Required</h3>
          <p className="text-xs text-muted-foreground">Sign in to manage your user profile and security credentials.</p>
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
      title={t.prof_title}
      subtitle={t.prof_sub}
    >
      <div className="space-y-6 max-w-4xl">
        {/* Profile Card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-4 border-b border-border pb-4">
            <img
              src={user?.profileImage || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.fullName || "user"}`}
              alt="User Avatar"
              className="h-16 w-16 rounded-2xl border border-border bg-muted shrink-0"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-lg font-bold text-foreground">{user?.fullName}</h3>
                <Badge variant="outline" className="text-[10px] uppercase font-bold text-primary border-primary/30">
                  {user?.role}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{user?.email}</p>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-2">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> {t.dash_member_since}: {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "2026"}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {t.dash_last_login}: {user?.lastLogin ? new Date(user.lastLogin).toLocaleTimeString() : "Now"}
                </span>
              </div>
            </div>
          </div>

          {profileNotice && (
            <div
              className={`flex items-center gap-2 rounded-xl p-3 text-xs ${
                profileNotice.type === "success"
                  ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                  : "border border-destructive/30 bg-destructive/10 text-destructive"
              }`}
            >
              {profileNotice.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <span>{profileNotice.text}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-foreground">{t.prof_name_label}</label>
                <Input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">{t.prof_avatar_label}</label>
                <Input
                  type="text"
                  value={profileImage}
                  onChange={(e) => setProfileImage(e.target.value)}
                  placeholder="https://..."
                  className="mt-1 text-xs font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={isUpdatingProfile || !fullName.trim()} className="gap-2 text-xs">
                <Save className="h-3.5 w-3.5" />
                {isUpdatingProfile ? "Saving Profile..." : t.prof_save_changes}
              </Button>
            </div>
          </form>
        </div>

        {/* Change Password Card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
          <div className="border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              <h3 className="font-display text-sm font-bold text-foreground">{t.prof_change_password}</h3>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Ensure your new password uses at least 8 characters with numbers, lowercase, and uppercase letters.
            </p>
          </div>

          {passwordNotice && (
            <div
              className={`flex items-center gap-2 rounded-xl p-3 text-xs ${
                passwordNotice.type === "success"
                  ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                  : "border border-destructive/30 bg-destructive/10 text-destructive"
              }`}
            >
              {passwordNotice.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <span>{passwordNotice.text}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-foreground">{t.prof_current_pass}</label>
              <Input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="mt-1 text-xs font-mono"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-foreground">{t.prof_new_pass}</label>
                <Input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters..."
                  className="mt-1 text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">{t.prof_confirm_new_pass}</label>
                <Input
                  type="password"
                  required
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="mt-1 text-xs font-mono"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={revokeOthers}
                onChange={(e) => setRevokeOthers(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary"
              />
              <span>{t.prof_revoke_desc}</span>
            </label>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={isChangingPassword || !currentPassword || !newPassword || newPassword !== confirmNewPassword}
                className="gap-2 text-xs"
              >
                <Lock className="h-3.5 w-3.5" />
                {isChangingPassword ? "Updating Password..." : t.prof_change_password}
              </Button>
            </div>
          </form>
        </div>

        {/* Sessions & Logout Actions */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h3 className="font-display text-sm font-bold text-foreground">{t.prof_revoke_sessions}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t.prof_revoke_desc}
              </p>
            </div>
          </div>

          {sessionNotice && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-700">
              {sessionNotice}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-1">
            <div>
              <p className="text-xs font-semibold text-foreground">{t.prof_revoke_sessions}</p>
              <p className="text-[11px] text-muted-foreground">
                {t.prof_revoke_desc}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleRevokeOtherSessions} className="text-xs">
              {t.prof_revoke_sessions}
            </Button>
          </div>

          <div className="border-t border-border pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-destructive">{t.prof_signout}</p>
              <p className="text-[11px] text-muted-foreground">Ends your current session on this browser.</p>
            </div>
            <Button variant="destructive" size="sm" onClick={handleLogout} className="gap-1.5 text-xs font-semibold">
              <LogOut className="h-3.5 w-3.5" />
              {t.sign_out}
            </Button>
          </div>
        </div>
      </div>
    </PromptIQLayout>
  );
}
