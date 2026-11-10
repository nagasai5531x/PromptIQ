import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState, useRef, type ReactNode } from "react";
import {
  BarChart3,
  BookOpen,
  Check,
  ChevronRight,
  Copy,
  Download,
  Upload,
  Heart,
  Loader2,
  Play,
  Plus,
  Shield,
  Trash2,
  WandSparkles,
  History,
  Edit3,
  Star,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Eye,
  Languages,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  analyzePrompt,
  CATEGORIES,
  type Category,
  type Analysis,
} from "@/lib/analyzer";
import { runAbTest, improvePrompt, type AbResult } from "@/lib/groq.functions";
import {
  generateTestInputs,
  type TestSuiteResult,
} from "@/lib/test-generator.functions";
import {
  clearHistory,
  loadHistory,
  onHistoryChange,
  removeHistory,
  setPending,
  updateHistory,
  addHistory,
  editPromptHistory,
  restorePromptVersion,
  exportHistoryJson,
  importHistoryJson,
  saveAbTest,
  loadAbHistory,
  updateAbTestRating,
  clearAbHistory,
  onAbHistoryChange,
  type HistoryEntry,
  type AbHistoryEntry,
  type PromptVersion,
} from "@/lib/history";
import { LIBRARY } from "@/lib/library";
import { scanPrompt, sanitizeSecrets, type SecurityReport } from "@/lib/security";
import { useLang } from "@/lib/i18n";
import { SiteHeader } from "@/components/SiteHeader";

function FeaturePage({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 pb-16">
        <div className="border-b border-border py-8">
          <h1 className="font-display text-3xl font-extrabold md:text-4xl">{title}</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="py-8">{children}</div>
      </main>
    </div>
  );
}

function Panel({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-border bg-card p-5 shadow-card ${className}`}>
      {title && <h2 className="mb-4 font-display text-lg font-bold">{title}</h2>}
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-xs font-semibold text-foreground/90">
      {label}
      {children}
    </label>
  );
}

function ActionMessage({
  children,
  danger = false,
}: {
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <p
      role="status"
      className={`mt-3 text-xs font-medium ${danger ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}
    >
      {children}
    </p>
  );
}

