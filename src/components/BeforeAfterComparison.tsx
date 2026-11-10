import { useState, useMemo } from "react";
import {
  Sparkles,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  Copy,
  Check,
  RotateCcw,
  Lightbulb,
  ArrowRightLeft,
  Download,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useLang } from "@/lib/i18n";
import {
  comparePrompts,
  buildReport,
  type Category,
  SAMPLE_PROMPT,
  SAMPLE_IMPROVED_PROMPT,
} from "@/lib/analyzer";

interface BeforeAfterComparisonProps {
  beforePrompt: string;
  afterPrompt: string;
  category: Category;
  aiAnalysis?: string | undefined;
  onUseImproved?: ((improvedText: string) => void) | undefined;
  onUpdateBeforePrompt?: ((text: string) => void) | undefined;
  onUpdateAfterPrompt?: ((text: string) => void) | undefined;
  isEditable?: boolean | undefined;
}

function bandColor(total: number) {
  return total >= 70
    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
    : total >= 50
      ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
      : "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30";
}

function scoreBg(total: number) {
  return total >= 70
    ? "text-emerald-600 dark:text-emerald-400"
    : total >= 50
      ? "text-amber-600 dark:text-amber-400"
      : "text-rose-600 dark:text-rose-400";
}

export function BeforeAfterComparison({
  beforePrompt,
  afterPrompt,
  category,
  aiAnalysis,
  onUseImproved,
  onUpdateBeforePrompt,
  onUpdateAfterPrompt,
  isEditable = false,
}: BeforeAfterComparisonProps) {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);
  const [showResolved, setShowResolved] = useState(true);
  const [showCriteriaDetail, setShowCriteriaDetail] = useState(true);

  const comparison = useMemo(
    () => comparePrompts(beforePrompt, afterPrompt, category),
    [beforePrompt, afterPrompt, category],
  );

  const handleCopy = async () => {
    if (!afterPrompt) return;
    try {
      await navigator.clipboard.writeText(afterPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleDownload = () => {
    const report = buildReport(
      beforePrompt,
      category,
      comparison.before,
      aiAnalysis ? { analysis: aiAnalysis, improvedPrompt: afterPrompt } : undefined,
      afterPrompt,
    );
    const url = URL.createObjectURL(new Blob([report], { type: "text/plain" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `before-vs-after-comparison-${category.toLowerCase()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const scoreDiff = comparison.scoreDiff;
  const isPositive = scoreDiff > 0;
  const isNeutral = scoreDiff === 0;

  return (
    <div className="space-y-6">
      {/* Top Banner: Score Difference & Overview */}
      <div className="rounded-2xl border border-border bg-gradient-to-r from-card via-card to-accent/20 p-5 shadow-card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand/10 text-brand">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-lg font-bold leading-tight">
                {t.ba_title}
              </h2>
              <p className="text-xs text-muted-foreground">
                Category: <span className="font-medium text-foreground">{category}</span> · Real-time scoring
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm transition hover:bg-muted"
              title="Download comparison report"
            >
              <Download className="h-3.5 w-3.5" />
              Export comparison
            </button>
            {isEditable && onUpdateBeforePrompt && onUpdateAfterPrompt && (
              <button
                onClick={() => {
                  const temp = beforePrompt;
                  onUpdateBeforePrompt(afterPrompt);
                  onUpdateAfterPrompt(temp);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm transition hover:bg-muted"
                title="Swap Before and After prompts"
              >
                <ArrowRightLeft className="h-3.5 w-3.5" />
                Swap
              </button>
            )}
          </div>
        </div>

        {/* Score comparison cards */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* Before Score Card */}
          <div className="rounded-xl border border-border/80 bg-background/80 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t.ba_original}
              </span>
              <span
                className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${bandColor(
                  comparison.before.total,
                )}`}
              >
                {comparison.before.band}
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className={`font-display text-4xl font-extrabold ${scoreBg(comparison.before.total)}`}>
                {comparison.before.total}
              </span>
              <span className="text-sm font-medium text-muted-foreground">/ 100</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {comparison.before.wordCount} words · {comparison.before.criteria.filter((c) => c.score > 0).length}/5 criteria passed
            </p>
          </div>

          {/* Score Delta Card */}
          <div
            className={`rounded-xl border p-4 ${
              isPositive
                ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-950 dark:text-emerald-100"
                : isNeutral
                  ? "border-border bg-muted/40"
                  : "border-rose-500/30 bg-rose-500/5 text-rose-950 dark:text-rose-100"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Score Difference
              </span>
              <TrendingUp
                className={`h-4 w-4 ${
                  isPositive
                    ? "text-emerald-600 dark:text-emerald-400"
                    : isNeutral
                      ? "text-muted-foreground"
                      : "rotate-180 text-rose-600 dark:text-rose-400"
                }`}
              />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span
                className={`font-display text-4xl font-extrabold ${
                  isPositive
                    ? "text-emerald-600 dark:text-emerald-400"
                    : isNeutral
                      ? "text-foreground"
                      : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {isPositive ? `+${scoreDiff}` : scoreDiff}
              </span>
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                points
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {isPositive
                ? `+${comparison.percentageChange}% score gain · ${
                    comparison.wordDiff >= 0 ? `+${comparison.wordDiff}` : comparison.wordDiff
                  } words`
                : isNeutral
                  ? "Scores are identical"
                  : `${scoreDiff} point change`}
            </p>
          </div>

          {/* After Score Card */}
          <div className="rounded-xl border border-border/80 bg-background/80 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t.ba_improved}
              </span>
              <span
                className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${bandColor(
                  comparison.after.total,
                )}`}
              >
                {comparison.after.band}
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className={`font-display text-4xl font-extrabold ${scoreBg(comparison.after.total)}`}>
                {comparison.after.total}
              </span>
              <span className="text-sm font-medium text-muted-foreground">/ 100</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {comparison.after.wordCount} words · {comparison.after.criteria.filter((c) => c.score > 0).length}/5 criteria passed
            </p>
          </div>
        </div>
      </div>

      {/* Side-by-Side Prompts Display */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Before Column */}
        <div className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-muted px-2.5 py-1 text-xs font-bold text-muted-foreground">
                BEFORE
              </span>
              <h3 className="font-display text-sm font-bold">Original Prompt</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{comparison.before.wordCount} words</span>
              <span
                className={`rounded-full border px-2 py-0.5 text-xs font-bold ${bandColor(
                  comparison.before.total,
                )}`}
              >
                {comparison.before.total} pts
              </span>
            </div>
          </div>

          <div className="mt-3 flex-1">
            {isEditable && onUpdateBeforePrompt ? (
              <textarea
                value={beforePrompt}
                onChange={(e) => onUpdateBeforePrompt(e.target.value)}
                rows={10}
                placeholder="Type or paste the original prompt here..."
                className="w-full resize-y rounded-xl border border-input bg-background p-4 font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring"
              />
            ) : (
              <pre className="min-h-52 w-full whitespace-pre-wrap rounded-xl border border-border/60 bg-muted/30 p-4 font-mono text-sm leading-relaxed text-foreground/90">
                {beforePrompt || (
                  <span className="italic text-muted-foreground">
                    (No original prompt entered)
                  </span>
                )}
              </pre>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
            <span>Band: {comparison.before.band}</span>
            <span>
              {comparison.before.criteria.filter((c) => c.score === c.max).length} maxed criteria
            </span>
          </div>
        </div>

        {/* After Column */}
        <div className="flex flex-col rounded-2xl border border-brand/30 bg-card p-5 shadow-card ring-1 ring-brand/20">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-brand text-primary-foreground px-2.5 py-1 text-xs font-bold">
                AFTER
              </span>
              <h3 className="font-display text-sm font-bold text-foreground">Improved Prompt</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{comparison.after.wordCount} words</span>
              <span
                className={`rounded-full border px-2 py-0.5 text-xs font-bold ${bandColor(
                  comparison.after.total,
                )}`}
              >
                {comparison.after.total} pts
              </span>
            </div>
          </div>

          <div className="mt-3 flex-1">
            {isEditable && onUpdateAfterPrompt ? (
              <textarea
                value={afterPrompt}
                onChange={(e) => onUpdateAfterPrompt(e.target.value)}
                rows={10}
                placeholder="Type, paste, or let AI generate the improved prompt here..."
                className="w-full resize-y rounded-xl border border-input bg-background p-4 font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring"
              />
            ) : (
              <pre className="min-h-52 w-full whitespace-pre-wrap rounded-xl border border-brand/20 bg-brand/5 p-4 font-mono text-sm leading-relaxed text-foreground">
                {afterPrompt || (
                  <span className="italic text-muted-foreground">
                    (No improved prompt generated yet)
                  </span>
                )}
              </pre>
            )}
          </div>

          {/* Action buttons on Improved Prompt */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                disabled={!afterPrompt.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm transition hover:bg-muted disabled:opacity-50"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied!" : "Copy prompt"}
              </button>

              {onUseImproved && (
                <button
                  onClick={() => onUseImproved(afterPrompt)}
                  disabled={!afterPrompt.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                  Use as active prompt
                </button>
              )}
            </div>

            <span className="text-xs text-muted-foreground">
              {scoreDiff > 0 ? `+${scoreDiff} pts higher` : scoreDiff === 0 ? "Same score" : `${scoreDiff} pts`}
            </span>
          </div>
        </div>
      </div>

      {/* AI Analysis / Note (if present) */}
      {aiAnalysis && (
        <div className="rounded-2xl border border-border bg-accent/30 p-5 shadow-card">
          <div className="flex items-center gap-2 font-display text-sm font-bold text-foreground">
            <Info className="h-4 w-4 text-primary" />
            AI Critique & Enhancement Rationale
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {aiAnalysis}
          </p>
        </div>
      )}

      {/* Criteria Breakdown & Improvements */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Criteria Score Breakdown (2 cols) */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display font-bold">Criteria Score Breakdown</h3>
              <p className="text-xs text-muted-foreground">
                How each of the 5 criteria changed from Before to After
              </p>
            </div>
            <button
              onClick={() => setShowCriteriaDetail(!showCriteriaDetail)}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              {showCriteriaDetail ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {showCriteriaDetail ? "Hide notes" : "Show notes"}
            </button>
          </div>

          <div className="mt-5 space-y-4">
            {comparison.criteria.map((c) => {
              const critDiff = c.diff;
              const hasImproved = critDiff > 0;
              const hasRegressed = critDiff < 0;

              return (
                <div key={c.key} className="rounded-xl border border-border/70 bg-background/50 p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{c.label}</span>
                      <span className="text-xs text-muted-foreground">max {c.max} pts</span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span className="text-xs text-muted-foreground">
                        {c.beforeScore} → <strong className="text-foreground">{c.afterScore}</strong>
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          hasImproved
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                            : hasRegressed
                              ? "bg-rose-500/15 text-rose-700 dark:text-rose-400"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {hasImproved ? `+${critDiff} pts` : critDiff === 0 ? "0 pts" : `${critDiff} pts`}
                      </span>
                    </div>
                  </div>

                  {/* Progress bars: Before vs After */}
                  <div className="mt-2.5 space-y-1.5">
                    {/* Before progress */}
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="w-12 shrink-0">Before:</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-muted-foreground/60 transition-all duration-500"
                          style={{ width: `${(c.beforeScore / c.max) * 100}%` }}
                        />
                      </div>
                      <span className="w-8 text-right font-mono">{c.beforeScore}</span>
                    </div>

                    {/* After progress */}
                    <div className="flex items-center gap-2 text-[11px] text-foreground">
                      <span className="w-12 shrink-0 font-medium">After:</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            hasImproved ? "bg-emerald-500" : "bg-brand"
                          }`}
                          style={{ width: `${(c.afterScore / c.max) * 100}%` }}
                        />
                      </div>
                      <span className="w-8 text-right font-mono font-bold">{c.afterScore}</span>
                    </div>
                  </div>

                  {/* Criterion Notes */}
                  {showCriteriaDetail && (
                    <div className="mt-2.5 border-t border-border/50 pt-2 text-xs text-muted-foreground">
                      {c.newNotes.length > 0 ? (
                        <p className="text-emerald-700 dark:text-emerald-400">
                          <span className="font-semibold">New in After:</span> {c.newNotes.join(" ")}
                        </p>
                      ) : c.afterNotes.length > 0 ? (
                        <p>{c.afterNotes.join(" ")}</p>
                      ) : (
                        <p className="italic">No specific rule matched.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Improvements & Resolved Suggestions (1 col) */}
        <div className="space-y-6">
          {/* Key Improvements List */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <h3 className="font-display font-bold">Key Improvements</h3>
            <p className="text-xs text-muted-foreground">
              What made the prompt stronger
            </p>

            {comparison.improvements.length === 0 ? (
              <p className="mt-4 text-xs text-muted-foreground">
                No significant improvements detected between the two versions.
              </p>
            ) : (
              <ul className="mt-4 space-y-2.5 text-xs">
                {comparison.improvements.map((imp, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 rounded-lg bg-emerald-500/10 p-2.5 text-emerald-900 dark:text-emerald-200"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>{imp}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Resolved Suggestions */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold">Resolved Suggestions</h3>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">
                {comparison.resolvedSuggestions.length} fixed
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Suggestions from the original prompt fixed in the rewrite
            </p>

            {comparison.resolvedSuggestions.length === 0 ? (
              <p className="mt-4 text-xs text-muted-foreground">
                No previous suggestions were addressed or original prompt had none.
              </p>
            ) : (
              <ul className="mt-4 space-y-2 text-xs">
                {comparison.resolvedSuggestions.map((sug, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 rounded-lg bg-muted/60 p-2 text-muted-foreground"
                  >
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>{sug}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}