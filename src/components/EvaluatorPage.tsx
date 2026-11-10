import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Layers,
  Sparkles,
  Play,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Plus,
  Trash2,
  RotateCcw,
  Check,
  History,
  TrendingUp,
  BarChart3,
  Sliders,
  FileText,
} from "lucide-react";
import {
  runPromptEvaluation,
  getEvaluationHistory,
  type FullEvaluationResult,
  type DimensionEvaluation,
  type TestCaseResult,
} from "@/lib/evaluator.functions";
import { CATEGORIES, type Category } from "@/lib/analyzer";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PromptIQLayout } from "./PromptIQLayout";

export function EvaluatorPage() {
  const { t } = useLang();
  const runEvaluationFn = useServerFn(runPromptEvaluation);
  const getHistoryFn = useServerFn(getEvaluationHistory);

  const [prompt, setPrompt] = useState(
    "Act as a financial advisor. Review a family's monthly budget of $6,000, assess debt obligations, and outline an emergency fund strategy with specific savings allocations.",
  );
  const [category, setCategory] = useState<Category>("Business");
  const [testCases, setTestCases] = useState<
    { id: string; name: string; input: string; expectedBehavior: string }[]
  >([
    {
      id: "tc_1",
      name: "High Debt Burden",
      input: "Single earner family with $1,200 monthly student loan debt and 2 dependents.",
      expectedBehavior: "Must prioritize high-interest debt and allocate minimum 10% to liquid emergency savings.",
    },
    {
      id: "tc_2",
      name: "Zero Safety Net",
      input: "Dual income family with no debt but zero emergency savings.",
      expectedBehavior: "Must recommend 3-6 months living expenses in high-yield savings before speculative investments.",
    },
    {
      id: "tc_3",
      name: "Freelance Income Volatility",
      input: "Variable freelance income averaging $6,000 with irregular quarterly spikes.",
      expectedBehavior: "Must propose a buffer fund framework to smooth out irregular months.",
    },
  ]);
  const [newTestCaseInput, setNewTestCaseInput] = useState("");

  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<FullEvaluationResult | null>(null);
  const [historyList, setHistoryList] = useState<any[]>([]);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const res = await getHistoryFn();
      if (Array.isArray(res)) {
        setHistoryList(res);
      }
    } catch (e) {
      console.error("Failed to load evaluation history:", e);
    }
  };

  const addTestCase = () => {
    if (!newTestCaseInput.trim()) return;
    const newCase = {
      id: `tc_${Date.now()}`,
      name: `Test Scenario #${testCases.length + 1}`,
      input: newTestCaseInput.trim(),
      expectedBehavior: "Provide structured, relevant recommendations tailored to constraints.",
    };
    setTestCases([...testCases, newCase]);
    setNewTestCaseInput("");
  };

  const removeTestCase = (idx: number) => {
    setTestCases(testCases.filter((_, i) => i !== idx));
  };

  const handleRun = async () => {
    if (!prompt.trim()) return;
    setIsRunning(true);

    try {
      const res = await runEvaluationFn({
        data: {
          prompt: prompt.trim(),
          category,
          testCases,
        },
      });

      if (res) {
        setResult(res);
        loadHistory();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <PromptIQLayout
      title={t.eval_title}
      subtitle={t.eval_sub}
    >
      <div className="space-y-6">
        {/* Main Input Configuration */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <label className="text-sm font-semibold text-foreground">Target Prompt to Evaluate</label>
                <p className="text-xs text-muted-foreground">
                  The evaluation suite runs analytical scoring across clarity, context, specificity, and constraints.
                </p>
              </div>

              {/* Category Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Domain:</span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Category)}
                  className="rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Textarea
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Paste prompt to benchmark..."
              className="font-mono text-xs leading-relaxed"
            />

            {/* Test Cases Builder */}
            <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-foreground">Test Case Scenarios ({testCases.length})</h4>
                  <p className="text-[11px] text-muted-foreground">
                    Define boundary, ordinary, and stress tests to measure prompt resilience.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {testCases.map((tc, idx) => (
                  <div key={tc.id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs">
                    <span className="font-mono text-[11px] text-muted-foreground">#{idx + 1}</span>
                    <span className="flex-1 text-foreground font-medium">{tc.input}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => removeTestCase(idx)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTestCaseInput}
                    onChange={(e) => setNewTestCaseInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTestCase())}
                    placeholder="Add a new test scenario (e.g. Edge case with empty inputs)..."
                    className="flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <Button size="sm" variant="outline" onClick={addTestCase} className="gap-1 text-xs">
                    <Plus className="h-3.5 w-3.5" />
                    Add Case
                  </Button>
                </div>
              </div>
            </div>

            {/* Execute Run */}
            <div className="flex items-center justify-end pt-2">
              <Button
                onClick={handleRun}
                disabled={isRunning || !prompt.trim()}
                className="gap-2 font-semibold shadow-sm"
              >
                {isRunning ? (
                  <>
                    <Sparkles className="h-4 w-4 animate-spin" />
                    Benchmarking Prompt...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 fill-current" />
                    Run AI Benchmark Suite
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Evaluation Results Display */}
        {result && (
          <div className="space-y-6">
            {/* Top Score Banner */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Overall Benchmark Score
                  </span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-4xl font-black text-primary">{result.overallScore}</span>
                    <span className="text-sm font-semibold text-muted-foreground">/100</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Rating Tier: <span className="font-bold text-foreground capitalize">{result.band}</span>
                  </p>
                </div>
                <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <BarChart3 className="h-8 w-8" />
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Identified Weaknesses
                </span>
                <div className="mt-2 text-2xl font-bold text-amber-500">
                  {result.missingInformation.length} Items Found
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Missing constraints & output format requirements</p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Actionable Recommendations
                </span>
                <div className="mt-2 text-2xl font-bold text-emerald-500">
                  {result.actionableImprovements.length} Optimizations
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Heuristic and model-grounded suggestions</p>
              </div>
            </div>

            {/* 6 Dimensions Breakdown */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h3 className="font-display text-base font-bold text-foreground mb-4">
                Dimensional Evaluation Breakdown
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {result.dimensions.map((dim: DimensionEvaluation) => (
                  <div key={dim.key} className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">{dim.label}</span>
                      <span className="font-mono text-xs font-bold text-primary">{dim.score}/{dim.max}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full ${
                          dim.percentage >= 80 ? "bg-emerald-500" : dim.percentage >= 50 ? "bg-amber-500" : "bg-destructive"
                        }`}
                        style={{ width: `${dim.percentage}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-normal">{dim.explanation}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Weaknesses and Improvements side-by-side */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-amber-500">
                  <AlertTriangle className="h-5 w-5" />
                  <h4 className="font-bold text-foreground text-sm">Missing Information & Weaknesses</h4>
                </div>
                <ul className="space-y-2 text-xs">
                  {result.missingInformation.map((item: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2 text-muted-foreground">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-emerald-500">
                  <Lightbulb className="h-5 w-5" />
                  <h4 className="font-bold text-foreground text-sm">Actionable Improvements</h4>
                </div>
                <ul className="space-y-2 text-xs">
                  {result.actionableImprovements.map((item: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2 text-foreground">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Test Case Evaluation Results Table */}
            {result.testCaseResults && result.testCaseResults.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
                <h3 className="font-display text-base font-bold text-foreground">
                  Test Case Simulation Benchmarks
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="pb-3 font-semibold">Test Scenario</th>
                        <th className="pb-3 font-semibold">Status</th>
                        <th className="pb-3 font-semibold">Score</th>
                        <th className="pb-3 font-semibold">Behavior Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {result.testCaseResults.map((tc: TestCaseResult, idx: number) => (
                        <tr key={tc.testCaseId || idx} className="hover:bg-muted/30">
                          <td className="py-3 pr-4 font-mono text-[11px] text-foreground">{tc.testInput}</td>
                          <td className="py-3 pr-4">
                            <Badge
                              variant="outline"
                              className={
                                tc.passed
                                  ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/10"
                                  : "border-amber-500/30 text-amber-600 bg-amber-500/10"
                              }
                            >
                              {tc.passed ? "Resilient" : "Needs Guardrail"}
                            </Badge>
                          </td>
                          <td className="py-3 pr-4 font-bold text-foreground">{tc.score}/100</td>
                          <td className="py-3 text-muted-foreground">{tc.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Evaluation History Section */}
        {historyList.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                <h3 className="font-display text-base font-bold text-foreground">Persistent Evaluation History</h3>
              </div>
              <span className="text-xs text-muted-foreground">Stored in SQLite</span>
            </div>

            <div className="space-y-3">
              {historyList.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  onClick={() => setPrompt(item.prompt)}
                  className="group flex cursor-pointer items-center justify-between rounded-xl border border-border bg-muted/10 p-3 text-xs transition hover:border-primary/40 hover:bg-muted/30"
                >
                  <div className="min-w-0 flex-1 pr-4">
                    <p className="line-clamp-1 font-medium text-foreground">{item.prompt}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-primary">{item.overallScore}/100</span>
                    <span className="text-[10px] font-semibold uppercase text-muted-foreground group-hover:text-primary">
                      Reload
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PromptIQLayout>
  );
}
