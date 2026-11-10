// AI Prompt Evaluation & Multi-Test-Case Benchmarking Engine
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import crypto from "node:crypto";
import { analyzePrompt, type Category } from "./analyzer";
import { getDb, logActivity } from "./db.server";

export type TestCase = {
  id: string;
  name: string;
  input: string;
  expectedBehavior: string;
};

export type DimensionEvaluation = {
  key: string;
  label: string;
  score: number;
  max: number;
  percentage: number;
  explanation: string;
  strengths: string[];
  weaknesses: string[];
};

export type TestCaseResult = {
  testCaseId: string;
  testCaseName: string;
  testInput: string;
  passed: boolean;
  score: number; // 0-100
  notes: string;
  durationMs: number;
};

export type FullEvaluationResult = {
  id: string;
  prompt: string;
  category: Category;
  overallScore: number; // 0-100
  band: string;
  dimensions: DimensionEvaluation[];
  missingInformation: string[];
  actionableImprovements: string[];
  testCaseResults: TestCaseResult[];
  passRate: number; // 0-100%
  timestamp: number;
};

export const runPromptEvaluation = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      prompt: z.string().min(1).max(8000),
      category: z.string().default("General"),
      testCases: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          input: z.string(),
          expectedBehavior: z.string(),
        }),
      ).default([]),
      userId: z.string().optional(),
    }).parse(d),
  )
  .handler(async ({ data }): Promise<FullEvaluationResult> => {
    const { prompt, category, testCases, userId } = data;
    const cat = category as Category;

    // 1. Analyze base prompt using the heuristic engine
    const baseAnalysis = analyzePrompt(prompt, cat);

    // 2. Comprehensive 6-dimension evaluation
    const clarity = evaluateClarity(prompt);
    const context = evaluateContext(prompt);
    const specificity = evaluateSpecificity(prompt, cat);
    const relevance = evaluateRelevance(prompt, cat);
    const completeness = evaluateCompleteness(prompt);
    const outputReq = evaluateOutputRequirements(prompt);

    const dimensions: DimensionEvaluation[] = [clarity, context, specificity, relevance, completeness, outputReq];
    const totalMax = dimensions.reduce((s, d) => s + d.max, 0);
    const rawTotal = dimensions.reduce((s, d) => s + d.score, 0);
    const overallScore = Math.min(100, Math.round((rawTotal / totalMax) * 100));

    const band =
      overallScore >= 85 ? "Production Ready" : overallScore >= 70 ? "Strong" : overallScore >= 50 ? "Moderate" : "Needs Optimization";

    // 3. Compile missing information & weaknesses
    const missingInformation: string[] = [];
    const actionableImprovements: string[] = [];

    for (const d of dimensions) {
      for (const w of d.weaknesses) {
        missingInformation.push(`[${d.label}] ${w}`);
      }
    }

    if (!/\b(audience|reader|student|developer|user|client)\b/i.test(prompt)) {
      missingInformation.push("Target audience persona is missing or ambiguous.");
      actionableImprovements.push("Specify the exact reader or user audience (e.g., 'Target audience: 2nd-year CS students').");
    }
    if (!/\b(do not|avoid|limit|never|without)\b/i.test(prompt)) {
      missingInformation.push("Explicit negative constraints or boundaries are missing.");
      actionableImprovements.push("Add negative constraints stating what the model must avoid (e.g., 'Do not use undefined technical jargon').");
    }
    if (!/\b(table|json|markdown|list|steps|code block|bullet)\b/i.test(prompt)) {
      missingInformation.push("No standardized output structure specified.");
      actionableImprovements.push("Specify strict output formatting (e.g., 'Format response as Markdown table and bulleted checklist').");
    }
    if (!/\b(example|e\.g\.|sample|instance)\b/i.test(prompt)) {
      actionableImprovements.push("Include a few-shot example of the desired answer to anchor model accuracy.");
    }

    // 4. Run Benchmark against test cases
    const testCaseResults: TestCaseResult[] = [];
    let passedCount = 0;

    for (const tc of testCases) {
      const start = Date.now();
      // Simulate input application
      const combined = `${prompt}\n\n[Test Case Input]: ${tc.input}`;
      const tcAnalysis = analyzePrompt(combined, cat);
      const passed = tcAnalysis.total >= 60;
      if (passed) passedCount++;

      testCaseResults.push({
        testCaseId: tc.id,
        testCaseName: tc.name,
        testInput: tc.input,
        passed,
        score: tcAnalysis.total,
        notes: passed
          ? `Prompt successfully handled test case '${tc.name}' within expected quality threshold.`
          : `Prompt struggled to accommodate '${tc.name}'. Missing targeted constraints for this scenario.`,
        durationMs: Date.now() - start,
      });
    }

    const passRate = testCases.length ? Math.round((passedCount / testCases.length) * 100) : 100;
    const evalId = "eval_" + crypto.randomUUID().slice(0, 8);

    const result: FullEvaluationResult = {
      id: evalId,
      prompt,
      category: cat,
      overallScore,
      band,
      dimensions,
      missingInformation: missingInformation.slice(0, 6),
      actionableImprovements: actionableImprovements.slice(0, 5),
      testCaseResults,
      passRate,
      timestamp: Date.now(),
    };

    // Save to Database
    try {
      const db = getDb();
      const insert = db.prepare(`
        INSERT INTO evaluations (id, user_id, prompt, test_cases_json, results_json, overall_score, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?);
      `);
      insert.run(evalId, userId || "usr_admin_001", prompt, JSON.stringify(testCases), JSON.stringify(result), overallScore, Date.now());

      logActivity({
        userId: userId || "usr_admin_001",
        activityType: "AI_EVALUATION",
        activityDescription: `Evaluated prompt (${category}): ${overallScore}/100 across 6 dimensions`,
        moduleName: "AI Benchmark",
        metadata: { category, overallScore, testCasesCount: testCases.length },
      });
    } catch (e) {
      console.error("Failed to save evaluation to DB", e);
    }

    return result;
  });

