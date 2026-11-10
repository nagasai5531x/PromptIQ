// Visual Prompt Workflow Builder & Execution Engine
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import crypto from "node:crypto";
import { getDb, logActivity } from "./db.server";
import { analyzePrompt } from "./analyzer";
import { scanPrompt, sanitizeSecrets } from "./security";
import { callGroq } from "./groq.server";

export type WorkflowNode = {
  id: string;
  type: "input_prompt" | "optimizer" | "security_checker" | "ai_model" | "evaluator" | "final_response";
  label: string;
  position: { x: number; y: number };
  data: Record<string, any>;
};

export type WorkflowEdge = {
  id: string;
  source: string;
  target: string;
};

export type Workflow = {
  id: string;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  updatedAt: number;
};

export type NodeExecutionLog = {
  nodeId: string;
  nodeType: string;
  status: "pending" | "running" | "success" | "error";
  inputData: any;
  outputData: any;
  executionTimeMs: number;
  message?: string;
};

export type WorkflowExecutionResult = {
  success: boolean;
  workflowId: string;
  totalTimeMs: number;
  nodeLogs: Record<string, NodeExecutionLog>;
  finalOutput: string;
  error?: string;
};

export const getWorkflows = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ userId: z.string().optional() }).parse(d))
  .handler(async (): Promise<Workflow[]> => {
    try {
      const db = getDb();
      const rows = db.prepare("SELECT * FROM workflows ORDER BY updated_at DESC;").all() as any[];
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description || "",
        nodes: JSON.parse(r.nodes_json || "[]"),
        edges: JSON.parse(r.edges_json || "[]"),
        updatedAt: r.updated_at,
      }));
    } catch {
      return [];
    }
  });

export const saveWorkflow = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      id: z.string().optional(),
      name: z.string().min(1),
      description: z.string().default(""),
      nodes: z.array(z.any()),
      edges: z.array(z.any()),
      userId: z.string().default("usr_admin_001"),
    }).parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; workflowId: string }> => {
    try {
      const db = getDb();
      const workflowId = data.id || "wf_" + crypto.randomUUID().slice(0, 8);
      const now = Date.now();

      const existing = db.prepare("SELECT id FROM workflows WHERE id = ?;").get(workflowId);
      if (existing) {
        db.prepare(`
          UPDATE workflows
          SET name = ?, description = ?, nodes_json = ?, edges_json = ?, updated_at = ?
          WHERE id = ?;
        `).run(data.name, data.description, JSON.stringify(data.nodes), JSON.stringify(data.edges), now, workflowId);
      } else {
        db.prepare(`
          INSERT INTO workflows (id, user_id, name, description, nodes_json, edges_json, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        `).run(workflowId, data.userId, data.name, data.description, JSON.stringify(data.nodes), JSON.stringify(data.edges), now, now);
      }

      logActivity({
        userId: data.userId || "usr_admin_001",
        activityType: "WORKFLOW_SAVE",
        activityDescription: `Saved workflow pipeline: "${data.name}" (${data.nodes.length} nodes)`,
        moduleName: "Visual Workflow",
        metadata: { workflowId, name: data.name, nodesCount: data.nodes.length },
      });

      return { ok: true, workflowId };
    } catch {
      return { ok: false, workflowId: "" };
    }
  });

export const deleteWorkflow = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    try {
      const db = getDb();
      db.prepare("DELETE FROM workflows WHERE id = ?;").run(data.id);
      return { ok: true };
    } catch {
      return { ok: false };
    }
  });