// ============================================================================
// 2. SMART PROMPT BUILDER
// ============================================================================
export function BuilderPage() {
  const { t, lang } = useLang();
  const [role, setRole] = useState("");
  const [task, setTask] = useState("");
  const [context, setContext] = useState("");
  const [audience, setAudience] = useState("");
  const [format, setFormat] = useState("");
  const [length, setLength] = useState("");
  const [tone, setTone] = useState("");
  const [constraints, setConstraints] = useState("");
  const [example, setExample] = useState("");
  const [outputLang, setOutputLang] = useState<string>("auto");
  const [scriptStyle, setScriptStyle] = useState<"auto" | "native_script" | "romanized" | "english">("auto");
  const [category, setCategory] = useState<Category>("General");
  const [saved, setSaved] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const navigate = useNavigate();
  const improve = useServerFn(improvePrompt);

  // Generate structured prompt
  const generatedPrompt = useMemo(() => {
    const parts = [
      role && `Act as ${role}.`,
      task,
      context && `Context: ${context}`,
      audience && `Target audience: ${audience}`,
      format && `Output format: ${format}`,
      length && `Length: ${length}`,
      tone && `Tone: ${tone}`,
      constraints && `Constraints:\n${constraints}`,
      example && `Example:\n${example}`,
      outputLang !== "auto" && `Language requirement: Respond in ${outputLang}.`,
      scriptStyle === "romanized" && `Writing style: Use natural Romanized script (English alphabet).`,
      scriptStyle === "native_script" && `Writing style: Use proper native script strictly.`,
    ].filter(Boolean);

    return parts.join("\n\n");
  }, [role, task, context, audience, format, length, tone, constraints, example, outputLang, scriptStyle]);

  const analysis = useMemo(
    () => analyzePrompt(generatedPrompt, category),
    [generatedPrompt, category],
  );

  const openChecker = () => {
    if (!generatedPrompt.trim()) return;
    setPending(generatedPrompt, category);
    navigate({ to: "/" });
  };

  const handleSaveToLibrary = () => {
    if (!generatedPrompt.trim()) return;
    addHistory({
      prompt: generatedPrompt,
      category,
      score: analysis.total,
      band: analysis.band,
      criteria: Object.fromEntries(analysis.criteria.map((c) => [c.key, c.score])),
      source: "builder",
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleImproveWithAI = async () => {
    if (!generatedPrompt.trim()) return;
    setAiLoading(true);
    try {
      const res = await improve({ data: { prompt: generatedPrompt, category, lang } });
      if (res.ok) {
        setPending(res.improvedPrompt, category);
        navigate({ to: "/" });
      } else {
        openChecker();
      }
    } catch {
      openChecker();
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <FeaturePage title={t.builder_title} subtitle={t.builder_sub}>
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Form fields */}
        <Panel title="Prompt Components" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t.b_role}>
              <Input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Senior Python tutor, Technical lead, Copywriter..."
              />
            </Field>
            <Field label={t.category}>
              <select
                className="h-10 rounded-xl border border-input bg-background px-3 text-xs"
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
              >
                {CATEGORIES.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label={t.b_task}>
            <Textarea
              value={task}
              onChange={(e) => setTask(e.target.value)}
              rows={3}
              placeholder="Explain recursion with real-world analogies and code examples..."
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t.b_context}>
              <Textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                rows={2}
                placeholder="College semester syllabus, production microservice..."
              />
            </Field>
            <Field label={t.b_audience}>
              <Textarea
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                rows={2}
                placeholder="2nd-year B.Tech students, beginner developers, executive team..."
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={t.b_format}>
              <Input
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                placeholder="Markdown, Bullet points, JSON table..."
              />
            </Field>
            <Field label={t.b_length}>
              <Input
                value={length}
                onChange={(e) => setLength(e.target.value)}
                placeholder="Under 300 words, 5 points..."
              />
            </Field>
            <Field label={t.b_tone}>
              <Input
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                placeholder="Empathetic, Academic, Concise..."
              />
            </Field>
          </div>

          <Field label={t.b_constraints}>
            <Textarea
              value={constraints}
              onChange={(e) => setConstraints(e.target.value)}
              rows={2}
              placeholder="Do not use jargon without defining it; include time complexity..."
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={t.b_example}>
              <Input
                value={example}
                onChange={(e) => setExample(e.target.value)}
                placeholder="Sample input/output or expected format..."
              />
            </Field>
            <Field label={t.b_lang}>
              <select
                className="h-10 rounded-xl border border-input bg-background px-3 text-xs"
                value={outputLang}
                onChange={(e) => setOutputLang(e.target.value)}
              >
                <option value="auto">Auto / Same as input</option>
                <option value="English">English</option>
                <option value="Telugu (తెలుగు)">Telugu (తెలుగు)</option>
                <option value="Hindi (हिन्दी)">Hindi (हिन्दी)</option>
                <option value="Tamil (தமிழ்)">Tamil (தமிழ்)</option>
                <option value="Kannada (ಕನ್ನಡ)">Kannada (ಕನ್ನಡ)</option>
                <option value="Malayalam (മലയാളം)">Malayalam (മലയാളം)</option>
                <option value="Bengali (বাংলা)">Bengali (বাংলা)</option>
                <option value="Marathi (मराठी)">Marathi (मराठी)</option>
                <option value="Gujarati (ગુજરાતી)">Gujarati (ગુજરાતી)</option>
                <option value="Punjabi (ਪੰਜਾਬੀ)">Punjabi (ਪੰਜਾਬੀ)</option>
                <option value="Urdu (اردو)">Urdu (اردو)</option>
                <option value="Spanish (Español)">Spanish (Español)</option>
                <option value="French (Français)">French (Français)</option>
                <option value="German (Deutsch)">German (Deutsch)</option>
                <option value="Portuguese (Português)">Portuguese (Português)</option>
                <option value="Japanese (日本語)">Japanese (日本語)</option>
                <option value="Chinese (中文)">Chinese (中文)</option>
                <option value="Korean (한국어)">Korean (한국어)</option>
                <option value="Arabic (العربية)">Arabic (العربية)</option>
                <option value="Russian (Русский)">Russian (Русский)</option>
              </select>
            </Field>
            <Field label="Script Style">
              <select
                className="h-10 rounded-xl border border-input bg-background px-3 text-xs"
                value={scriptStyle}
                onChange={(e) => setScriptStyle(e.target.value as any)}
              >
                <option value="auto">Natural / Default</option>
                <option value="native_script">Native Script (Proper Script)</option>
                <option value="romanized">Romanized (English Alphabet)</option>
              </select>
            </Field>
          </div>
        </Panel>

        {/* Live Preview & Analysis */}
        <div className="space-y-6">
          <Panel title={t.preview}>
            <pre className="min-h-52 whitespace-pre-wrap rounded-xl border border-border bg-muted/40 p-4 font-mono text-xs leading-relaxed">
              {generatedPrompt || "Your generated prompt will appear here as you fill out the fields."}
            </pre>

            <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
              <div>
                <span className="text-xs text-muted-foreground">{t.heuristic_note}</span>
                <p className="text-xs font-semibold text-foreground">
                  Band: {analysis.band} · {analysis.wordCount} words
                </p>
              </div>
              <strong className="font-display text-4xl text-brand">
                {analysis.total}
                <span className="text-sm text-muted-foreground">/100</span>
              </strong>
            </div>

            {/* Criteria breakdown */}
            <div className="mt-4 space-y-2">
              {analysis.criteria.map((item) => (
                <div key={item.key}>
                  <div className="flex justify-between text-xs">
                    <span>{item.label}</span>
                    <span className="font-mono text-muted-foreground">
                      {item.score}/{item.max}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-brand transition-all duration-300"
                      style={{ width: `${(item.score / item.max) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="mt-6 flex flex-wrap gap-2">
              <Button onClick={openChecker} disabled={!generatedPrompt.trim()}>
                <ChevronRight className="h-4 w-4" />
                {t.send_checker}
              </Button>
              <Button
                variant="secondary"
                onClick={handleImproveWithAI}
                disabled={!generatedPrompt.trim() || aiLoading}
              >
                {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
                {t.improve_ai}
              </Button>
              <Button variant="outline" onClick={handleSaveToLibrary} disabled={!generatedPrompt.trim()}>
                <BookOpen className="h-4 w-4" />
                {t.save_history}
              </Button>
              <Button
                variant="outline"
                disabled={!generatedPrompt.trim()}
                onClick={() => {
                  navigator.clipboard.writeText(generatedPrompt);
                  setSaved(true);
                  setTimeout(() => setSaved(false), 2000);
                }}
              >
                <Copy className="h-4 w-4" />
                {t.copy}
              </Button>
            </div>

            {saved && <ActionMessage>Prompt saved to your local Library!</ActionMessage>}
          </Panel>
        </div>
      </div>
    </FeaturePage>
  );
}

// ============================================================================
// 3. PROMPT SECURITY CHECKER
// ============================================================================
export function SecurityPage() {
  const { t } = useLang();
  const [prompt, setPrompt] = useState("");
  const [report, setReport] = useState<SecurityReport | null>(null);
  const [sanitizedMessage, setSanitizedMessage] = useState(false);
  const navigate = useNavigate();

  const scan = () => {
    setReport(scanPrompt(prompt));
    setSanitizedMessage(false);
  };

  const handleRedact = () => {
    const { sanitized, count } = sanitizeSecrets(prompt);
    setPrompt(sanitized);
    setReport(scanPrompt(sanitized));
    setSanitizedMessage(true);
    setTimeout(() => setSanitizedMessage(false), 3000);
  };

  const openInCheckerSafe = () => {
    if (!prompt.trim() || report?.hasSecrets) return;
    setPending(prompt, "General");
    navigate({ to: "/" });
  };

  const severityColor = (sev: string) => {
    switch (sev) {
      case "critical":
        return "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30";
      case "high":
        return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30";
      case "medium":
        return "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30";
      default:
        return "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30";
    }
  };

  return (
    <FeaturePage title={t.sec_title} subtitle={t.sec_sub}>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Panel title={t.your_prompt}>
          <Textarea
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              if (report) setReport(scanPrompt(e.target.value));
            }}
            rows={12}
            maxLength={8000}
            placeholder="Paste a prompt to test for API keys, passwords, personal data, or prompt injection risks..."
            className="font-mono text-xs leading-relaxed"
          />

          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={scan} disabled={!prompt.trim()}>
              <Shield className="h-4 w-4" />
              {t.scan}
            </Button>
            {report?.hasSecrets && (
              <Button variant="destructive" onClick={handleRedact}>
                <Shield className="h-4 w-4" />
                {t.redact_secrets}
              </Button>
            )}
            {report && !report.hasSecrets && (
              <Button variant="outline" onClick={openInCheckerSafe}>
                <ArrowRight className="h-4 w-4" />
                {t.send_checker}
              </Button>
            )}
          </div>

          {sanitizedMessage && (
            <ActionMessage>{t.sanitized}</ActionMessage>
          )}

          {report?.hasSecrets && (
            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <strong>{t.secrets_warning}</strong>
                <p className="mt-1">
                  Our system blocks sending prompts containing API keys or passwords to external AI. Click{" "}
                  <strong>"{t.redact_secrets}"</strong> to replace them with safe placeholders.
                </p>
              </div>
            </div>
          )}

          <p className="mt-4 text-xs text-muted-foreground">{t.sec_note}</p>
        </Panel>

        <Panel title={t.risk}>
          {!report ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <Shield className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              Scan a prompt to evaluate safety findings, matched patterns, and risk recommendations.
            </div>
          ) : (
            <>
              <div className="flex items-end justify-between border-b border-border pb-4">
                <div>
                  <span className="text-xs font-semibold uppercase text-muted-foreground">
                    Overall Risk
                  </span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <strong className="font-display text-4xl capitalize">{report.level}</strong>
                    <span className="text-xs text-muted-foreground">{report.risk}/100 score</span>
                  </div>
                </div>
                <Badge
                  variant={
                    report.level === "safe"
                      ? "default"
                      : report.level === "critical"
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {report.findings.length} findings
                </Badge>
              </div>

              {report.findings.length === 0 ? (
                <div className="mt-5 flex items-center gap-3 rounded-xl bg-emerald-500/10 p-4 text-sm text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <span>{t.no_issues}</span>
                </div>
              ) : (
                <ul className="mt-5 space-y-3">
                  {report.findings.map((finding) => (
                    <li
                      key={finding.id}
                      className="rounded-xl border border-border bg-background/60 p-3.5 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <strong className="font-semibold text-foreground">
                          {finding.title}
                        </strong>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${severityColor(
                            finding.severity,
                          )}`}
                        >
                          {finding.severity}
                        </span>
                      </div>
                      <p className="mt-2 text-muted-foreground">
                        <span className="font-semibold">{t.matched}:</span>{" "}
                        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">
                          {finding.match}
                        </code>
                      </p>
                      <p className="mt-1.5 text-foreground/90">
                        <span className="font-semibold">{t.fix}:</span> {finding.fix}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </Panel>
      </div>
    </FeaturePage>
  );
}

// ============================================================================
// 4. PROMPT LIBRARY & HISTORY (With Editing, Versions & JSON Backup)
// ============================================================================
export function LibraryPage() {
  const { t } = useLang();
  const [tab, setTab] = useState<"library" | "history">("library");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [viewVersionsId, setViewVersionsId] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const sync = () => setEntries(loadHistory());
    sync();
    return onHistoryChange(sync);
  }, []);

  const visibleLibrary = useMemo(
    () =>
      LIBRARY.filter(
        (item) =>
          (category === "All" || item.category === category) &&
          `${item.title} ${item.prompt}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [category, search],
  );

  const visibleHistory = useMemo(
    () =>
      entries.filter(
        (item) =>
          (category === "All" || item.category === category) &&
          `${item.prompt} ${item.category}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [entries, category, search],
  );

  const usePrompt = (prompt: string, cat: Category) => {
    setPending(prompt, cat);
    navigate({ to: "/" });
  };

  const startEdit = (entry: HistoryEntry) => {
    setEditingId(entry.id);
    setEditText(entry.prompt);
  };

  const saveEdit = (id: string, cat: Category) => {
    if (!editText.trim()) return;
    const a = analyzePrompt(editText, cat);
    editPromptHistory(
      id,
      editText,
      a.total,
      a.band,
      Object.fromEntries(a.criteria.map((c) => [c.key, c.score])),
    );
    setEditingId(null);
  };

  const handleExportBackup = () => {
    const json = exportHistoryJson();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prompt-library-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = importHistoryJson(content);
      if (res.success) {
        setImportStatus(`${res.count} ${t.backup_imported}`);
        setEntries(loadHistory());
        setTimeout(() => setImportStatus(null), 3000);
      } else {
        setImportStatus(`Import error: ${res.error}`);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <FeaturePage title={t.lib_title} subtitle="Save, version, edit, search, and backup your prompt collection.">
      {/* Top Bar: Tabs, Search, Export/Import */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-xl border border-border bg-card p-1">
          <Button
            size="sm"
            variant={tab === "library" ? "secondary" : "ghost"}
            onClick={() => setTab("library")}
          >
            <BookOpen className="h-4 w-4" />
            {t.lib_tab_library}
          </Button>
          <Button
            size="sm"
            variant={tab === "history" ? "secondary" : "ghost"}
            onClick={() => setTab("history")}
          >
            <History className="h-4 w-4" />
            {t.lib_tab_history} ({entries.length})
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            aria-label={t.search}
            placeholder={t.search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-48 sm:w-64"
          />

          <Button size="sm" variant="outline" onClick={handleExportBackup} title="Export JSON backup">
            <Download className="h-3.5 w-3.5" />
            {t.export_backup}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            title="Import JSON backup"
          >
            <Upload className="h-3.5 w-3.5" />
            {t.import_backup}
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportBackup}
            accept=".json,application/json"
            className="hidden"
          />
        </div>
      </div>

      {importStatus && <ActionMessage>{importStatus}</ActionMessage>}

      {/* Categories */}
      <div className="mb-6 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={category === "All" ? "default" : "outline"}
          onClick={() => setCategory("All")}
        >
          {t.all}
        </Button>
        {CATEGORIES.map((item) => (
          <Button
            key={item}
            size="sm"
            variant={category === item ? "default" : "outline"}
            onClick={() => setCategory(item)}
          >
            {item}
          </Button>
        ))}
      </div>

      {/* Content */}
      {tab === "library" ? (
        <div className="grid gap-4 md:grid-cols-2">
          {visibleLibrary.map((item) => (
            <Panel key={item.title}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-xs font-semibold text-primary">{item.category}</span>
                  <h3 className="mt-1 font-display font-bold">{item.title}</h3>
                </div>
                <Button size="sm" onClick={() => usePrompt(item.prompt, item.category)}>
                  <Plus className="h-3.5 w-3.5" />
                  {t.use}
                </Button>
              </div>
              <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-xs text-muted-foreground">
                {item.prompt}
              </p>
            </Panel>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {visibleHistory.map((item) => {
            const isEditing = editingId === item.id;
            const isViewingVersions = viewVersionsId === item.id;
            const versionCount = item.versions?.length || 1;

            return (
              <Panel key={item.id}>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{item.category}</Badge>
                    <span className="font-display font-bold text-sm">
                      {item.score}/100 · {item.band}
                    </span>
                    <Badge variant="secondary" className="text-[10px]">
                      {t.version}
                      {versionCount}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(item.ts).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Favorite"
                      onClick={() => updateHistory(item.id, { favorite: !item.favorite })}
                    >
                      <Heart className={`h-4 w-4 ${item.favorite ? "fill-current text-destructive" : ""}`} />
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setViewVersionsId(isViewingVersions ? null : item.id)}
                    >
                      <History className="h-3.5 w-3.5" />
                      {versionCount} {t.versions}
                    </Button>

                    <Button size="sm" variant="outline" onClick={() => startEdit(item)}>
                      <Edit3 className="h-3.5 w-3.5" />
                      {t.edit_prompt}
                    </Button>

                    <Button size="sm" onClick={() => usePrompt(item.prompt, item.category)}>
                      <ChevronRight className="h-3.5 w-3.5" />
                      {t.use}
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={t.del}
                      onClick={() => removeHistory(item.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                {isEditing ? (
                  <div className="mt-3 space-y-3">
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={5}
                      className="font-mono text-xs"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveEdit(item.id, item.category)}>
                        {t.save_changes}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                        {t.cancel}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 whitespace-pre-wrap font-mono text-xs leading-relaxed text-muted-foreground">
                    {item.prompt}
                  </p>
                )}

                {/* Versions dropdown */}
                {isViewingVersions && item.versions && item.versions.length > 0 && (
                  <div className="mt-4 rounded-xl border border-border bg-muted/40 p-3.5 text-xs">
                    <h4 className="font-semibold text-foreground">Version History</h4>
                    <ul className="mt-2 space-y-2">
                      {item.versions.map((ver) => (
                        <li
                          key={ver.version}
                          className="flex items-center justify-between rounded-lg bg-background p-2"
                        >
                          <div>
                            <span className="font-bold">v{ver.version}</span> ·{" "}
                            <span className="text-muted-foreground">
                              {new Date(ver.ts).toLocaleString()}
                            </span>
                            {ver.score !== undefined && (
                              <span className="ml-2 font-mono text-brand font-bold">
                                {ver.score}/100
                              </span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                restorePromptVersion(item.id, ver.version);
                                setViewVersionsId(null);
                              }}
                            >
                              <RotateCcw className="h-3 w-3" />
                              {t.restore_version}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => usePrompt(ver.prompt, item.category)}
                            >
                              {t.use}
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Panel>
            );
          })}

          {entries.length > 0 && (
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (confirm("Are you sure you want to clear your local history?")) {
                    clearHistory();
                    setEntries([]);
                  }
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t.clear_history}
              </Button>
            </div>
          )}

          {visibleHistory.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
              <History className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              {t.empty_history}
            </div>
          )}
        </div>
      )}
    </FeaturePage>
  );
}

// ============================================================================
// 6. A/B TESTING PLAYGROUND (With Real Latency & Manual Ratings)
// ============================================================================
export function ABTestingPage() {
  const { t, lang } = useLang();
  const run = useServerFn(runAbTest);
  const [promptA, setPromptA] = useState("");
  const [promptB, setPromptB] = useState("");
  const [testInput, setTestInput] = useState("");
  const [result, setResult] = useState<AbResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ratingA, setRatingA] = useState<number>(0);
  const [ratingB, setRatingB] = useState<number>(0);
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);

  const runTest = async () => {
    if (!promptA.trim() || !promptB.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    setRatingA(0);
    setRatingB(0);
    setLastSavedId(null);

    try {
      const next = await run({ data: { promptA, promptB, testInput, lang } });
      setResult(next);

      if (next.ok) {
        // Automatically save to A/B history with real latencies
        const saved = saveAbTest({
          promptA,
          promptB,
          testInput,
          outputA: next.outputA,
          outputB: next.outputB,
          winner: next.winner,
          scoreA: next.scoreA,
          scoreB: next.scoreB,
          latencyA: next.latencyA,
          latencyB: next.latencyB,
          reasoning: next.reasoning,
        });
        setLastSavedId(saved.id);
      } else {
        setError(next.message);
      }
    } catch {
      setError("The comparison could not finish. Your prompts are preserved; please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRate = (which: "A" | "B", score: number) => {
    if (which === "A") {
      setRatingA(score);
      if (lastSavedId) updateAbTestRating(lastSavedId, score, undefined);
    } else {
      setRatingB(score);
      if (lastSavedId) updateAbTestRating(lastSavedId, undefined, score);
    }
  };

  return (
    <FeaturePage title={t.ab_title} subtitle={t.ab_sub}>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title={t.prompt_a}>
          <Textarea
            value={promptA}
            onChange={(e) => setPromptA(e.target.value)}
            rows={8}
            placeholder="e.g. Write a friendly introduction to machine learning with 2 examples..."
            className="font-mono text-xs"
          />
        </Panel>

        <Panel title={t.prompt_b}>
          <Textarea
            value={promptB}
            onChange={(e) => setPromptB(e.target.value)}
            rows={8}
            placeholder="e.g. Act as a professor. Provide a structured guide on machine learning with a table..."
            className="font-mono text-xs"
          />
        </Panel>
      </div>

      <Panel title={t.test_input} className="mt-5">
        <Textarea
          value={testInput}
          onChange={(e) => setTestInput(e.target.value)}
          rows={3}
          placeholder="Optional input shared by both prompts (e.g. 'Audience: 2nd-year CS students')"
          className="font-mono text-xs"
        />

        <div className="mt-4 flex items-center gap-3">
          <Button
            onClick={runTest}
            disabled={!promptA.trim() || !promptB.trim() || loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {loading ? "Running actual AI evaluation…" : t.run_test}
          </Button>

          {loading && (
            <span className="text-xs text-muted-foreground">
              Executing actual live requests via Groq server function...
            </span>
          )}
        </div>

        {error && <ActionMessage danger>{error}</ActionMessage>}
      </Panel>

      {/* Results */}
      {result?.ok && (
        <div className="mt-6 space-y-6">
          <Panel
            title={`${t.ai_judge} — ${t.winner}: ${result.winner === "tie" ? t.tie : result.winner}`}
          >
            <p className="text-sm leading-relaxed text-muted-foreground">{result.reasoning}</p>

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              {/* Output A Card */}
              <div className="flex flex-col rounded-xl border border-border bg-background p-4">
                <div className="flex flex-wrap items-center justify-between border-b border-border pb-3">
                  <div>
                    <strong className="font-display text-sm font-bold">{t.prompt_a} Output</strong>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="h-3 w-3" />
                        {result.latencyA} ms
                      </span>
                      <span>·</span>
                      <span className="font-semibold text-brand">Score: {result.scoreA}/10</span>
                    </div>
                  </div>

                  {/* Manual Rating A */}
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-muted-foreground mr-1">Your rating:</span>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => handleRate("A", star)}
                        className="text-amber-500 hover:scale-110 transition"
                        title={`Rate ${star} stars`}
                      >
                        <Star
                          className={`h-4 w-4 ${star <= ratingA ? "fill-amber-400 text-amber-500" : "text-muted"}`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <pre className="mt-3 flex-1 overflow-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground">
                  {result.outputA}
                </pre>
              </div>

              {/* Output B Card */}
              <div className="flex flex-col rounded-xl border border-border bg-background p-4">
                <div className="flex flex-wrap items-center justify-between border-b border-border pb-3">
                  <div>
                    <strong className="font-display text-sm font-bold">{t.prompt_b} Output</strong>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="h-3 w-3" />
                        {result.latencyB} ms
                      </span>
                      <span>·</span>
                      <span className="font-semibold text-brand">Score: {result.scoreB}/10</span>
                    </div>
                  </div>

                  {/* Manual Rating B */}
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-muted-foreground mr-1">Your rating:</span>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => handleRate("B", star)}
                        className="text-amber-500 hover:scale-110 transition"
                        title={`Rate ${star} stars`}
                      >
                        <Star
                          className={`h-4 w-4 ${star <= ratingB ? "fill-amber-400 text-amber-500" : "text-muted"}`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <pre className="mt-3 flex-1 overflow-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground">
                  {result.outputB}
                </pre>
              </div>
            </div>

            {lastSavedId && (
              <p className="mt-4 text-right text-xs text-emerald-600 dark:text-emerald-400">
                ✓ {t.test_saved}
              </p>
            )}
          </Panel>
        </div>
      )}
    </FeaturePage>
  );
}

// ============================================================================
// 7. ANALYTICS DASHBOARD (Actual Stored Data & Empty States)
// ============================================================================
export function AnalyticsPage() {
  const { t } = useLang();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [abEntries, setAbEntries] = useState<AbHistoryEntry[]>([]);

  useEffect(() => {
    const sync = () => {
      setEntries(loadHistory());
      setAbEntries(loadAbHistory());
    };
    sync();
    const unsubHistory = onHistoryChange(sync);
    const unsubAb = onAbHistoryChange(sync);
    return () => {
      unsubHistory();
      unsubAb();
    };
  }, []);

  // Compute actual prompt metrics
  const totalAnalyzed = entries.length;
  const average = totalAnalyzed
    ? Math.round(entries.reduce((sum, item) => sum + item.score, 0) / totalAnalyzed)
    : 0;
  const best = totalAnalyzed ? Math.max(...entries.map((item) => item.score)) : 0;
  const gains = entries.filter((item) => item.improved);
  const avgGain = gains.length
    ? Math.round(
        gains.reduce(
          (sum, item) => sum + ((item.improved?.score ?? item.score) - item.score),
          0,
        ) / gains.length,
      )
    : 0;

  const weak = ["clarity", "specificity", "context", "output", "constraints"]
    .map((key) => {
      const points = entries
        .map((entry) => entry.criteria?.[key])
        .filter((score): score is number => typeof score === "number");
      return {
        key,
        value: points.length
          ? Math.round(points.reduce((sum, value) => sum + value, 0) / points.length)
          : 0,
      };
    })
    .sort((a, b) => a.value - b.value);

  const categories = CATEGORIES.map((category) => ({
    category,
    count: entries.filter((entry) => entry.category === category).length,
  })).filter((item) => item.count > 0);

  const securityPass = entries.filter((entry) => entry.security).length;
  const passRate = securityPass
    ? Math.round(
        (entries.filter((entry) => entry.security === "safe" || entry.security === "low").length /
          securityPass) *
          100,
      )
    : null;

  // Compute actual A/B test metrics
  const totalAb = abEntries.length;
  const winsA = abEntries.filter((x) => x.winner === "A").length;
  const winsB = abEntries.filter((x) => x.winner === "B").length;
  const ties = abEntries.filter((x) => x.winner === "tie").length;
  const avgLatencyA = totalAb
    ? Math.round(abEntries.reduce((s, x) => s + (x.latencyA || 0), 0) / totalAb)
    : 0;
  const avgLatencyB = totalAb
    ? Math.round(abEntries.reduce((s, x) => s + (x.latencyB || 0), 0) / totalAb)
    : 0;

  return (
    <FeaturePage title={t.an_title} subtitle={t.an_sub}>
      {totalAnalyzed === 0 && totalAb === 0 ? (
        <Panel>
          <div className="py-12 text-center">
            <BarChart3 className="mx-auto mb-3 h-10 w-10 text-primary" />
            <h3 className="font-display text-lg font-bold">No Data Recorded Yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t.an_empty}</p>
            <div className="mt-6 flex justify-center gap-3">
              <Button asChild>
                <Link to="/">Open Checker</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/builder">Open Builder</Link>
              </Button>
            </div>
          </div>
        </Panel>
      ) : (
        <div className="space-y-6">
          {/* Key Metric Tiles */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [t.total_prompts, totalAnalyzed],
              [t.avg_score, `${average}/100`],
              [t.best_score, `${best}/100`],
              [t.avg_gain, `${avgGain > 0 ? "+" : ""}${avgGain} pts`],
            ].map(([label, value]) => (
              <Panel key={String(label)}>
                <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
                <p className="mt-2 font-display text-3xl font-extrabold text-foreground">{value}</p>
              </Panel>
            ))}
          </div>

          {/* Prompt Trends & Weak Dimensions */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title={t.trend}>
              {entries.length === 0 ? (
                <p className="text-xs text-muted-foreground">No prompt scores saved yet.</p>
              ) : (
                <div className="flex h-44 items-end gap-2 border-b border-border pb-1">
                  {entries
                    .slice(0, 20)
                    .reverse()
                    .map((entry) => (
                      <div
                        key={entry.id}
                        className="group flex h-full flex-1 flex-col items-center justify-end"
                        title={`${entry.score}/100 · ${entry.category}`}
                      >
                        <span className="mb-1 text-[10px] text-muted-foreground">
                          {entry.score}
                        </span>
                        <div
                          className="w-full max-w-7 rounded-t bg-brand transition-all hover:opacity-80"
                          style={{ height: `${Math.max(entry.score, 6)}%` }}
                        />
                      </div>
                    ))}
                </div>
              )}
            </Panel>

            <Panel title={t.weak}>
              {weak.map((item) => (
                <div key={item.key} className="mb-3.5 last:mb-0">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="capitalize">{item.key}</span>
                    <span>{item.value}%</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand transition-all"
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </Panel>
          </div>

          {/* Category Distribution & Security Clean Rate */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title={t.by_category}>
              {categories.length ? (
                <div className="space-y-2">
                  {categories.map((item) => (
                    <div
                      key={item.category}
                      className="flex justify-between border-b border-border py-2 text-xs last:border-0"
                    >
                      <span>{item.category}</span>
                      <strong className="font-mono">{item.count}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No categories recorded yet.</p>
              )}
            </Panel>

            <Panel title={t.sec_rate}>
              <p className="font-display text-4xl font-extrabold text-foreground">
                {passRate === null ? "—" : `${passRate}%`}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Calculated from security scans performed on prompts.
              </p>
            </Panel>
          </div>

          {/* A/B Test Live Results Section */}
          <Panel title={t.ab_analytics_title}>
            {totalAb === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                <Play className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                No A/B tests recorded yet.
                <div className="mt-3">
                  <Button asChild size="sm" variant="outline">
                    <Link to="/ab-test">Run your first A/B Test</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-border bg-background p-3.5">
                  <span className="text-xs text-muted-foreground">{t.ab_tests_run}</span>
                  <p className="mt-1 font-display text-2xl font-bold">{totalAb}</p>
                </div>
                <div className="rounded-xl border border-border bg-background p-3.5">
                  <span className="text-xs text-muted-foreground">{t.wins_a}</span>
                  <p className="mt-1 font-display text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {winsA}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-background p-3.5">
                  <span className="text-xs text-muted-foreground">{t.wins_b}</span>
                  <p className="mt-1 font-display text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {winsB}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-background p-3.5">
                  <span className="text-xs text-muted-foreground">{t.avg_latency}</span>
                  <p className="mt-1 font-display text-sm font-mono font-bold">
                    A: {avgLatencyA} ms · B: {avgLatencyB} ms
                  </p>
                </div>
              </div>
            )}
          </Panel>
        </div>
      )}
    </FeaturePage>
  );
}

// ============================================================================
// AI TEST INPUT GENERATOR
// ============================================================================
export function TestInputsPage() {
  const { t, lang } = useLang();
  const generate = useServerFn(generateTestInputs);
  const [prompt, setPrompt] = useState("");
  const [useCase, setUseCase] = useState("");
  const [result, setResult] = useState<TestSuiteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const [exportMenu, setExportMenu] = useState(false);

  const createSuite = async () => {
    if (!prompt.trim() || !useCase.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      setResult(await generate({ data: { prompt, useCase, lang } }));
    } catch {
      setResult({
        ok: false,
        message: "AI could not generate a test suite right now. Try again later.",
      });
    } finally {
      setLoading(false);
    }
  };

  const copy = async (value: string, index: number) => {
    await navigator.clipboard.writeText(value);
    setCopied(index);
    window.setTimeout(() => setCopied(null), 1300);
  };

  const download = (format: "json" | "md") => {
    if (!result?.ok) return;
    const content =
      format === "json"
        ? JSON.stringify({ prompt, useCase, cases: result.cases }, null, 2)
        : `# Prompt test suite\n\n**Use case:** ${useCase}\n\n${result.cases
            .map(
              (item, i) =>
                `## ${i + 1}. ${item.title}\n\n### Test input\n\n\`\`\`\n${item.input}\n\`\`\`\n\n**Expected:** ${item.expected}\n\n**Watch for:** ${item.failureWatch}`,
            )
            .join("\n\n")}`;
    const url = URL.createObjectURL(
      new Blob([content], { type: format === "json" ? "application/json" : "text/markdown" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `prompt-test-suite.${format}`;
    anchor.click();
    URL.revokeObjectURL(url);
    setExportMenu(false);
  };

  return (
    <FeaturePage
      title="AI Test Input Generator"
      subtitle="Turn a prompt and its intended use into a practical validation suite with ordinary, edge, and failure-focused inputs."
    >
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <Panel title="Test Brief" className="space-y-4">
          <Field label={t.your_prompt}>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={9}
              maxLength={6000}
              placeholder="Paste the prompt you want to validate…"
            />
          </Field>
          <Field label="Intended use case">
            <Textarea
              value={useCase}
              onChange={(e) => setUseCase(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Who uses it, what should it accomplish, and in what situation?"
            />
          </Field>
          <Button onClick={createSuite} disabled={!prompt.trim() || !useCase.trim() || loading}>
            {loading ? <Loader2 className="animate-spin" /> : <WandSparkles />}
            {loading ? "Generating test cases…" : "Generate test cases"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Your inputs are sent securely for generation and are not saved to history automatically.
          </p>
        </Panel>

        <div className="space-y-4">
          {loading && (
            <Panel>
              <div className="flex items-center gap-3 text-sm">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Preparing a diverse test suite…
              </div>
            </Panel>
          )}

          {result && !result.ok && (
            <Panel>
              <p className="text-sm text-destructive">{result.message}</p>
            </Panel>
          )}

          {result?.ok && (
            <>
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-lg font-bold">{result.cases.length} test cases</h2>
                <div className="relative">
                  <Button variant="outline" onClick={() => setExportMenu(!exportMenu)}>
                    <Download />
                    Export suite
                  </Button>
                  {exportMenu && (
                    <div className="absolute right-0 top-full z-10 mt-1 grid min-w-32 border border-border bg-card p-1 shadow-card rounded-lg">
                      <Button variant="ghost" onClick={() => download("json")}>
                        JSON
                      </Button>
                      <Button variant="ghost" onClick={() => download("md")}>
                        Markdown
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {result.cases.map((item, index) => (
                <Panel key={`${index}-${item.title}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-xs font-semibold text-primary">Test {index + 1}</span>
                      <h3 className="font-display font-bold">{item.title}</h3>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Copy test input ${index + 1}`}
                      onClick={() => copy(item.input, index)}
                    >
                      {copied === index ? <Check /> : <Copy />}
                    </Button>
                  </div>
                  <pre className="mt-3 whitespace-pre-wrap rounded-md bg-muted p-3 font-mono text-xs">
                    {item.input}
                  </pre>
                  <details className="mt-3 border-t border-border pt-3">
                    <summary className="cursor-pointer text-xs font-semibold">Evaluation criteria</summary>
                    <p className="mt-2 text-xs">
                      <strong>Expected:</strong> {item.expected}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      <strong>Watch for:</strong> {item.failureWatch}
                    </p>
                  </details>
                </Panel>
              ))}
            </>
          )}
        </div>
      </div>
    </FeaturePage>
  );
}