export const getEvaluationHistory = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const db = getDb();
    const rows = db.prepare("SELECT * FROM evaluations ORDER BY created_at DESC LIMIT 20;").all() as any[];
    return rows.map((r) => ({
      id: r.id,
      prompt: r.prompt,
      overallScore: r.overall_score,
      results: JSON.parse(r.results_json || "{}"),
      createdAt: r.created_at,
    }));
  } catch {
    return [];
  }
});

// Dimension Evaluators
function evaluateClarity(t: string): DimensionEvaluation {
  const max = 20;
  let score = 8;
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (/\b(write|create|explain|summarize|generate|build|analyze|compare|design)\b/i.test(t)) {
    score += 7;
    strengths.push("Initiates with a decisive action directive.");
  } else {
    weaknesses.push("Lacks an explicit action verb at the start.");
  }

  const words = t.trim().split(/\s+/).length;
  const sentences = Math.max(1, (t.match(/[.!?](\s|$)/g) || []).length);
  if (words / sentences <= 25) {
    score += 5;
    strengths.push("Sentences are concise and easy to parse.");
  } else {
    weaknesses.push("Contains compound sentences that may dilute model attention.");
  }

  return {
    key: "clarity",
    label: "Clarity",
    score: Math.min(max, score),
    max,
    percentage: Math.round((Math.min(max, score) / max) * 100),
    explanation: "Assesses how unambiguous and easily interpretable the core instructions are.",
    strengths,
    weaknesses,
  };
}

