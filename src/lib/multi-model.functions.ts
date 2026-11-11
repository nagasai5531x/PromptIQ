// Multi-Model Comparison Server Functions
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import fs from "node:fs";
import path from "node:path";
import { callGroq } from "./groq.server";
import { logActivity } from "./db.server";

export type ModelConfig = {
  id: string;
  name: string;
  provider: "groq" | "openai" | "gemini";
  modelKey: string;
  badge: string;
};

export const AVAILABLE_MODELS: ModelConfig[] = [
  { id: "groq-gpt-120b", name: "GPT-OSS 120B", provider: "groq", modelKey: "openai/gpt-oss-120b", badge: "Flagship" },
  { id: "groq-gpt-20b", name: "GPT-OSS 20B", provider: "groq", modelKey: "openai/gpt-oss-20b", badge: "Ultra Fast" },
  { id: "groq-qwen", name: "Qwen 3.8 27B", provider: "groq", modelKey: "qwen/qwen3.8-27b", badge: "Qwen" },
  { id: "groq-llama-70b", name: "Llama 3.3 70B", provider: "groq", modelKey: "llama-3.3-70b-versatile", badge: "Meta" },
  { id: "openai-gpt4o", name: "GPT-4o", provider: "openai", modelKey: "gpt-4o", badge: "OpenAI" },
  { id: "gemini-flash", name: "Gemini 1.5 Flash", provider: "gemini", modelKey: "gemini-1.5-flash", badge: "Gemini" },
];

export type ModelResponse = {
  modelId: string;
  modelName: string;
  provider: string;
  output: string;
  latencyMs: number;
  tokens: {
    prompt: number;
    completion: number;
    total: number;
  };
  metrics: {
    quality: number;      // 0-100
    relevance: number;    // 0-100
    clarity: number;      // 0-100
    completeness: number; // 0-100
    overall: number;      // 0-100
  };
  isBest?: boolean;
  error?: string;
};

export type MultiModelComparisonResult = {
  ok: boolean;
  prompt: string;
  responses: ModelResponse[];
  bestModelId: string | null;
  comparisonSummary: string;
};

function getApiKey(provider: "groq" | "openai" | "gemini"): string | undefined {
  const envVar = provider === "groq" ? "GROQ_API_KEY" : provider === "openai" ? "OPENAI_API_KEY" : "GEMINI_API_KEY";
  if (process.env[envVar]?.trim()) return process.env[envVar]!.trim();
  if (process.env[`VITE_${envVar}`]?.trim()) return process.env[`VITE_${envVar}`]!.trim();

  try {
    for (const f of [".env.local", ".env"]) {
      const fullPath = path.resolve(process.cwd(), f);
      if (fs.existsSync(fullPath)) {
        const text = fs.readFileSync(fullPath, "utf-8");
        const match = text.match(new RegExp(`^${envVar}\\s*=\\s*["']?([^"'\\r\\n]+)["']?`, "m"));
        if (match?.[1]?.trim()) return match[1].trim();
      }
    }
  } catch {}
  return undefined;
}

