import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Cpu,
  Play,
  CheckCircle2,
  Copy,
  Check,
  Zap,
  Clock,
  Sparkles,
  Trophy,
  AlertCircle,
  HelpCircle,
  BarChart2,
  Layers,
  ArrowRight,
} from "lucide-react";
import {
  runMultiModelComparison,
  AVAILABLE_MODELS,
  type ModelResponse,
  type ModelConfig,
} from "@/lib/multi-model.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useLang } from "@/lib/i18n";
import { PromptIQLayout } from "./PromptIQLayout";

export function MultiModelPage() {
  const { t } = useLang();
  const runComparisonFn = useServerFn(runMultiModelComparison);

  const [prompt, setPrompt] = useState(
    "Explain the difference between optimistic concurrency control and pessimistic locking with a real-world database example in banking.",
  );
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([
    "groq-llama-70b",
    "groq-llama-8b",
    "groq-mixtral",
  ]);

  const [isRunning, setIsRunning] = useState(false);
  const [responses, setResponses] = useState<ModelResponse[] | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedModelId, setCopiedModelId] = useState<string | null>(null);

  const toggleModel = (id: string) => {
    setSelectedModelIds((prev) =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter((m) => m !== id) : prev) : [...prev, id],
    );
  };

  const handleRun = async () => {
    if (!prompt.trim()) return;
    setIsRunning(true);
    setErrorMsg(null);

    try {
      const res = await runComparisonFn({
        data: {
          prompt: prompt.trim(),
          selectedModelIds,
        },
      });

      if (res.ok && res.responses) {
        setResponses(res.responses);
      } else {
        setErrorMsg(res.comparisonSummary || "Execution failed");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to execute multi-model comparison.");
    } finally {
      setIsRunning(false);
    }
  };

  const copyToClipboard = (text: string, modelId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedModelId(modelId);
    setTimeout(() => setCopiedModelId(null), 2000);
  };

  return (
    <PromptIQLayout
      title={t.mm_title}
      subtitle={t.mm_sub}
    >
      <div className="space-y-6">
        {/* Top Controls Card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-semibold text-foreground">{t.mm_select_models}</label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Models will execute in parallel. Groq models use real backend Groq API endpoints.
              </p>
              <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {AVAILABLE_MODELS.map((m: ModelConfig) => {
                  const isChecked = selectedModelIds.includes(m.id);
                  return (
                    <div
                      key={m.id}
                      onClick={() => toggleModel(m.id)}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                        isChecked
                          ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary/30"
                          : "border-border bg-card/50 text-muted-foreground hover:border-primary/40 hover:bg-muted/40"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground">{m.name}</span>
                          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            {m.provider}
                          </span>
                        </div>
                        <span className="mt-1 inline-block rounded bg-muted px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">
                          {m.badge}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Prompt Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-foreground">{t.mm_prompt_label}</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setPrompt("Write a TypeScript function to safely parse and validate JWT tokens with RS256 algorithm.")
                    }
                    className="text-[11px] font-medium text-primary hover:underline"
                  >
                    Load Coding
                  </button>
                  <span className="text-xs text-muted-foreground">•</span>
                  <button
                    type="button"
                    onClick={() =>
                      setPrompt("Draft a cold email to VP of Engineering introducing an AI code review tool. Under 150 words.")
                    }
                    className="text-[11px] font-medium text-primary hover:underline"
                  >
                    Load Pitch
                  </button>
                  <span className="text-xs text-muted-foreground">•</span>
                  <button
                    type="button"
                    onClick={() =>
                      setPrompt("Naku oka AI chatbot create cheyyali, dantlo authentication and chat history undali.")
                    }
                    className="text-[11px] font-medium text-brand hover:underline"
                  >
                    Load Telugu (Romanized)
                  </button>
                  <span className="text-xs text-muted-foreground">•</span>
                  <button
                    type="button"
                    onClick={() =>
                      setPrompt("Mujhe ek AI chatbot banana hai jisme user login aur database storage ho.")
                    }
                    className="text-[11px] font-medium text-brand hover:underline"
                  >
                    Load Hindi
                  </button>
                </div>
              </div>
              <Textarea
                rows={4}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter prompt to execute across all selected models..."
                className="font-mono text-xs leading-relaxed"
              />
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-2">
              <div className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{selectedModelIds.length}</span> models selected for
                parallel execution
              </div>
              <Button
                onClick={handleRun}
                disabled={isRunning || !prompt.trim() || selectedModelIds.length === 0}
                className="gap-2 font-semibold shadow-sm"
              >
                {isRunning ? (
                  <>
                    <Zap className="h-4 w-4 animate-spin text-primary-foreground" />
                    {t.mm_running}
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 fill-current" />
                    {t.mm_run_btn}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-bold">Execution Failed</p>
              <p className="mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Results Grid */}
        {responses && responses.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart2 className="h-5 w-5 text-primary" />
                <h3 className="font-display text-lg font-bold">Parallel Execution Results</h3>
              </div>
              <span className="text-xs text-muted-foreground">Sorted by Evaluation Score</span>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {responses.map((res: ModelResponse) => {
                const isBest = res.isBest;
                const isCopied = copiedModelId === res.modelId;

                return (
                  <div
                    key={res.modelId}
                    className={`flex flex-col justify-between rounded-2xl border bg-card p-5 shadow-sm transition ${
                      isBest ? "border-primary ring-2 ring-primary/20" : "border-border"
                    }`}
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between border-b border-border pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-display text-sm font-bold text-foreground">{res.modelName}</h4>
                            {isBest && (
                              <Badge className="bg-amber-500 hover:bg-amber-600 text-white gap-1 text-[10px]">
                                <Trophy className="h-3 w-3" /> Best Output
                              </Badge>
                            )}
                          </div>
                          <p className="mt-0.5 text-[10px] font-mono text-muted-foreground">{res.modelId}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-black text-primary">{res.metrics.overall}</span>
                          <span className="text-xs text-muted-foreground">/100</span>
                        </div>
                      </div>

                      {/* Performance Telemetry */}
                      <div className="my-3 grid grid-cols-3 gap-2 rounded-xl bg-muted/40 p-2.5 text-center text-xs">
                        <div>
                          <div className="flex items-center justify-center gap-1 text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span className="text-[10px]">Latency</span>
                          </div>
                          <span className="font-mono text-xs font-bold text-foreground">{res.latencyMs} ms</span>
                        </div>
                        <div>
                          <div className="text-[10px] text-muted-foreground">Tokens</div>
                          <span className="font-mono text-xs font-bold text-foreground">
                            {res.tokens.total}
                          </span>
                        </div>
                        <div>
                          <div className="text-[10px] text-muted-foreground">Provider</div>
                          <span className="text-xs font-bold uppercase text-foreground">{res.provider}</span>
                        </div>
                      </div>

                      {/* Score Metrics Breakdown */}
                      <div className="mb-3 space-y-1.5 border-b border-border pb-3 text-[11px]">
                        <div className="flex justify-between text-muted-foreground">
                          <span>Relevance</span>
                          <span className="font-semibold text-foreground">{res.metrics.relevance}/100</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${res.metrics.relevance}%` }} />
                        </div>

                        <div className="flex justify-between text-muted-foreground">
                          <span>Clarity & Formatting</span>
                          <span className="font-semibold text-foreground">{res.metrics.clarity}/100</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-blue-500" style={{ width: `${res.metrics.clarity}%` }} />
                        </div>

                        <div className="flex justify-between text-muted-foreground">
                          <span>Completeness</span>
                          <span className="font-semibold text-foreground">{res.metrics.completeness}/100</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-emerald-500" style={{ width: `${res.metrics.completeness}%` }} />
                        </div>
                      </div>

                      {/* Generated Output Preview */}
                      <div className="space-y-1.5">
                        <span className="text-xs font-semibold text-muted-foreground">Generated Response</span>
                        <div className="max-h-64 overflow-y-auto rounded-xl border border-border bg-muted/20 p-3 font-mono text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                          {res.output}
                        </div>
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div className="mt-4 flex items-center justify-between pt-3 border-t border-border">
                      <span className="text-[11px] text-muted-foreground">
                        Prompt tokens: {res.tokens.prompt} · Completion: {res.tokens.completion}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(res.output, res.modelId)}
                        className="gap-1.5 text-xs"
                      >
                        {isCopied ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            Copy Output
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </PromptIQLayout>
  );
}
