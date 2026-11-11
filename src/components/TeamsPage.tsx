import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Users,
  Building2,
  Plus,
  Share2,
  MessageSquare,
  ShieldCheck,
  UserCheck,
  Mail,
  Send,
  History,
  Activity,
  Copy,
  Check,
  LogIn,
  KeyRound,
  FileText,
  Clock,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import {
  loginUser,
  registerUser,
  getUserTeams,
  createTeam,
  getTeamMembers,
  inviteTeamMember,
  getTeamPrompts,
  sharePromptWithTeam,
  getPromptComments,
  addPromptComment,
  getTeamActivity,
  type Team,
  type TeamMember,
  type TeamPrompt,
  type PromptComment,
  type TeamActivity,
} from "@/lib/team.functions";
import { useLang } from "@/lib/i18n";
import { useAuth } from "@/lib/auth.context";
import { setPending } from "@/lib/history";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PromptIQLayout } from "./PromptIQLayout";

export function TeamsPage() {
  const { t } = useLang();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const getUserTeamsFn = useServerFn(getUserTeams);
  const createTeamFn = useServerFn(createTeam);
  const getMembersFn = useServerFn(getTeamMembers);
  const inviteMemberFn = useServerFn(inviteTeamMember);
  const getPromptsFn = useServerFn(getTeamPrompts);
  const sharePromptFn = useServerFn(sharePromptWithTeam);
  const getCommentsFn = useServerFn(getPromptComments);
  const addCommentFn = useServerFn(addPromptComment);
  const getActivityFn = useServerFn(getTeamActivity);

  // Authenticated user with fallback
  const currentUser = useMemo(() => {
    if (user) {
      return {
        id: user.id,
        email: user.email,
        name: user.fullName || user.email.split("@")[0],
        role: user.role || "admin",
      };
    }
    return {
      id: "usr_admin_001",
      email: "admin@promptiq.ai",
      name: "Admin Director",
      role: "admin",
    };
  }, [user]);

  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"prompts" | "share" | "members" | "activity">("prompts");
  const [isLoadingTeams, setIsLoadingTeams] = useState<boolean>(true);

  // Team data
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [prompts, setPrompts] = useState<TeamPrompt[]>([]);
  const [activities, setActivities] = useState<TeamActivity[]>([]);
  const [commentsMap, setCommentsMap] = useState<Record<string, PromptComment[]>>({});
  const [expandedCommentsPromptId, setExpandedCommentsPromptId] = useState<string | null>(null);
  const [newCommentText, setNewCommentText] = useState("");

  // Forms state
  const [newTeamName, setNewTeamName] = useState("");
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "editor" | "viewer">("editor");

  // Share Prompt form
  const [shareTitle, setShareTitle] = useState("");
  const [sharePromptText, setSharePromptText] = useState("");
  const [shareCategory, setShareCategory] = useState("Engineering");
  const [shareTags, setShareTags] = useState("sql, postgres, optimization");
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);

  // Status/Alerts
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (currentUser.id) {
      loadTeams();
    }
  }, [currentUser.id]);

  useEffect(() => {
    if (selectedTeamId) {
      loadTeamData(selectedTeamId);
    }
  }, [selectedTeamId]);

  const loadTeams = async () => {
    setIsLoadingTeams(true);
    try {
      const res = await getUserTeamsFn({ data: { userId: currentUser.id } });
      if (Array.isArray(res) && res.length > 0) {
        setTeams(res);
        if (!selectedTeamId || !res.some((t: Team) => t.id === selectedTeamId)) {
          if (res[0]) setSelectedTeamId(res[0].id);
        }
      } else {
        setTeams([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingTeams(false);
    }
  };

  const loadTeamData = async (teamId: string) => {
    if (!teamId) return;
    try {
      const [mRes, pRes, aRes] = await Promise.all([
        getMembersFn({ data: { teamId } }),
        getPromptsFn({ data: { teamId } }),
        getActivityFn({ data: { teamId } }),
      ]);
      if (Array.isArray(mRes)) setMembers(mRes);
      if (Array.isArray(pRes)) setPrompts(pRes);
      if (Array.isArray(aRes)) setActivities(aRes);
    } catch (e) {
      console.error("Failed to load team details:", e);
    }
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;
    try {
      const res = await createTeamFn({
        data: { teamName: newTeamName.trim(), userId: currentUser.id },
      });
      if (res.ok && res.teamId) {
        setStatusMsg({ type: "success", text: `Team "${newTeamName}" created!` });
        setNewTeamName("");
        setShowCreateTeamModal(false);
        await loadTeams();
        setSelectedTeamId(res.teamId);
      } else {
        setStatusMsg({ type: "error", text: res.message || "Failed to create team" });
      }
    } catch (e: any) {
      setStatusMsg({ type: "error", text: e.message });
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !selectedTeamId) return;
    try {
      const res = await inviteMemberFn({
        data: {
          teamId: selectedTeamId,
          email: inviteEmail.trim(),
          role: inviteRole,
          inviterId: currentUser.id,
        },
      });
      if (res.ok) {
        setStatusMsg({ type: "success", text: `Invited ${inviteEmail} as ${inviteRole}!` });
        setInviteEmail("");
        loadTeamData(selectedTeamId);
      } else {
        setStatusMsg({ type: "error", text: res.message || "Failed to invite member" });
      }
    } catch (e: any) {
      setStatusMsg({ type: "error", text: e.message });
    }
  };

  const handleSharePrompt = async () => {
    if (!shareTitle.trim() || !sharePromptText.trim() || !selectedTeamId) return;
    try {
      const res = await sharePromptFn({
        data: {
          teamId: selectedTeamId,
          userId: currentUser.id,
          title: shareTitle.trim(),
          prompt: sharePromptText.trim(),
          category: shareCategory,
          tags: shareTags
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        },
      });
      if (res.ok) {
        setStatusMsg({ type: "success", text: "Prompt shared with team!" });
        setShareTitle("");
        setSharePromptText("");
        setActiveTab("prompts");
        loadTeamData(selectedTeamId);
      } else {
        setStatusMsg({ type: "error", text: res.message || "Failed to share prompt" });
      }
    } catch (e: any) {
      setStatusMsg({ type: "error", text: e.message });
    }
  };

  const toggleComments = async (promptId: string) => {
    if (expandedCommentsPromptId === promptId) {
      setExpandedCommentsPromptId(null);
      return;
    }
    setExpandedCommentsPromptId(promptId);
    try {
      const res = await getCommentsFn({ data: { promptId } });
      if (Array.isArray(res)) {
        setCommentsMap((prev) => ({ ...prev, [promptId]: res }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddComment = async (promptId: string) => {
    if (!newCommentText.trim()) return;
    try {
      const res = await addCommentFn({
        data: {
          promptId,
          userId: currentUser.id,
          comment: newCommentText.trim(),
        },
      });
      if (res.ok) {
        setNewCommentText("");
        const cRes = await getCommentsFn({ data: { promptId } });
        if (Array.isArray(cRes)) {
          setCommentsMap((prev) => ({ ...prev, [promptId]: cRes }));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const copyPrompt = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPromptId(id);
    setTimeout(() => setCopiedPromptId(null), 2000);
  };

  const activeTeam = useMemo(() => {
    return teams.find((t) => t.id === selectedTeamId) || teams[0];
  }, [teams, selectedTeamId]);

  return (
    <PromptIQLayout
      title={t.team_title}
      subtitle={t.team_sub}
    >
      <div className="space-y-6">
        {/* Workspace Bar */}
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Workspace:</span>
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  disabled={isLoadingTeams || teams.length === 0}
                  className="min-w-[220px] rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-bold text-foreground focus:ring-1 focus:ring-primary cursor-pointer shadow-sm"
                >
                  {teams.length === 0 ? (
                    <option value="">{isLoadingTeams ? "Loading workspaces..." : "No workspaces found"}</option>
                  ) : (
                    teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.userRole.toUpperCase()})
                      </option>
                    ))
                  )}
                </select>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Role: <span className="font-semibold capitalize text-foreground">{activeTeam?.userRole || currentUser.role}</span> · {members.length} members
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCreateTeamModal(true)}
              className="gap-1.5 text-xs font-semibold"
            >
              <Plus className="h-3.5 w-3.5" />
              New Team
            </Button>
          </div>
        </div>

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

        {/* Tab Navigation */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab("prompts")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
              activeTab === "prompts"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="h-4 w-4" />
            Shared Prompts ({prompts.length})
          </button>
          <button
            onClick={() => setActiveTab("share")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
              activeTab === "share"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Share2 className="h-4 w-4" />
            Share Prompt
          </button>
          <button
            onClick={() => setActiveTab("members")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
              activeTab === "members"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="h-4 w-4" />
            Members & Roles ({members.length})
          </button>
          <button
            onClick={() => setActiveTab("activity")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
              activeTab === "activity"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Activity className="h-4 w-4" />
            Audit Feed
          </button>
        </div>

        {/* Tab 1: Shared Prompts */}
        {activeTab === "prompts" && (
          <div className="space-y-4">
            {prompts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
                <FileText className="mx-auto h-8 w-8 text-muted-foreground/60" />
                <p className="mt-2 text-sm font-semibold text-foreground">No shared team prompts yet</p>
                <p className="mt-1 text-xs">Share your first optimized prompt with team members.</p>
                <Button size="sm" onClick={() => setActiveTab("share")} className="mt-4 gap-1.5 text-xs">
                  <Plus className="h-3.5 w-3.5" /> Share Prompt
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {prompts.map((p: TeamPrompt) => {
                  const comments = commentsMap[p.id] || [];
                  const isExpanded = expandedCommentsPromptId === p.id;
                  const isCopied = copiedPromptId === p.id;

                  return (
                    <div key={p.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-display text-sm font-bold text-foreground">{p.title}</h4>
                            <Badge variant="outline" className="text-[10px]">
                              {p.category}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 border-emerald-500/30">
                              Score: {p.score > 0 ? p.score : 90}/100
                            </Badge>
                          </div>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            Shared by <span className="font-semibold text-foreground">{p.authorName}</span> ·{" "}
                            {new Date(p.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setPending(p.prompt, (p.category as any) || "General");
                              navigate({ to: "/" });
                            }}
                            className="gap-1.5 text-xs text-primary hover:text-primary-foreground hover:bg-primary"
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                            Test in Checker
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyPrompt(p.id, p.prompt)}
                            className="gap-1.5 text-xs"
                          >
                            {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                            Copy
                          </Button>
                        </div>
                      </div>

                      {/* Prompt Content */}
                      <div className="rounded-xl border border-border bg-muted/20 p-3 font-mono text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                        {p.prompt}
                      </div>

                      {/* Comments Bar */}
                      <div className="border-t border-border pt-3">
                        <button
                          onClick={() => toggleComments(p.id)}
                          className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          {isExpanded ? "Hide Comments" : `Comments (${p.commentsCount || comments.length})`}
                        </button>

                        {isExpanded && (
                          <div className="mt-3 space-y-3 rounded-xl bg-muted/30 p-3">
                            <div className="space-y-2">
                              {comments.map((c: PromptComment) => (
                                <div key={c.id} className="rounded-lg border border-border bg-card p-2.5 text-xs">
                                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                    <span className="font-bold text-foreground">{c.userName}</span>
                                    <span>{new Date(c.createdAt).toLocaleTimeString()}</span>
                                  </div>
                                  <p className="mt-1 text-foreground">{c.comment}</p>
                                </div>
                              ))}
                            </div>

                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={newCommentText}
                                onChange={(e) => setNewCommentText(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddComment(p.id))}
                                placeholder="Add team feedback or suggestion..."
                                className="flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:ring-1 focus:ring-primary"
                              />
                              <Button
                                size="sm"
                                onClick={() => handleAddComment(p.id)}
                                disabled={!newCommentText.trim()}
                                className="text-xs"
                              >
                                Comment
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Share Prompt Form */}
        {activeTab === "share" && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4 max-w-2xl">
            <h3 className="font-display text-base font-bold text-foreground">Share Prompt to Workspace</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-foreground">Prompt Title</label>
                <Input
                  value={shareTitle}
                  onChange={(e) => setShareTitle(e.target.value)}
                  placeholder="e.g. Production Postgres Query Optimizer"
                  className="mt-1 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground">Category</label>
                  <select
                    value={shareCategory}
                    onChange={(e) => setShareCategory(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-primary"
                  >
                    <option value="General">General</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Coding">Coding</option>
                    <option value="Writing">Writing</option>
                    <option value="Education">Education</option>
                    <option value="Research">Research</option>
                    <option value="Business">Business</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Product">Product</option>
                    <option value="Customer Support">Customer Support</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground">Tags (comma-separated)</label>
                  <Input
                    value={shareTags}
                    onChange={(e) => setShareTags(e.target.value)}
                    placeholder="sql, database, performance"
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Prompt Content</label>
                <Textarea
                  rows={5}
                  value={sharePromptText}
                  onChange={(e) => setSharePromptText(e.target.value)}
                  placeholder="Paste prompt instructions..."
                  className="mt-1 font-mono text-xs"
                />
              </div>

              <div className="pt-2">
                <Button
                  onClick={handleSharePrompt}
                  disabled={!shareTitle.trim() || !sharePromptText.trim()}
                  className="gap-2 font-semibold"
                >
                  <Share2 className="h-4 w-4" />
                  Publish to Team
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Members & Roles */}
        {activeTab === "members" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Roster Table */}
            <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
              <h3 className="font-display text-base font-bold text-foreground">Workspace Members ({members.length})</h3>
              <div className="divide-y divide-border">
                {members.map((m: TeamMember) => (
                  <div key={m.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <img src={m.avatar} alt={m.name} className="h-9 w-9 rounded-xl border border-border bg-muted" />
                      <div>
                        <p className="text-xs font-bold text-foreground">{m.name}</p>
                        <p className="text-[11px] text-muted-foreground">{m.email}</p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] uppercase font-bold ${
                        m.role === "admin"
                          ? "border-primary/40 text-primary bg-primary/10"
                          : m.role === "editor"
                            ? "border-blue-500/40 text-blue-600 bg-blue-500/10"
                            : "border-muted text-muted-foreground"
                      }`}
                    >
                      {m.role}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Invite Form */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4 h-fit">
              <h4 className="font-display text-sm font-bold text-foreground">Invite New Teammate</h4>
              <p className="text-xs text-muted-foreground">
                Grant role-based access to this workspace. Admins can invite and manage members.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-foreground">Colleague Email</label>
                  <Input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="teammate@company.com"
                    className="mt-1 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground">Role Permission</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-primary"
                  >
                    <option value="editor">Editor (Create & Edit Prompts)</option>
                    <option value="viewer">Viewer (Read-only)</option>
                    <option value="admin">Admin (Full Control)</option>
                  </select>
                </div>

                <Button onClick={handleInvite} disabled={!inviteEmail.trim()} className="w-full gap-2 text-xs">
                  <Mail className="h-3.5 w-3.5" />
                  Send Invitation
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Audit Feed */}
        {activeTab === "activity" && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            <h3 className="font-display text-base font-bold text-foreground">Team Activity Audit Trail</h3>
            <div className="space-y-3">
              {activities.map((act: TeamActivity) => (
                <div key={act.id} className="flex items-start gap-3 rounded-xl border border-border bg-muted/10 p-3 text-xs">
                  <div className="mt-0.5 grid h-6 w-6 place-items-center rounded-full bg-primary/10 text-primary">
                    <Activity className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-foreground">
                      <span className="font-bold">{act.userName}</span>{" "}
                      <span className="text-muted-foreground">performed</span>{" "}
                      <span className="font-mono text-primary">{act.action}</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{act.details}</p>
                    <p className="text-[10px] text-muted-foreground/80 mt-0.5">
                      {new Date(act.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Team Modal */}
      {showCreateTeamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
            <h3 className="font-display text-base font-bold text-foreground">Create New Workspace</h3>
            <div>
              <label className="text-xs font-semibold text-foreground">Team / Workspace Name</label>
              <Input
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="e.g. AI Research Lab"
                className="mt-1 text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setShowCreateTeamModal(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleCreateTeam} disabled={!newTeamName.trim()}>
                Create Team
              </Button>
            </div>
          </div>
        </div>
      )}
    </PromptIQLayout>
  );
}