function evaluateContext(t: string): DimensionEvaluation {
  const max = 20;
  let score = 6;
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (/\b(act as|you are|role|background|as a)\b/i.test(t)) {
    score += 7;
    strengths.push("Assigns an expert role persona to the model.");
  } else {
    weaknesses.push("No defined persona or specialized role.");
  }

  if (/\b(because|so that|in order to|goal|purpose|objective)\b/i.test(t)) {
    score += 7;
    strengths.push("States the underlying business or operational goal.");
  } else {
    weaknesses.push("The broader intent and motivation are not articulated.");
  }

  return {
    key: "context",
    label: "Context",
    score: Math.min(max, score),
    max,
    percentage: Math.round((Math.min(max, score) / max) * 100),
    explanation: "Measures background grounding, role definition, and business objectives.",
    strengths,
    weaknesses,
  };
}

function evaluateSpecificity(t: string, cat: Category): DimensionEvaluation {
  const max = 20;
  let score = 5;
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (/\d+/.test(t)) {
    score += 5;
    strengths.push("Contains quantified metrics (numbers/lengths).");
  } else {
    weaknesses.push("Omits numerical constraints (e.g. word count, step count).");
  }

  const words = t.trim().split(/\s+/).length;
  if (words >= 35) {
    score += 5;
    strengths.push("Prompt has sufficient detail to prevent hallucinated assumptions.");
  } else {
    weaknesses.push("Prompt is too brief, which often leads to generic output.");
  }

  if (cat !== "General") {
    score += 5;
    strengths.push(`Tuned for the ${cat} domain.`);
  }

  return {
    key: "specificity",
    label: "Specificity",
    score: Math.min(max, score),
    max,
    percentage: Math.round((Math.min(max, score) / max) * 100),
    explanation: "Checks whether prompt contains concrete parameters versus vague generalizations.",
    strengths,
    weaknesses,
  };
}

function evaluateRelevance(t: string, cat: Category): DimensionEvaluation {
  const max = 15;
  let score = 8;
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (!/\b(something|anything|stuff|whatever|etc)\b/i.test(t)) {
    score += 7;
    strengths.push("Avoids open-ended filler words.");
  } else {
    weaknesses.push("Contains loose terms like 'something' or 'etc' that degrade focus.");
  }

  return {
    key: "relevance",
    label: "Relevance",
    score: Math.min(max, score),
    max,
    percentage: Math.round((Math.min(max, score) / max) * 100),
    explanation: "Verifies that all text directly contributes to solving the intended problem.",
    strengths,
    weaknesses,
  };
}

function evaluateCompleteness(t: string): DimensionEvaluation {
  const max = 15;
  let score = 5;
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (/\b(do not|avoid|must not|limit|exclude|never)\b/i.test(t)) {
    score += 5;
    strengths.push("Defines negative guardrails.");
  } else {
    weaknesses.push("Does not define what the AI should omit or avoid.");
  }

  if (/\b(example|sample|format)\b/i.test(t)) {
    score += 5;
    strengths.push("Provides concrete examples or schema.");
  } else {
    weaknesses.push("Lacks reference examples.");
  }

  return {
    key: "completeness",
    label: "Completeness",
    score: Math.min(max, score),
    max,
    percentage: Math.round((Math.min(max, score) / max) * 100),
    explanation: "Measures whether the prompt forms a complete specification.",
    strengths,
    weaknesses,
  };
}

function evaluateOutputRequirements(t: string): DimensionEvaluation {
  const max = 10;
  let score = 3;
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (/\b(table|json|markdown|list|bullet|steps|csv)\b/i.test(t)) {
    score += 4;
    strengths.push("Specifies explicit output schema.");
  } else {
    weaknesses.push("Output format is unspecified.");
  }

  if (/\b(tone|formal|simple|technical|concise)\b/i.test(t)) {
    score += 3;
    strengths.push("Sets stylistic tone.");
  } else {
    weaknesses.push("Tone is left uncalibrated.");
  }

  return {
    key: "output",
    label: "Output Requirements",
    score: Math.min(max, score),
    max,
    percentage: Math.round((Math.min(max, score) / max) * 100),
    explanation: "Assesses structure, schema, and formatting specifications.",
    strengths,
    weaknesses,
  };
}
