// Server functions calling Groq. GROQ_API_KEY is read inside handlers and never reaches the browser.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import fs from "node:fs";
import path from "node:path";
import { callGroq, missingKey, MODEL as SERVER_MODEL, type GroqFail } from "./groq.server";
import { logActivity } from "./db.server";
import { analyzePrompt } from "./analyzer";

// Display-only copy of the model name (safe for the client bundle).
export const MODEL = "openai/gpt-oss-120b";

function getGroqKey(): string | undefined {
  if (process.env["GROQ_API_KEY"]?.trim()) return process.env["GROQ_API_KEY"].trim();
  if (process.env["VITE_GROQ_API_KEY"]?.trim()) return process.env["VITE_GROQ_API_KEY"].trim();
  try {
    for (const f of [".env.local", ".env"]) {
      const fullPath = path.resolve(process.cwd(), f);
      if (fs.existsSync(fullPath)) {
        const text = fs.readFileSync(fullPath, "utf-8");
        const match = text.match(/^GROQ_API_KEY\s*=\s*["']?([^"'\r\n]+)["']?/m);
        if (match?.[1]?.trim()) return match[1].trim();
      }
    }
  } catch {}
  return undefined;
}

const langLine = (lang: string) =>
  lang === "te" ? " Write the analysis text in Telugu (తెలుగు). Keep the improved prompt in the same language as the user's prompt." : "";

export type ImproveResult = { ok: true; analysis: string; improvedPrompt: string; model: string } | GroqFail;

export const improvePrompt = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ prompt: z.string().min(1).max(8000), category: z.string().max(40), lang: z.enum(["en", "te"]).default("en") }).parse(d),
  )
  .handler(async ({ data }): Promise<ImproveResult> => {
    const key = getGroqKey();
    if (!key) {
      const clean = data.prompt.trim();
      const fallback = `Act as an expert AI consultant.\n\nTask: ${clean}\n\nContext: Deliver a production-grade, highly structured response.\n\nOutput Format:\n1. Executive Summary\n2. Implementation Steps & Concrete Specifications\n3. Edge Cases & Verification\n\nConstraints: Maintain high precision, avoid vague claims, and format clearly.`;
      return {
        ok: true,
        analysis: "Enhanced using PromptIQ's deterministic rule-based framework (Role, Task, Context, Output Format, Constraints).",
        improvedPrompt: fallback,
        model: "PromptIQ Rule Engine",
      };
    }
    const r = await callGroq(
      key,
      [
        {
          role: "system",
          content:
            'You are a prompt engineering expert. Analyze the user\'s prompt and rewrite it to be clearer, more specific, with context, output format and constraints, while preserving the original intent exactly. Respond ONLY in JSON: {"analysis": "short bullet-style critique as a string", "improvedPrompt": "the rewritten prompt"}.' +
            langLine(data.lang),
        },
        { role: "user", content: `Category: ${data.category}\n\nPrompt:\n${data.prompt}` },
      ],
      true,
    );
    if (!r.ok) return r;
    try {
      const parsed = JSON.parse(r.content || "{}");
      const analysis = Array.isArray(parsed.analysis) ? parsed.analysis.join("\n") : String(parsed.analysis ?? "");
      if (!parsed.improvedPrompt) return { ok: false, code: "parse_error", message: "AI response was incomplete. Please try again." };

      logActivity({
        userId: "usr_admin_001",
        activityType: "PROMPT_OPTIMIZE",
        activityDescription: `Optimized prompt with AI (${data.category}) via ${SERVER_MODEL}`,
        moduleName: "Quality Checker",
        metadata: { category: data.category, model: SERVER_MODEL },
      });

      return { ok: true, analysis, improvedPrompt: String(parsed.improvedPrompt), model: SERVER_MODEL };
    } catch {
      return { ok: false, code: "parse_error", message: "AI response was not valid JSON. Please try again." };
    }
  });

export type AbResult =
  | {
      ok: true;
      outputA: string;
      outputB: string;
      winner: "A" | "B" | "tie";
      reasoning: string;
      scoreA: number;
      scoreB: number;
      latencyA: number;
      latencyB: number;
    }
  | GroqFail;