export const executeWorkflow = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      workflowId: z.string(),
      nodes: z.array(z.any()),
      edges: z.array(z.any()),
      inputPromptOverride: z.string().optional(),
    }).parse(d),
  )
  .handler(async ({ data }): Promise<WorkflowExecutionResult> => {
    const startTime = Date.now();
    const nodeLogs: Record<string, NodeExecutionLog> = {};
    const nodes: WorkflowNode[] = data.nodes;
    const edges: WorkflowEdge[] = data.edges;

    // Build topological execution queue
    const outgoingMap = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    for (const node of nodes) {
      outgoingMap.set(node.id, []);
      inDegree.set(node.id, 0);
    }
    for (const edge of edges) {
      outgoingMap.get(edge.source)?.push(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    }

    // Nodes with 0 in-degree start first
    const queue = nodes.filter((n) => (inDegree.get(n.id) || 0) === 0);
    const nodeOutputs = new Map<string, any>();
    let currentPayload = data.inputPromptOverride || "";

    while (queue.length > 0) {
      const node = queue.shift()!;
      const nodeStart = Date.now();

      // Gather input from incoming node edges
      const incomingEdges = edges.filter((e) => e.target === node.id);
      let nodeInput = currentPayload;
      if (incomingEdges.length > 0 && incomingEdges[0]) {
        nodeInput = nodeOutputs.get(incomingEdges[0].source) ?? currentPayload;
      }

      try {
        let nodeOutput: any = "";

        if (node.type === "input_prompt") {
          nodeOutput = data.inputPromptOverride || (node.data && node.data["prompt"] ? String(node.data["prompt"]) : "Draft a high-converting landing page headline for an AI dev tool.");
          currentPayload = nodeOutput;
        } else if (node.type === "optimizer") {
          // Optimization step: expand clarity and formatting
          const a = analyzePrompt(nodeInput, "General");
          nodeOutput = `Act as an expert technical copywriter. ${nodeInput}\n\nFormatting: Use clear bullet points and markdown headers.\nConstraints: Avoid vague buzzwords. Quality Score Target: 90+/100.`;
          currentPayload = nodeOutput;
        } else if (node.type === "security_checker") {
          const sec = scanPrompt(nodeInput);
          const { sanitized } = sanitizeSecrets(nodeInput);
          nodeOutput = sanitized;
          currentPayload = nodeOutput;
        } else if (node.type === "ai_model") {
          const key = process.env["GROQ_API_KEY"];
          if (key) {
            const res = await callGroq(key, [{ role: "user", content: nodeInput }], false);
            nodeOutput = res.ok ? res.content : `[Model note: ${res.message}]`;
          } else {
            nodeOutput = `[Model Output]: ${nodeInput}\n\n• Point 1: Optimized system flow\n• Point 2: Standardized data model`;
          }
          currentPayload = nodeOutput;
        } else if (node.type === "evaluator") {
          const a = analyzePrompt(nodeInput, "General");
          nodeOutput = {
            evaluatedText: nodeInput,
            score: a.total,
            band: a.band,
            wordCount: a.wordCount,
          };
        } else if (node.type === "final_response") {
          nodeOutput = typeof nodeInput === "object" ? JSON.stringify(nodeInput, null, 2) : String(nodeInput);
          currentPayload = nodeOutput;
        }

        nodeOutputs.set(node.id, nodeOutput);
        nodeLogs[node.id] = {
          nodeId: node.id,
          nodeType: node.type,
          status: "success",
          inputData: typeof nodeInput === "string" ? nodeInput.slice(0, 300) : nodeInput,
          outputData: typeof nodeOutput === "string" ? nodeOutput.slice(0, 300) : nodeOutput,
          executionTimeMs: Date.now() - nodeStart,
        };
      } catch (err: any) {
        nodeLogs[node.id] = {
          nodeId: node.id,
          nodeType: node.type,
          status: "error",
          inputData: nodeInput,
          outputData: null,
          executionTimeMs: Date.now() - nodeStart,
          message: err.message,
        };
        return {
          success: false,
          workflowId: data.workflowId,
          totalTimeMs: Date.now() - startTime,
          nodeLogs,
          finalOutput: "",
          error: `Node ${node.label} failed: ${err.message}`,
        };
      }

      // Decrement in-degree for targets
      for (const targetId of outgoingMap.get(node.id) || []) {
        inDegree.set(targetId, (inDegree.get(targetId) || 1) - 1);
        if (inDegree.get(targetId) === 0) {
          const targetNode = nodes.find((n) => n.id === targetId);
          if (targetNode) queue.push(targetNode);
        }
      }
    }

    const totalTimeMs = Date.now() - startTime;

    logActivity({
      userId: "usr_admin_001",
      activityType: "WORKFLOW_EXECUTE",
      activityDescription: `Executed workflow pipeline: ${nodes.length} nodes in ${totalTimeMs}ms`,
      moduleName: "Visual Workflow",
      metadata: { workflowId: data.workflowId, nodesCount: nodes.length, totalTimeMs },
    });

    return {
      success: true,
      workflowId: data.workflowId,
      totalTimeMs,
      nodeLogs,
      finalOutput: currentPayload,
    };
  });
