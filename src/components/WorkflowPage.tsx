import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  GitBranch,
  Play,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldAlert,
  Cpu,
  Layers,
  ArrowRight,
  ArrowDown,
  RefreshCw,
  FolderOpen,
  ZoomIn,
  ZoomOut,
  Sliders,
  Terminal,
} from "lucide-react";
import {
  getWorkflows,
  saveWorkflow,
  deleteWorkflow,
  executeWorkflow,
  type Workflow,
  type WorkflowNode,
  type WorkflowEdge,
  type WorkflowExecutionResult,
  type NodeExecutionLog,
} from "@/lib/workflow.functions";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PromptIQLayout } from "./PromptIQLayout";

const NODE_DEFINITIONS = [
  {
    type: "input_prompt",
    label: "Input Prompt",
    icon: Sparkles,
    color: "bg-blue-500",
    description: "Accepts raw user prompt text.",
  },
  {
    type: "optimizer",
    label: "Prompt Optimizer",
    icon: Sparkles,
    color: "bg-purple-500",
    description: "Adds role framing, formatting directives, and constraints.",
  },
  {
    type: "security_checker",
    label: "Security Checker",
    icon: ShieldAlert,
    color: "bg-red-500",
    description: "Detects prompt injection and sanitizes credentials.",
  },
  {
    type: "ai_model",
    label: "AI Model (Groq)",
    icon: Cpu,
    color: "bg-emerald-500",
    description: "Sends processed prompt to Llama 3.3 70B via Groq.",
  },
  {
    type: "evaluator",
    label: "Output Evaluator",
    icon: Layers,
    color: "bg-amber-500",
    description: "Scores output completeness and quality (0-100).",
  },
  {
    type: "final_response",
    label: "Final Response",
    icon: CheckCircle2,
    color: "bg-cyan-500",
    description: "Delivers production-ready output to user.",
  },
];