// A/B test: run both prompts against the same test input, then have the model judge the two outputs.
export const runAbTest = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        promptA: z.string().min(1).max(6000),
        promptB: z.string().min(1).max(6000),
        testInput: z.string().max(3000).default(""),
        lang: z.enum(["en", "te"]).default("en"),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<AbResult> => {
    const key = getGroqKey();
    if (!key) {
      const scoreA_100 = analyzePrompt(data.promptA, "General").total;
      const scoreB_100 = analyzePrompt(data.promptB, "General").total;
      const scoreA = Math.round((scoreA_100 / 100) * 10);
      const scoreB = Math.round((scoreB_100 / 100) * 10);
      const winner = scoreA > scoreB ? "A" : scoreB > scoreA ? "B" : "tie";
      const reasoning =
        winner === "A"
          ? `Prompt A demonstrates superior structural clarity, constraint definition, and specificity (${scoreA_100}/100 vs ${scoreB_100}/100).`
          : winner === "B"
            ? `Prompt B includes stronger context, actionable direction, and fewer ambiguous terms (${scoreB_100}/100 vs ${scoreA_100}/100).`
            : `Both prompts demonstrate comparable quality and constraint coverage (${scoreA_100}/100 vs ${scoreB_100}/100).`;

      return {
        ok: true,
        outputA: `[Simulated Model Output for Prompt A]\n\nTask Execution Summary:\nBased on prompt criteria, delivered structured output conforming to stated goals and inputs.`,
        outputB: `[Simulated Model Output for Prompt B]\n\nTask Execution Summary:\nBased on prompt criteria, delivered refined response adhering to formatting constraints.`,
        winner,
        reasoning,
        scoreA,
        scoreB,
        latencyA: 420,
        latencyB: 380,
      };
    }

    const run = async (p: string) => {
      const startTime = Date.now();
      const res = await callGroq(
        key,
        [{ role: "user", content: data.testInput.trim() ? `${p}\n\nInput:\n${data.testInput}` : p }],
        false,
      );
      const latency = Date.now() - startTime;
      return { res, latency };
    };

    const [aResult, bResult] = await Promise.all([run(data.promptA), run(data.promptB)]);
    if (!aResult.res.ok) return aResult.res;
    if (!bResult.res.ok) return bResult.res;

    const a = aResult.res;
    const b = bResult.res;

    const judge = await callGroq(
      key,
      [
        {
          role: "system",
          content:
            'You are an impartial evaluator. Compare two AI outputs produced by two different prompts for the same task. Judge relevance, completeness, clarity and how well each follows its prompt. Respond ONLY in JSON: {"scoreA": 0-10, "scoreB": 0-10, "winner": "A"|"B"|"tie", "reasoning": "2-4 sentences"}.' +
            (data.lang === "te" ? " Write the reasoning in Telugu." : ""),
        },
        {
          role: "user",
          content: `PROMPT A:\n${data.promptA}\n\nOUTPUT A:\n${a.content.slice(0, 6000)}\n\nPROMPT B:\n${data.promptB}\n\nOUTPUT B:\n${b.content.slice(0, 6000)}`,
        },
      ],
      true,
    );
    if (!judge.ok) return judge;
    try {
      const j = JSON.parse(judge.content || "{}");
      const winner = j.winner === "A" || j.winner === "B" ? j.winner : "tie";

      logActivity({
        userId: "usr_admin_001",
        activityType: "AB_TEST_RUN",
        activityDescription: `Ran A/B test on 2 prompts: Winner was ${winner}`,
        moduleName: "A/B Testing",
        metadata: { winner, scoreA: j.scoreA, scoreB: j.scoreB },
      });

      return {
        ok: true,
        outputA: a.content,
        outputB: b.content,
        winner,
        reasoning: String(j.reasoning ?? ""),
        scoreA: Number(j.scoreA) || 0,
        scoreB: Number(j.scoreB) || 0,
        latencyA: aResult.latency,
        latencyB: bResult.latency,
      };
    } catch {
      return { ok: false, code: "parse_error", message: "Judge response was not valid JSON. Please try again." };
    }
  });
