import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import fs from "node:fs";
import path from "node:path";
import { callGroq, missingKey } from "./groq.server";

const TestCaseSchema = z.object({
  title: z.string(),
  input: z.string(),
  expected: z.string(),
  failureWatch: z.string(),
});

const TestSuiteSchema = z.object({
  cases: z.array(TestCaseSchema),
});

export type TestSuiteResult =
  | { ok: true; cases: z.infer<typeof TestCaseSchema>[] }
  | { ok: false; message: string };

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

export const generateTestInputs = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      prompt: z.string().trim().min(1).max(6000),
      useCase: z.string().trim().min(1).max(2000),
      lang: z.enum(["en", "te"]).default("en"),
    }).parse(input),
  )
  .handler(async ({ data }): Promise<TestSuiteResult> => {
    const key = getGroqKey();
    if (!key) {
      return { ok: false, message: missingKey.message };
    }

    const systemPrompt = `You are an expert AI prompt QA specialist. Generate exactly 5 diverse, realistic test inputs to evaluate the given prompt against its intended use case.
Include ordinary, edge, ambiguous, constraint, and failure-resistant test inputs.
Output valid JSON in the following exact format:
{
  "cases": [
    {
      "title": "Short descriptive title of the test scenario",
      "input": "The concrete input text to supply to the prompt",
      "expected": "Observable qualities of a high quality, expected response",
      "failureWatch": "A specific defect or failure pattern to look out for"
    }
  ]
}
${data.lang === "te" ? "Write all test titles, inputs, expected behaviors, and failure warnings in Telugu (తెలుగు)." : "Write in English."}`;

    const userPrompt = `Intended Use Case:\n${data.useCase}\n\nPrompt to Validate:\n${data.prompt}`;

    const response = await callGroq(
      key,
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      true,
    );

    if (!response.ok) {
      return { ok: false, message: response.message };
    }

    try {
      const parsed = JSON.parse(response.content);
      const validated = TestSuiteSchema.safeParse(parsed);
      if (validated.success && validated.data.cases.length > 0) {
        return { ok: true, cases: validated.data.cases.slice(0, 5) };
      }
      return { ok: false, message: "AI response did not match expected test case schema." };
    } catch {
      return { ok: false, message: "Failed to parse structured test cases from AI response." };
    }
  });
