// Multilingual & Romanized Prompt Processing Server Functions
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import fs from "node:fs";
import path from "node:path";
import { detectLanguage, type SupportedLanguageCode } from "./language-detector";
import { analyzeMultilingualPrompt, type MultilingualAnalysisResult } from "./multilingual-analyzer";
import { transliterateRomanizedToNative } from "./transliteration";
import { callGroq } from "./groq.server";
import { saveMultilingualPromptRecord, getMultilingualDashboardStats, logActivity } from "./db.server";

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

export type OptimizationMode =
  | "original"
  | "romanized"
  | "native_script"
  | "english"
  | "other";

export interface MultilingualAnalyzeResult {
  ok: boolean;
  analysis: MultilingualAnalysisResult;
  transliteratedNativeScript: string;
}

export interface MultilingualOptimizeResult {
  ok: boolean;
  improvedPrompt: string;
  outputLanguage: string;
  outputStyle: string;
  analysisNotes: string;
  error?: string;
}

export const detectAndAnalyzePromptFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => {
    const raw = (d && typeof d === "object" ? d : {}) as Record<string, unknown>;
    return {
      prompt: typeof raw["prompt"] === "string" ? raw["prompt"] : "",
      selectedLanguage: typeof raw["selectedLanguage"] === "string" ? raw["selectedLanguage"] : "auto",
      category: typeof raw["category"] === "string" ? raw["category"] : "General",
      userId: typeof raw["userId"] === "string" ? raw["userId"] : "usr_admin_001",
    };
  })
  .handler(async ({ data }): Promise<MultilingualAnalyzeResult> => {
    const { prompt, selectedLanguage, category, userId } = data;
    const clean = prompt.trim();

    const override = selectedLanguage && selectedLanguage !== "auto"
      ? (selectedLanguage as SupportedLanguageCode)
      : undefined;

    const analysis = analyzeMultilingualPrompt(clean, category, override);
    const transliteratedNativeScript = transliterateRomanizedToNative(clean, analysis.detection.detectedCode);

    try {
      saveMultilingualPromptRecord({
        userId,
        originalPrompt: clean,
        detectedLanguage: analysis.detection.languageName,
        writingStyle: analysis.detection.writingStyle,
        confidence: analysis.detection.confidence,
        outputLanguage: analysis.detection.languageName,
        transliteratedPrompt: transliteratedNativeScript,
        scoresJson: JSON.stringify(analysis.parameters),
        overallScore: analysis.overallScore,
      });

      logActivity({
        userId,
        activityType: "MULTILINGUAL_ANALYSIS",
        activityDescription: `Analyzed prompt in ${analysis.detection.languageName} (${analysis.detection.writingStyle}, Score: ${analysis.overallScore}/100)`,
        moduleName: "Language-Aware Quality Checker",
        metadata: {
          language: analysis.detection.detectedCode,
          writingStyle: analysis.detection.writingStyle,
          confidence: analysis.detection.confidence,
          overallScore: analysis.overallScore,
        },
      });
    } catch (e) {
      console.warn("Telemetry notice:", e);
    }

    return {
      ok: true,
      analysis,
      transliteratedNativeScript,
    };
  });

export const optimizeMultilingualPromptFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => {
    const raw = (d && typeof d === "object" ? d : {}) as Record<string, unknown>;
    return {
      prompt: typeof raw["prompt"] === "string" ? raw["prompt"] : "",
      mode: (typeof raw["mode"] === "string" ? raw["mode"] : "original") as OptimizationMode,
      targetLanguage: typeof raw["targetLanguage"] === "string" ? raw["targetLanguage"] : "auto",
      category: typeof raw["category"] === "string" ? raw["category"] : "General",
      userId: typeof raw["userId"] === "string" ? raw["userId"] : "usr_admin_001",
    };
  })
  .handler(async ({ data }): Promise<MultilingualOptimizeResult> => {
    const { prompt, mode, targetLanguage, category, userId } = data;
    const clean = prompt.trim();
    if (!clean) {
      return {
        ok: false,
        improvedPrompt: "",
        outputLanguage: "en",
        outputStyle: "english",
        analysisNotes: "Please enter a valid prompt to optimize.",
        error: "Empty prompt",
      };
    }

    const detection = detectLanguage(clean);
    const groqKey = getGroqKey();

    let targetLangCode = detection.detectedCode;
    let targetLangName = detection.languageName;
    if (targetLanguage && targetLanguage !== "auto" && targetLanguage !== "original") {
      targetLangCode = targetLanguage as SupportedLanguageCode;
    }

    let instructionTarget = "";
    let expectedOutputStyle = detection.writingStyle;

    if (mode === "english") {
      instructionTarget = "Translate and improve the prompt into professional, comprehensive English with clear role, context, task, format, and constraints.";
      expectedOutputStyle = "english";
      targetLangName = "English";
    } else if (mode === "native_script") {
      instructionTarget = `Improve the prompt written in ${targetLangName} Native Script. If the user used Romanized characters, rewrite the entire optimized prompt in the proper native script of ${targetLangName}. Ensure excellent grammar, clarity, technical context, output format, and constraints.`;
      expectedOutputStyle = "native_script";
    } else if (mode === "romanized") {
      instructionTarget = `Improve the prompt in Romanized ${targetLangName} (using Latin alphabets that native speakers naturally use in daily typing). Ensure the optimized prompt has role, context, features, format, and negative constraints while keeping the natural Romanized style.`;
      expectedOutputStyle = "romanized";
    } else if (mode === "other") {
      instructionTarget = `Translate and optimize the prompt into high-quality ${targetLangName}. Include clear task definition, constraints, persona, and output requirements.`;
      expectedOutputStyle = "native_script";
    } else {
      // original mode
      if (detection.writingStyle === "romanized") {
        instructionTarget = `The user typed in Romanized ${detection.languageName}. Optimize the prompt in Romanized ${detection.languageName} without forcing conversion to English, maintaining natural conversational or technical Romanized phrasing. Include role, context, task details, and format.`;
      } else if (detection.writingStyle === "native_script") {
        instructionTarget = `Optimize the prompt in native ${detection.languageName} script. Keep the original language and enhance clarity, context, constraints, and output format.`;
      } else {
        instructionTarget = `Optimize the prompt in ${detection.languageName} with clear role, context, constraints, and output requirements.`;
      }
    }

    if (!groqKey) {
      // Offline fallback: Rule-based structured prompt template
      const fallbackTransliterated = transliterateRomanizedToNative(clean, targetLangCode);
      const fallback = `Act as an expert AI assistant.\n\nTask: ${mode === "native_script" ? fallbackTransliterated : clean}\n\nContext: Provide a production-grade, highly structured response.\nFormat: Step-by-step markdown with code/specifications where appropriate.\nConstraints: Ensure accuracy, security, and completeness.`;
      return {
        ok: true,
        improvedPrompt: fallback,
        outputLanguage: targetLangName,
        outputStyle: expectedOutputStyle,
        analysisNotes: "Optimized using deterministic template (add GROQ_API_KEY in .env for full LLM rewrites).",
      };
    }

    const systemPrompt = `You are an elite Prompt Engineering AI with deep expertise in 20 world languages, Romanized Indic languages, and code-switching.
Your task:
${instructionTarget}

CRITICAL RULES:
1. Preserve the user's core intent.
2. Structure the prompt with: Role, Context, Task, Output Format, and Constraints.
3. Respond ONLY in valid JSON with this exact schema:
{
  "improvedPrompt": "the complete rewritten optimized prompt",
  "analysisNotes": "brief bullet points explaining the improvements made"
}`;

    const userPrompt = `Category: ${category}\nOriginal Prompt: ${clean}\nDetected Language: ${detection.languageName} (${detection.writingStyle}, Confidence: ${detection.confidence}%)`;

    try {
      const response = await callGroq(groqKey, [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ], true);

      if (!response.ok) {
        throw new Error(response.message);
      }

      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Invalid model JSON format");
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Save improved prompt to database
      saveMultilingualPromptRecord({
        userId,
        originalPrompt: clean,
        detectedLanguage: detection.languageName,
        writingStyle: detection.writingStyle,
        confidence: detection.confidence,
        outputLanguage: targetLangName,
        improvedPrompt: parsed.improvedPrompt,
        overallScore: 92,
      });

      logActivity({
        userId,
        activityType: "PROMPT_OPTIMIZE",
        activityDescription: `Optimized multilingual prompt in ${targetLangName} (Mode: ${mode})`,
        moduleName: "Prompt Optimizer",
        metadata: { mode, targetLanguage: targetLangName, writingStyle: expectedOutputStyle },
      });

      return {
        ok: true,
        improvedPrompt: parsed.improvedPrompt,
        outputLanguage: targetLangName,
        outputStyle: expectedOutputStyle,
        analysisNotes: parsed.analysisNotes || "Enhanced clarity, structure, and output requirements.",
      };
    } catch (err: any) {
      console.error("Groq multilingual optimization error:", err);
      // Deterministic fallback
      const fallback = `Act as an expert AI assistant.\n\nTask: ${clean}\n\nContext: Production implementation.\nOutput Format: Clear, structured response.\nConstraints: Adhere to best security and quality practices.`;
      return {
        ok: true,
        improvedPrompt: fallback,
        outputLanguage: targetLangName,
        outputStyle: expectedOutputStyle,
        analysisNotes: "Generated structured fallback prompt.",
      };
    }
  });

export const transliteratePromptFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => {
    const raw = (d && typeof d === "object" ? d : {}) as Record<string, unknown>;
    return {
      text: typeof raw["text"] === "string" ? raw["text"] : "",
      targetLanguage: typeof raw["targetLanguage"] === "string" ? (raw["targetLanguage"] as SupportedLanguageCode) : "te",
    };
  })
  .handler(async ({ data }): Promise<{ ok: boolean; transliterated: string }> => {
    const { text, targetLanguage } = data;
    const ruleBased = transliterateRomanizedToNative(text, targetLanguage);
    return { ok: true, transliterated: ruleBased };
  });

export const getMultilingualDashboardStatsFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => {
    const raw = (d && typeof d === "object" ? d : {}) as Record<string, unknown>;
    return {
      userId: typeof raw["userId"] === "string" ? raw["userId"] : undefined,
    };
  })
  .handler(async ({ data }) => {
    const stats = getMultilingualDashboardStats(data.userId);
    return { ok: true, stats };
  });