export const runMultiModelComparison = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => {
    const raw = (d && typeof d === "object" ? d : {}) as Record<string, unknown>;
    const rawList = raw["selectedModelIds"] || raw["selectedModels"] || raw["models"];
    const fallbackList = Array.isArray(rawList) && rawList.length > 0
      ? rawList.map(String)
      : ["groq-gpt-120b", "groq-gpt-20b", "groq-qwen"];

    return {
      prompt: typeof raw["prompt"] === "string" && raw["prompt"].trim().length > 0
        ? raw["prompt"]
        : "Explain the difference between optimistic concurrency control and pessimistic locking with a real-world database example in banking.",
      selectedModelIds: fallbackList,
      systemInstruction: raw["systemInstruction"] ? String(raw["systemInstruction"]) : undefined,
    };
  })
  .handler(async ({ data }): Promise<MultiModelComparisonResult> => {
    const { prompt, selectedModelIds, systemInstruction } = data;
    const groqKey = getApiKey("groq");
    const openaiKey = getApiKey("openai");
    const geminiKey = getApiKey("gemini");

    const modelsToExecute = AVAILABLE_MODELS.filter((m) => selectedModelIds.includes(m.id));

    // Parallel model execution
    const results = await Promise.all(
      modelsToExecute.map(async (m): Promise<ModelResponse> => {
        const start = Date.now();

        try {
          if (m.provider === "groq") {
            if (!groqKey) {
              return {
                modelId: m.id,
                modelName: m.name,
                provider: m.provider,
                output: "Groq API key is missing. Please add GROQ_API_KEY to your .env file.",
                latencyMs: 0,
                tokens: { prompt: 0, completion: 0, total: 0 },
                metrics: { quality: 0, relevance: 0, clarity: 0, completeness: 0, overall: 0 },
                error: "Missing GROQ_API_KEY",
              };
            }

            const messages: { role: "system" | "user"; content: string }[] = [];
            if (systemInstruction) messages.push({ role: "system", content: systemInstruction });
            messages.push({ role: "user", content: prompt });

            const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
              method: "POST",
              headers: { Authorization: `Bearer ${groqKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({ model: m.modelKey, temperature: 0.5, messages }),
            });

            const latencyMs = Date.now() - start;
            if (!res.ok) {
              const err = await res.text();
              return {
                modelId: m.id,
                modelName: m.name,
                provider: m.provider,
                output: `Provider returned status ${res.status}: ${err}`,
                latencyMs,
                tokens: { prompt: 0, completion: 0, total: 0 },
                metrics: { quality: 0, relevance: 0, clarity: 0, completeness: 0, overall: 0 },
                error: `HTTP ${res.status}`,
              };
            }

            const json = (await res.json()) as any;
            const output = json.choices?.[0]?.message?.content || "";
            const usage = json.usage || {};
            const promptTokens = usage.prompt_tokens || Math.round(prompt.split(/\s+/).length * 1.3);
            const completionTokens = usage.completion_tokens || Math.round(output.split(/\s+/).length * 1.3);

            // Compute actual quality metrics using text analysis heuristics
            const metrics = calculateResponseMetrics(prompt, output);

            return {
              modelId: m.id,
              modelName: m.name,
              provider: m.provider,
              output,
              latencyMs,
              tokens: { prompt: promptTokens, completion: completionTokens, total: promptTokens + completionTokens },
              metrics,
            };
          }

          if (m.provider === "openai") {
            if (!openaiKey) {
              return {
                modelId: m.id,
                modelName: m.name,
                provider: m.provider,
                output: "OpenAI API key not configured. Add OPENAI_API_KEY in your .env to enable OpenAI models.",
                latencyMs: 0,
                tokens: { prompt: 0, completion: 0, total: 0 },
                metrics: { quality: 0, relevance: 0, clarity: 0, completeness: 0, overall: 0 },
                error: "Missing OPENAI_API_KEY",
              };
            }
            // OpenAI integration path
            const res = await fetch("https://api.openai.com/v1/chat/completions", {
              method: "POST",
              headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({ model: m.modelKey, messages: [{ role: "user", content: prompt }] }),
            });
            const latencyMs = Date.now() - start;
            if (!res.ok) throw new Error(await res.text());
            const json = (await res.json()) as any;
            const output = json.choices?.[0]?.message?.content || "";
            return {
              modelId: m.id,
              modelName: m.name,
              provider: m.provider,
              output,
              latencyMs,
              tokens: { prompt: json.usage?.prompt_tokens || 0, completion: json.usage?.completion_tokens || 0, total: json.usage?.total_tokens || 0 },
              metrics: calculateResponseMetrics(prompt, output),
            };
          }

          if (m.provider === "gemini") {
            if (!geminiKey) {
              return {
                modelId: m.id,
                modelName: m.name,
                provider: m.provider,
                output: "Gemini API key not configured. Add GEMINI_API_KEY in your .env to enable Gemini models.",
                latencyMs: 0,
                tokens: { prompt: 0, completion: 0, total: 0 },
                metrics: { quality: 0, relevance: 0, clarity: 0, completeness: 0, overall: 0 },
                error: "Missing GEMINI_API_KEY",
              };
            }
            // Gemini integration path
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m.modelKey}:generateContent?key=${geminiKey}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
            });
            const latencyMs = Date.now() - start;
            if (!res.ok) throw new Error(await res.text());
            const json = (await res.json()) as any;
            const output = json.candidates?.[0]?.content?.parts?.[0]?.text || "";
            return {
              modelId: m.id,
              modelName: m.name,
              provider: m.provider,
              output,
              latencyMs,
              tokens: { prompt: Math.round(prompt.length / 4), completion: Math.round(output.length / 4), total: Math.round((prompt.length + output.length) / 4) },
              metrics: calculateResponseMetrics(prompt, output),
            };
          }

          throw new Error("Unsupported model provider");
        } catch (err: any) {
          return {
            modelId: m.id,
            modelName: m.name,
            provider: m.provider,
            output: `Execution error: ${err.message}`,
            latencyMs: Date.now() - start,
            tokens: { prompt: 0, completion: 0, total: 0 },
            metrics: { quality: 0, relevance: 0, clarity: 0, completeness: 0, overall: 0 },
            error: err.message,
          };
        }
      }),
    );

    // Identify the best response
    const validResponses = results.filter((r) => !r.error && r.output.length > 20);
    let bestModelId: string | null = null;
    let highestScore = -1;

    for (const r of validResponses) {
      if (r.metrics.overall > highestScore) {
        highestScore = r.metrics.overall;
        bestModelId = r.modelId;
      }
    }

    if (bestModelId) {
      const best = results.find((r) => r.modelId === bestModelId);
      if (best) best.isBest = true;
    }

    const summary = bestModelId
      ? `Evaluation complete across ${results.length} models. ${results.find((r) => r.modelId === bestModelId)?.modelName} delivered the highest overall quality score (${highestScore}/100) with well-structured reasoning.`
      : "Executed multi-model comparison.";

    logActivity({
      userId: "usr_admin_001",
      activityType: "MULTI_MODEL_COMPARE",
      activityDescription: `Executed parallel benchmark across ${results.length} AI models`,
      moduleName: "Multi-Model Matrix",
      metadata: { modelsCount: results.length, bestModelId, highestScore },
    });

    return {
      ok: true,
      prompt,
      responses: results,
      bestModelId,
      comparisonSummary: summary,
    };
  });

// Real heuristic scoring of model output against prompt
function calculateResponseMetrics(prompt: string, output: string) {
  const promptWords = prompt.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  const outputWords = output.toLowerCase().split(/\s+/);
  const wordCount = outputWords.length;

  // 1. Relevance: overlap of key prompt terminology in output
  let termMatches = 0;
  for (const term of promptWords) {
    if (output.toLowerCase().includes(term)) termMatches++;
  }
  const relevance = Math.min(100, Math.round(50 + (promptWords.length ? (termMatches / promptWords.length) * 50 : 30)));

  // 2. Clarity: structure, markdown formatting, paragraph breaks, sentence length
  let clarity = 60;
  if (output.includes("\n\n")) clarity += 10;
  if (/^#{1,3}\s|(\*|-)\s|^\d+\.\s/m.test(output)) clarity += 15;
  if (/```[\s\S]*?```/.test(output) || /\|.*?\|/.test(output)) clarity += 10;
  clarity = Math.min(100, clarity);

  // 3. Completeness: depth of response relative to query
  let completeness = 50;
  if (wordCount > 60) completeness += 15;
  if (wordCount > 150) completeness += 20;
  if (wordCount > 300) completeness += 10;
  completeness = Math.min(100, completeness);

  // 4. Quality: composite of clarity, syntax, and formatting
  const quality = Math.round((clarity * 0.4) + (relevance * 0.35) + (completeness * 0.25));
  const overall = Math.round((quality + relevance + clarity + completeness) / 4);

  return { quality, relevance, clarity, completeness, overall };
}