export function WorkflowPage() {
  const { t } = useLang();
  const getWorkflowsFn = useServerFn(getWorkflows);
  const saveWorkflowFn = useServerFn(saveWorkflow);
  const deleteWorkflowFn = useServerFn(deleteWorkflow);
  const executeWorkflowFn = useServerFn(executeWorkflow);

  // Workflow meta
  const [workflowId, setWorkflowId] = useState("wf_default");
  const [workflowName, setWorkflowName] = useState("Enterprise Prompt Optimization Pipeline");
  const [savedWorkflows, setSavedWorkflows] = useState<Workflow[]>([]);

  // Nodes pipeline
  const [nodes, setNodes] = useState<WorkflowNode[]>([
    {
      id: "node_1",
      type: "input_prompt",
      label: "Input Prompt",
      position: { x: 50, y: 50 },
      data: { prompt: "Explain quantum computing in simple terms for high school students." },
    },
    {
      id: "node_2",
      type: "optimizer",
      label: "Prompt Optimizer",
      position: { x: 50, y: 150 },
      data: {},
    },
    {
      id: "node_3",
      type: "security_checker",
      label: "Security Guardrail",
      position: { x: 50, y: 250 },
      data: {},
    },
    {
      id: "node_4",
      type: "ai_model",
      label: "AI Model (Groq Llama 3.3 70B)",
      position: { x: 50, y: 350 },
      data: { model: "llama-3.3-70b-versatile" },
    },
    {
      id: "node_5",
      type: "final_response",
      label: "Production Response",
      position: { x: 50, y: 450 },
      data: {},
    },
  ]);

  const [inputOverride, setInputOverride] = useState(
    "Explain quantum computing in simple terms for high school students with 2 analogies.",
  );
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<WorkflowExecutionResult | null>(null);
  const [zoomLevel, setZoomLevel] = useState(100);

  useEffect(() => {
    loadSavedWorkflows();
  }, []);

  const loadSavedWorkflows = async () => {
    try {
      const res = await getWorkflowsFn({ data: {} });
      if (Array.isArray(res)) {
        setSavedWorkflows(res);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveWorkflow = async () => {
    try {
      const edges: WorkflowEdge[] = [];
      for (let i = 0; i < nodes.length - 1; i++) {
        const sourceNode = nodes[i];
        const targetNode = nodes[i + 1];
        if (sourceNode && targetNode) {
          edges.push({
            id: `edge_${sourceNode.id}_${targetNode.id}`,
            source: sourceNode.id,
            target: targetNode.id,
          });
        }
      }

      await saveWorkflowFn({
        data: {
          id: workflowId,
          name: workflowName,
          nodes,
          edges,
        },
      });
      loadSavedWorkflows();
    } catch (e) {
      console.error(e);
    }
  };

  const handleExecute = async () => {
    setIsExecuting(true);
    setExecutionResult(null);

    const edges: WorkflowEdge[] = [];
    for (let i = 0; i < nodes.length - 1; i++) {
      const sourceNode = nodes[i];
      const targetNode = nodes[i + 1];
      if (sourceNode && targetNode) {
        edges.push({
          id: `edge_${sourceNode.id}_${targetNode.id}`,
          source: sourceNode.id,
          target: targetNode.id,
        });
      }
    }

    try {
      const res = await executeWorkflowFn({
        data: {
          workflowId,
          nodes,
          edges,
          inputPromptOverride: inputOverride,
        },
      });

      if (res) {
        setExecutionResult(res);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsExecuting(false);
    }
  };

  const addNode = (def: (typeof NODE_DEFINITIONS)[0]) => {
    const newNode: WorkflowNode = {
      id: `node_${Date.now()}`,
      type: def.type as any,
      label: def.label,
      position: { x: 50, y: (nodes.length + 1) * 100 },
      data: {},
    };
    setNodes([...nodes, newNode]);
  };

  const removeNode = (id: string) => {
    if (nodes.length <= 1) return;
    setNodes(nodes.filter((n) => n.id !== id));
  };

  const moveNode = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= nodes.length) return;
    const newNodes = [...nodes];
    const temp = newNodes[index];
    const target = newNodes[targetIndex];
    if (temp && target) {
      newNodes[index] = target;
      newNodes[targetIndex] = temp;
      setNodes(newNodes);
    }
  };

  return (
    <PromptIQLayout
      title={t.wf_title}
      subtitle={t.wf_sub}
    >
      <div className="space-y-6">
        {/* Top Controls Bar */}
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <GitBranch className="h-5 w-5" />
            </div>
            <div>
              <input
                type="text"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                className="font-display text-sm font-bold text-foreground bg-transparent border-b border-dashed border-border focus:outline-none focus:border-primary"
              />
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {nodes.length} connected pipeline nodes · Visual Graph
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleSaveWorkflow} className="gap-1.5 text-xs font-semibold">
              <Save className="h-3.5 w-3.5" />
              Save Workflow
            </Button>
            <Button
              size="sm"
              onClick={handleExecute}
              disabled={isExecuting || nodes.length === 0}
              className="gap-2 font-semibold shadow-sm"
            >
              {isExecuting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Executing Pipeline...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-current" />
                  Run Workflow
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Input Prompt Configuration */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-2">
          <label className="text-xs font-semibold text-foreground">Pipeline Input Prompt</label>
          <input
            type="text"
            value={inputOverride}
            onChange={(e) => setInputOverride(e.target.value)}
            placeholder="Type prompt to feed through workflow..."
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Node Palette & Canvas Area */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          {/* Left Node Palette */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-3">
              <h4 className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Node Library
              </h4>
              <p className="text-[11px] text-muted-foreground">
                Click a node below to append it to your execution pipeline:
              </p>

              <div className="space-y-2">
                {NODE_DEFINITIONS.map((def) => {
                  const Icon = def.icon;
                  return (
                    <button
                      key={def.type}
                      onClick={() => addNode(def)}
                      className="group flex w-full items-start gap-2.5 rounded-xl border border-border bg-muted/20 p-2.5 text-left transition hover:border-primary/40 hover:bg-muted/50"
                    >
                      <div className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg ${def.color} text-white`}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground group-hover:text-primary">
                            {def.label}
                          </span>
                          <Plus className="h-3 w-3 text-muted-foreground group-hover:text-primary" />
                        </div>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">{def.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Canvas Zoom Controls */}
            <div className="flex items-center justify-between rounded-xl border border-border bg-card p-2 text-xs">
              <span className="text-muted-foreground text-[11px]">Canvas Scale: {zoomLevel}%</span>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setZoomLevel((z) => Math.max(60, z - 10))}
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setZoomLevel((z) => Math.min(140, z + 10))}
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Canvas: Pipeline Visualization */}
          <div className="lg:col-span-3 rounded-2xl border border-border bg-muted/10 p-6 shadow-sm overflow-hidden min-h-[500px]">
            <div
              className="mx-auto flex max-w-xl flex-col items-center space-y-3 transition-transform"
              style={{ transform: `scale(${zoomLevel / 100})` }}
            >
              {nodes.map((node, index) => {
                const def = NODE_DEFINITIONS.find((d) => d.type === node.type) || NODE_DEFINITIONS[0];
                const Icon = def?.icon || Sparkles;

                // Match with execution results
                const nodeLog: NodeExecutionLog | undefined = executionResult?.nodeLogs?.[node.id];
                const isRunning = isExecuting && !nodeLog;
                const isSuccess = nodeLog && nodeLog.status === "success";
                const isError = nodeLog && nodeLog.status === "error";

                return (
                  <div key={node.id} className="w-full flex flex-col items-center">
                    {/* Node Card */}
                    <div
                      className={`relative w-full rounded-2xl border bg-card p-4 shadow-sm transition ${
                        isRunning
                          ? "border-primary ring-2 ring-primary/20 animate-pulse"
                          : isSuccess
                            ? "border-emerald-500/50"
                            : isError
                              ? "border-destructive ring-2 ring-destructive/20"
                              : "border-border"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`grid h-8 w-8 place-items-center rounded-xl ${def?.color || "bg-primary"} text-white`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-foreground">{node.label}</span>
                              <Badge variant="outline" className="text-[9px] uppercase font-mono">
                                Step #{index + 1}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{def?.description}</p>
                          </div>
                        </div>

                        {/* Node Actions */}
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            onClick={() => moveNode(index, "up")}
                            disabled={index === 0}
                          >
                            ↑
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            onClick={() => moveNode(index, "down")}
                            disabled={index === nodes.length - 1}
                          >
                            ↓
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={() => removeNode(node.id)}
                            disabled={nodes.length <= 1}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Live Execution Output Telemetry */}
                      {nodeLog && (
                        <div className="mt-3 rounded-xl border border-border bg-muted/30 p-2.5 text-xs space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                            <span className="flex items-center gap-1 text-emerald-600 font-bold">
                              <CheckCircle2 className="h-3 w-3" /> Execution Complete
                            </span>
                            <span>{nodeLog.executionTimeMs} ms</span>
                          </div>
                          <p className="line-clamp-2 font-mono text-[11px] text-foreground">
                            {typeof nodeLog.outputData === "object"
                              ? JSON.stringify(nodeLog.outputData)
                              : String(nodeLog.outputData)}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Connecting Connector Arrow between sequential nodes */}
                    {index < nodes.length - 1 && (
                      <div className="my-1 flex flex-col items-center text-muted-foreground/60">
                        <div className="h-4 w-0.5 bg-border" />
                        <ArrowDown className="h-3.5 w-3.5 text-primary" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Execution Output Console */}
        {executionResult && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="h-5 w-5 text-primary" />
                <h3 className="font-display text-sm font-bold text-foreground">Workflow Execution Logs</h3>
              </div>
              <span className="font-mono text-xs text-muted-foreground">
                Total Latency: {executionResult.totalTimeMs} ms
              </span>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold text-muted-foreground">Final Pipeline Output:</span>
              <div className="rounded-xl border border-border bg-muted/20 p-4 font-mono text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                {executionResult.finalOutput}
              </div>
            </div>
          </div>
        )}
      </div>
    </PromptIQLayout>
  );
}
