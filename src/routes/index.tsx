import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState, useEffect } from "react";
import {
  Sparkles,
  Gauge,
  Copy,
  Download,
  RotateCcw,
  Wand2,
  Check,
  AlertTriangle,
  Loader2,
  Lightbulb,
  KeyRound,
  ArrowRightLeft,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";
import {
  analyzePrompt,
  buildReport,
  CATEGORIES,
  SAMPLE_PROMPT,
  SAMPLE_IMPROVED_PROMPT,
  type Analysis,
  type Category,
} from "@/lib/analyzer";
import { improvePrompt, MODEL, type ImproveResult } from "@/lib/groq.functions";
import {
  detectLanguage,
  SUPPORTED_LANGUAGES,
  type SupportedLanguageCode,
} from "@/lib/language-detector";
import {
  analyzeMultilingualPrompt,
  type MultilingualAnalysisResult,
} from "@/lib/multilingual-analyzer";
import { transliterateRomanizedToNative } from "@/lib/transliteration";
import {
  optimizeMultilingualPromptFn,
  type OptimizationMode,
} from "@/lib/multilingual.functions";
import { BeforeAfterComparison } from "@/components/BeforeAfterComparison";
import { addHistory, takePending } from "@/lib/history";
import { scanPrompt, sanitizeSecrets } from "@/lib/security";
import { useLang } from "@/lib/i18n";
import { useAuth } from "@/lib/auth.context";
import { SiteHeader } from "@/components/SiteHeader";
import { Globe, Languages, CheckCheck, BookOpen, Sparkles as SparklesIcon } from "lucide-react";

export const Route = createFileRoute("/")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Prompt Quality Checker — Score & improve AI prompts" },
      {
        name: "description",
        content:
          "Rule-based prompt scoring across clarity, specificity, context, output and constraints, plus side-by-side Before vs After comparison and AI rewrites via Groq.",
      },
      { property: "og:title", content: "Prompt Quality Checker" },
      {
        property: "og:description",
        content: "Score your prompts, rewrite them with AI, and compare Before vs After side by side.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function bandColor(total: number) {
  return total >= 70 ? "bg-success" : total >= 50 ? "bg-warning" : "bg-destructive";
}

function Index() {
  const { t, lang, crit, cat } = useLang();
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate({ to: "/login" });
    }
  }, [isLoading, isAuthenticated, navigate]);

  const [prompt, setPrompt] = useState("");
  const [originalSnapshot, setOriginalSnapshot] = useState("");
  const [improvedPrompt, setImprovedPrompt] = useState("");
  const [category, setCategory] = useState<Category>("General");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [multilingualAnalysis, setMultilingualAnalysis] = useState<MultilingualAnalysisResult | null>(null);
  const [ai, setAi] = useState<ImproveResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [secretWarning, setSecretWarning] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"checker" | "compare">("checker");
  const [showComparisonSection, setShowComparisonSection] = useState(false);

  // Multilingual & Romanized states
  const [selectedLanguage, setSelectedLanguage] = useState<string>("auto");
  const [optMode, setOptMode] = useState<OptimizationMode>("original");
  const [showTransliteration, setShowTransliteration] = useState(false);
  const [transliteratedText, setTransliteratedText] = useState("");
  const [copiedTransliteration, setCopiedTransliteration] = useState(false);

  const improve = useServerFn(improvePrompt);
  const optimizeMultilingualFn = useServerFn(optimizeMultilingualPromptFn);

  // Live intelligent language detection as user types
  const liveDetection = useMemo(() => {
    if (!prompt.trim()) return null;
    return detectLanguage(prompt);
  }, [prompt]);

  // Update transliterated text whenever prompt or detection changes
  useEffect(() => {
    if (liveDetection && (liveDetection.writingStyle === "romanized" || liveDetection.writingStyle === "mixed")) {
      const native = transliterateRomanizedToNative(prompt, liveDetection.detectedCode);
      setTransliteratedText(native);
    } else {
      setTransliteratedText("");
    }
  }, [prompt, liveDetection]);

  // Check for handoff from Builder or Library pages
  useEffect(() => {
    const pending = takePending();
    if (pending) {
      setPrompt(pending.prompt);
      setCategory(pending.category);
      const a = analyzePrompt(pending.prompt, pending.category);
      setAnalysis(a);
      const mla = analyzeMultilingualPrompt(pending.prompt, pending.category);
      setMultilingualAnalysis(mla);
    }
  }, []);

  const suggestions = useMemo(
    () =>
      analysis?.criteria.flatMap((c) =>
        c.suggestions.map((s) => ({ c: crit(c.key, c.label), s })),
      ) ?? [],
    [analysis, crit],
  );

  const runAnalyze = () => {
    if (!prompt.trim()) return;
    const a = analyzePrompt(prompt, category);
    setAnalysis(a);

    const overrideCode = selectedLanguage !== "auto" ? (selectedLanguage as SupportedLanguageCode) : undefined;
    const mla = analyzeMultilingualPrompt(prompt, category, overrideCode);
    setMultilingualAnalysis(mla);

    // Record analysis in browser history for Analytics
    const sec = scanPrompt(prompt);
    addHistory({
      prompt,
      category,
      score: mla.overallScore,
      band: mla.rating,
      criteria: Object.fromEntries(a.criteria.map((c) => [c.key, c.score])),
      security: sec.level,
      source: "checker",
    });
  };

  const runImprove = async () => {
    if (!prompt.trim()) return;
    setSecretWarning(null);

    // Security Gate: Do NOT send detected secrets (API keys, passwords) to external AI
    const secReport = scanPrompt(prompt);
    if (secReport.hasSecrets) {
      setSecretWarning(
        "Critical secrets detected (API key or password). To protect your privacy, secrets are never sent to external AI. Click 'Redact Secrets' or remove them.",
      );
      return;
    }

    setAiLoading(true);
    setAi(null);
    setOriginalSnapshot(prompt);
    if (!analysis) runAnalyze();

    try {
      const res = await optimizeMultilingualFn({
        data: {
          prompt,
          mode: optMode,
          targetLanguage: selectedLanguage,
          category,
        },
      });

      if (res.ok && res.improvedPrompt) {
        setImprovedPrompt(res.improvedPrompt);
        setAi({
          ok: true,
          analysis: res.analysisNotes,
          improvedPrompt: res.improvedPrompt,
          model: "llama-3.3-70b-versatile",
        });
        setShowComparisonSection(true);

        const a = analysis ?? analyzePrompt(prompt, category);
        const improvedScore = analyzeMultilingualPrompt(res.improvedPrompt, category).overallScore;
        addHistory({
          prompt,
          category,
          score: multilingualAnalysis?.overallScore || a.total,
          band: multilingualAnalysis?.rating || a.band,
          criteria: Object.fromEntries(a.criteria.map((c) => [c.key, c.score])),
          improved: { prompt: res.improvedPrompt, score: improvedScore },
          source: "checker",
        });
      } else {
        // Fallback to legacy improve server fn
        const fallbackRes = await improve({ data: { prompt, category, lang } });
        setAi(fallbackRes);
        if (fallbackRes.ok) {
          setImprovedPrompt(fallbackRes.improvedPrompt);
          setShowComparisonSection(true);
        }
      }
    } catch {
      setAi({
        ok: false,
        code: "api_error",
        message: "Request failed. Please try again.",
      });
    } finally {
      setAiLoading(false);
    }
  };

  const handleRedactSecrets = () => {
    const { sanitized } = sanitizeSecrets(prompt);
    setPrompt(sanitized);
    setSecretWarning(null);
  };

  const reset = () => {
    setPrompt("");
    setOriginalSnapshot("");
    setImprovedPrompt("");
    setAnalysis(null);
    setAi(null);
    setSecretWarning(null);
    setShowComparisonSection(false);
  };

  const copy = async () => {
    const targetText = improvedPrompt || (ai?.ok ? ai.improvedPrompt : "");
    if (targetText) {
      await navigator.clipboard.writeText(targetText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const download = () => {
    const a = analysis ?? analyzePrompt(prompt, category);
    const beforeText = originalSnapshot || prompt;
    const afterText = improvedPrompt || (ai?.ok ? ai.improvedPrompt : undefined);
    const text = buildReport(beforeText, category, a, ai?.ok ? ai : null, afterText);
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "prompt-analysis-report.txt";
    link.click();
    URL.revokeObjectURL(url);
  };

  const loadSample = () => {
    setPrompt(SAMPLE_PROMPT);
    setOriginalSnapshot(SAMPLE_PROMPT);
    setCategory("Education");
    setAnalysis(null);
    setAi(null);
    setSecretWarning(null);
  };

  const loadSampleComparison = () => {
    setPrompt(SAMPLE_PROMPT);
    setOriginalSnapshot(SAMPLE_PROMPT);
    setImprovedPrompt(SAMPLE_IMPROVED_PROMPT);
    setCategory("Education");
    setAnalysis(analyzePrompt(SAMPLE_PROMPT, "Education"));
    setShowComparisonSection(true);
    setViewMode("compare");
  };

  const handleUseImproved = (improvedText: string) => {
    setPrompt(improvedText);
    setAnalysis(analyzePrompt(improvedText, category));
  };

  const btn =
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed";
  const primary = `${btn} bg-brand text-primary-foreground shadow-card hover:opacity-95`;
  const ghost = `${btn} border border-border bg-card text-foreground hover:bg-muted`;

  const beforePromptForComparison = originalSnapshot || prompt;
  const afterPromptForComparison = improvedPrompt || (ai?.ok ? ai.improvedPrompt : "");

  return (
    <div className="min-h-screen bg-background font-sans">
      <SiteHeader />

      <section className="bg-soft-glow">
        <div className="mx-auto max-w-3xl px-4 pb-8 pt-10 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
            <Sparkles className="h-3.5 w-3.5" /> {t.hero_badge}
          </span>
          <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight md:text-5xl">
            {t.hero_title_a} <span className="text-brand">{t.hero_title_b}</span> {t.hero_title_c}
          </h1>
          <p className="mt-4 text-sm text-muted-foreground">{t.hero_sub}</p>

          {/* Mode switch tabs */}
          <div className="mt-6 inline-flex rounded-xl border border-border bg-card p-1 shadow-sm">
            <button
              onClick={() => setViewMode("checker")}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition ${
                viewMode === "checker"
                  ? "bg-brand text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Gauge className="h-3.5 w-3.5" /> {t.nav_checker}
            </button>
            <button
              onClick={() => {
                setViewMode("compare");
                setShowComparisonSection(true);
                if (!improvedPrompt && !ai?.ok) {
                  setOriginalSnapshot(prompt || SAMPLE_PROMPT);
                  setImprovedPrompt(SAMPLE_IMPROVED_PROMPT);
                }
              }}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition ${
                viewMode === "compare"
                  ? "bg-brand text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ArrowRightLeft className="h-3.5 w-3.5" /> {t.before_after}
              {(improvedPrompt || ai?.ok) && (
                <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.2 text-[10px] text-emerald-600 dark:text-emerald-300">
                  Ready
                </span>
              )}
            </button>
          </div>
        </div>
      </section>

      <main id="checker" className="mx-auto max-w-6xl px-4 pb-16">
        {viewMode === "checker" ? (
          <div className="grid gap-6 lg:grid-cols-5">
            {/* Editor */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card lg:col-span-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <label htmlFor="prompt" className="font-display font-bold">
                    {t.your_prompt}
                  </label>
                  {/* Multilingual Selector */}
                  <div className="flex items-center gap-1.5 rounded-lg border border-input bg-muted/30 px-2 py-1">
                    <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                    <select
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                      className="bg-transparent text-xs font-semibold text-foreground focus:outline-none"
                    >
                      <option value="auto">Auto Detect Language</option>
                      {Object.entries(SUPPORTED_LANGUAGES).map(([code, info]) => (
                        <option key={code} value={code}>
                          {info.name} ({info.nativeName})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={loadSample}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    <Lightbulb className="h-3.5 w-3.5" /> {t.load_sample}
                  </button>
                  <button
                    onClick={loadSampleComparison}
                    className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
                  >
                    <ArrowRightLeft className="h-3.5 w-3.5" /> {t.try_before_after}
                  </button>
                </div>
              </div>

              <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => {
                  setPrompt(e.target.value);
                  if (secretWarning) setSecretWarning(null);
                }}
                rows={9}
                maxLength={8000}
                placeholder="Type your prompt in English, Telugu, Hindi, Tamil or any supported language (in native script or Romanized english letters)…"
                className="mt-3 w-full resize-y rounded-xl border border-input bg-background p-4 font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring"
              />

              {/* Live Language Detection & Style Badge */}
              {liveDetection && (
                <div className="mt-2.5 flex flex-wrap items-center gap-2 rounded-xl border border-border/80 bg-muted/40 px-3 py-2 text-xs">
                  <span className="flex items-center gap-1 font-semibold text-foreground">
                    <Languages className="h-3.5 w-3.5 text-primary" />
                    Detected: <span className="text-primary font-bold">{liveDetection.languageName}</span> ({liveDetection.nativeName})
                  </span>
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary capitalize">
                    Style: {liveDetection.writingStyle.replace("_", " ")}
                  </span>
                  <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    {liveDetection.confidence}% Confidence
                  </span>
                  {liveDetection.isMixed && liveDetection.mixedDetails && (
                    <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                      {liveDetection.mixedDetails}
                    </span>
                  )}
                  {(liveDetection.writingStyle === "romanized" || liveDetection.writingStyle === "mixed") && (
                    <button
                      type="button"
                      onClick={() => setShowTransliteration(!showTransliteration)}
                      className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-brand hover:underline"
                    >
                      <Languages className="h-3.5 w-3.5" />
                      {showTransliteration ? "Hide Native Script" : "View Native Script (Transliteration)"}
                    </button>
                  )}
                </div>
              )}

              {/* Transliteration Preview & Editable Box */}
              {showTransliteration && transliteratedText && (
                <div className="mt-3 rounded-xl border border-primary/30 bg-primary/5 p-3.5 shadow-sm">
                  <div className="flex items-center justify-between pb-2">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Languages className="h-4 w-4 text-primary" />
                      {liveDetection?.languageName} Native Script Transliteration (Editable)
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(transliteratedText);
                          setCopiedTransliteration(true);
                          setTimeout(() => setCopiedTransliteration(false), 2000);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
                      >
                        {copiedTransliteration ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                        {copiedTransliteration ? "Copied" : "Copy"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPrompt(transliteratedText);
                        }}
                        className="rounded-md bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground hover:opacity-90 shadow-sm"
                      >
                        Use as Prompt
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={transliteratedText}
                    onChange={(e) => setTransliteratedText(e.target.value)}
                    rows={3}
                    className="w-full resize-y rounded-lg border border-input bg-background p-2.5 font-sans text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Transliteration is completely optional. PromptIQ can analyze and optimize Romanized prompts directly without forcing native script.
                  </p>
                </div>
              )}

              <div className="mt-1 text-right text-xs text-muted-foreground">
                {prompt.trim() ? prompt.trim().split(/\s+/).length : 0} {t.words}
              </div>

              {/* Multilingual Optimization Mode Target */}
              <div className="mt-3 space-y-1.5 border-t border-border pt-3">
                <label className="text-xs font-semibold text-muted-foreground">Optimization Target Mode</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { id: "original", label: "Improved Original", desc: "Preserves native or Romanized style" },
                    { id: "romanized", label: "Improved Romanized", desc: "Natural English alphabet typing" },
                    { id: "native_script", label: "Improved Native Script", desc: "Full proper native script" },
                    { id: "english", label: "Translate to English", desc: "Enterprise English prompt" },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setOptMode(m.id as OptimizationMode)}
                      className={`rounded-xl border p-2 text-left transition ${
                        optMode === m.id
                          ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/40 font-semibold"
                          : "border-border bg-card/60 text-muted-foreground hover:border-primary/40 hover:bg-muted/30"
                      }`}
                    >
                      <p className="text-xs font-bold leading-tight">{m.label}</p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground line-clamp-1">{m.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {secretWarning && (
                <div className="mt-3 flex items-start justify-between gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3.5 text-xs text-destructive">
                  <div className="flex items-start gap-2">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{secretWarning}</span>
                  </div>
                  <button
                    onClick={handleRedactSecrets}
                    className="shrink-0 rounded-md bg-destructive px-2.5 py-1 text-xs font-semibold text-destructive-foreground hover:opacity-90"
                  >
                    Redact Secrets
                  </button>
                </div>
              )}

              <fieldset className="mt-3">
                <legend className="mb-2 text-xs font-semibold text-muted-foreground">
                  {t.category}
                </legend>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c}
                      onClick={() => setCategory(c)}
                      aria-pressed={category === c}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                        category === c
                          ? "border-primary bg-accent text-accent-foreground"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      {cat(c)}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  className={primary}
                  onClick={runAnalyze}
                  disabled={!prompt.trim()}
                >
                  <Gauge className="h-4 w-4" /> {t.analyze}
                </button>
                <button
                  className={ghost}
                  onClick={runImprove}
                  disabled={!prompt.trim() || aiLoading}
                >
                  {aiLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4" />
                  )}{" "}
                  {t.improve}
                </button>
                <button
                  className={ghost}
                  onClick={() => {
                    setOriginalSnapshot(prompt);
                    if (!improvedPrompt && !ai?.ok) {
                      setImprovedPrompt(SAMPLE_IMPROVED_PROMPT);
                    }
                    setShowComparisonSection(!showComparisonSection);
                  }}
                  disabled={!prompt.trim() && !improvedPrompt}
                >
                  <ArrowRightLeft className="h-4 w-4" /> {t.before_after}
                </button>
                <button
                  className={ghost}
                  onClick={download}
                  disabled={!prompt.trim()}
                >
                  <Download className="h-4 w-4" /> {t.export}
                </button>
                <button className={ghost} onClick={reset}>
                  <RotateCcw className="h-4 w-4" /> {t.clear}
                </button>
              </div>

              {/* AI loading and error status */}
              <div className="mt-6" aria-live="polite">
                {aiLoading && (
                  <div className="flex items-center gap-2 rounded-xl bg-muted p-4 text-xs">
                    <Loader2 className="h-4 w-4 animate-spin text-brand" /> {t.asking} ({MODEL})…
                  </div>
                )}
                {ai && !ai.ok && ai.code === "missing_key" && (
                  <div className="rounded-xl border border-warning bg-card p-4 text-xs">
                    <p className="flex items-center gap-2 font-semibold">
                      <KeyRound className="h-4 w-4" /> AI Key Not Configured
                    </p>
                    <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
                      <li>Add your key as `GROQ_API_KEY` in `.env`.</li>
                      <li>Click "Improve with AI" again. Rule-based analysis works without it.</li>
                    </ol>
                  </div>
                )}
                {ai && !ai.ok && ai.code !== "missing_key" && (
                  <div className="flex items-start gap-2 rounded-xl border border-destructive bg-card p-4 text-xs text-destructive">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{" "}
                    {ai.message} {t.still_works}
                  </div>
                )}

                {/* Quick AI summary */}
                {ai?.ok && !showComparisonSection && (
                  <div className="space-y-4 rounded-xl border border-border bg-accent/40 p-4">
                    <div>
                      <h3 className="font-display font-bold text-sm">{t.ai_analysis}</h3>
                      <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">
                        {ai.analysis}
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="font-display font-bold text-sm">{t.improved_prompt}</h3>
                        <button
                          onClick={copy}
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary"
                        >
                          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{" "}
                          {copied ? t.copied : t.copy}
                        </button>
                      </div>
                      <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-border bg-card p-3 font-mono text-xs">
                        {ai.improvedPrompt}
                      </pre>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          onClick={() => handleUseImproved(ai.improvedPrompt)}
                          className="text-xs font-semibold text-primary hover:underline"
                        >
                          {t.use_rescore}
                        </button>
                        <button
                          onClick={() => setShowComparisonSection(true)}
                          className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                        >
                          <ArrowRightLeft className="h-3.5 w-3.5" /> View Side-by-Side Comparison →
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Results Sidebar */}
            <aside className="rounded-2xl border border-border bg-card p-5 shadow-card lg:col-span-2">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold">{t.score}</h2>
                {multilingualAnalysis && (
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                    {multilingualAnalysis.detection.languageName} ({multilingualAnalysis.detection.writingStyle.replace("_", " ")})
                  </span>
                )}
              </div>

              {!analysis && !multilingualAnalysis ? (
                <div className="mt-6 rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
                  <Gauge className="mx-auto mb-2 h-8 w-8 text-primary" />
                  {t.empty_score}
                </div>
              ) : (
                <>
                  <div className="mt-4 flex items-end gap-3">
                    <span className="font-display text-6xl font-extrabold text-brand">
                      {multilingualAnalysis ? multilingualAnalysis.overallScore : analysis?.total}
                    </span>
                    <span className="pb-2 text-muted-foreground">/ 100</span>
                    <span
                      className={`mb-3 ml-auto rounded-full px-3 py-1 text-xs font-semibold text-primary-foreground ${bandColor(
                        multilingualAnalysis ? multilingualAnalysis.overallScore : (analysis?.total || 0),
                      )}`}
                    >
                      {multilingualAnalysis ? multilingualAnalysis.rating : analysis?.band}
                    </span>
                  </div>

                  {multilingualAnalysis && (
                    <div className="mt-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-[11px] text-emerald-800 dark:text-emerald-300">
                      <span className="font-bold">✓ Fairness Guaranteed:</span> {multilingualAnalysis.fairnessNote}
                    </div>
                  )}

                  <p className="mt-2 text-xs text-muted-foreground">{t.heuristic_note}</p>

                  {/* 8 Language-Aware Evaluation Dimensions */}
                  {multilingualAnalysis ? (
                    <div className="mt-4 space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Quality Dimensions (8 Parameters)
                      </h3>
                      {Object.entries(multilingualAnalysis.parameters).map(([key, p]) => (
                        <div key={key}>
                          <div className="flex justify-between text-xs font-medium">
                            <span>{p.name}</span>
                            <span className="font-bold text-foreground">{p.score}/100</span>
                          </div>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-brand transition-all duration-500"
                              style={{ width: `${p.score}%` }}
                            />
                          </div>
                        </div>
                      ))}

                      {/* Strengths and Missing Elements */}
                      {multilingualAnalysis.strengths.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                            Strengths
                          </h4>
                          <ul className="mt-1 space-y-1 text-xs">
                            {multilingualAnalysis.strengths.map((s, idx) => (
                              <li key={idx} className="flex items-start gap-1.5 text-muted-foreground">
                                <span className="text-emerald-500">✓</span>
                                <span>{s}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {multilingualAnalysis.missingElements.length > 0 && (
                        <div className="mt-3">
                          <h4 className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                            Missing Elements
                          </h4>
                          <ul className="mt-1 space-y-1 text-xs">
                            {multilingualAnalysis.missingElements.map((m, idx) => (
                              <li key={idx} className="flex items-start gap-1.5 text-muted-foreground">
                                <span className="text-amber-500">⚠</span>
                                <span>{m}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <ul className="mt-5 space-y-4">
                      {analysis?.criteria.map((c) => (
                        <li key={c.key}>
                          <div className="flex justify-between text-xs font-medium">
                            <span>{crit(c.key, c.label)}</span>
                            <span className="text-muted-foreground">
                              {c.score}/{c.max}
                            </span>
                          </div>
                          <div
                            className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted"
                            role="progressbar"
                            aria-valuenow={c.score}
                            aria-valuemax={c.max}
                            aria-label={c.label}
                          >
                            <div
                              className="h-full rounded-full bg-brand transition-all duration-700"
                              style={{ width: `${(c.score / c.max) * 100}%` }}
                            />
                          </div>
                          {c.notes.length > 0 && (
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {c.notes.join(" ")}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}

                  {suggestions.length > 0 && !multilingualAnalysis && (
                    <div className="mt-6">
                      <h3 className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        {t.suggestions}
                      </h3>
                      <ul className="mt-2 space-y-2 text-xs">
                        {suggestions.map((x, i) => (
                          <li key={i} className="rounded-lg bg-muted p-2.5">
                            <span className="font-semibold text-primary">{x.c}:</span> {x.s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </aside>
          </div>
        ) : (
          /* Standalone Comparison Workspace Mode */
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-extrabold">
                  {t.before_after} Comparison Workspace
                </h2>
                <p className="text-xs text-muted-foreground">
                  Review original prompt and improved prompt side by side with real-time score difference calculations.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={loadSampleComparison} className={ghost}>
                  <Lightbulb className="h-4 w-4" /> Load Sample Comparison
                </button>
                <button
                  onClick={runImprove}
                  disabled={!prompt.trim() || aiLoading}
                  className={primary}
                >
                  {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                  {t.improve}
                </button>
              </div>
            </div>

            <fieldset className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <legend className="px-2 text-xs font-semibold text-muted-foreground">
                {t.category}
              </legend>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    aria-pressed={category === c}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                      category === c
                        ? "border-primary bg-accent text-accent-foreground"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    {cat(c)}
                  </button>
                ))}
              </div>
            </fieldset>

            <BeforeAfterComparison
              beforePrompt={prompt}
              afterPrompt={improvedPrompt || (ai?.ok ? ai.improvedPrompt : "")}
              category={category}
              aiAnalysis={ai?.ok ? ai.analysis : undefined}
              onUseImproved={handleUseImproved}
              onUpdateBeforePrompt={(text) => {
                setPrompt(text);
                setOriginalSnapshot(text);
              }}
              onUpdateAfterPrompt={(text) => setImprovedPrompt(text)}
              isEditable={true}
            />
          </div>
        )}

        {/* Embedded Before vs After Comparison section in Single Prompt view */}
        {viewMode === "checker" && showComparisonSection && (
          <section id="before-after" className="mt-12 border-t border-border pt-10">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  <ArrowRightLeft className="h-3.5 w-3.5" /> Side-by-Side Review
                </span>
                <h2 className="mt-2 font-display text-2xl font-bold">{t.before_after}</h2>
                <p className="text-xs text-muted-foreground">
                  Real-time side-by-side comparison with calculated score difference and improvement highlights.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowComparisonSection(false)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  Hide comparison
                </button>
              </div>
            </div>

            <BeforeAfterComparison
              beforePrompt={beforePromptForComparison}
              afterPrompt={afterPromptForComparison}
              category={category}
              aiAnalysis={ai?.ok ? ai.analysis : undefined}
              onUseImproved={handleUseImproved}
              onUpdateBeforePrompt={(text) => setPrompt(text)}
              onUpdateAfterPrompt={(text) => setImprovedPrompt(text)}
              isEditable={true}
            />
          </section>
        )}
      </main>

      <section id="how" className="border-t border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="font-display text-3xl font-extrabold">{t.how}</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t.how_sub}</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ["Clarity", 20, "Action verb, sentence length, vague words."],
              ["Specificity", 25, "Length, numbers, named terms, category keywords."],
              ["Context", 20, "Role/background, stated purpose, audience."],
              ["Output", 20, "Format, length, tone or style."],
              ["Constraints", 15, "Rules, examples, structure."],
            ].map(([k, w, d]) => (
              <div key={k as string} className="rounded-xl border border-border p-4">
                <div className="text-xs font-semibold text-primary">{w} pts</div>
                <div className="mt-1 font-display font-bold">{crit((k as string).toLowerCase(), k as string)}</div>
                <p className="mt-1 text-xs text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-6 text-center text-xs text-muted-foreground">{t.footer}</footer>
    </div>
  );
}
