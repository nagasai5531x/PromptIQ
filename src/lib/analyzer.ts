// Rule-based (heuristic) prompt analyzer. Runs entirely in the browser.
// Scores are approximations from text patterns, NOT an objective quality measure.

export const CATEGORIES = ["General", "Coding", "Writing", "Education", "Research", "Business"] as const;
export type Category = (typeof CATEGORIES)[number];

export type Criterion = {
  key: string;
  label: string;
  max: number;
  score: number;
  notes: string[];
  suggestions: string[];
};

export type Analysis = {
  total: number;
  band: string;
  criteria: Criterion[];
  wordCount: number;
};

const has = (t: string, re: RegExp) => re.test(t);
const count = (t: string, re: RegExp) => (t.match(re) || []).length;

const CATEGORY_HINTS: Record<Category, { re: RegExp; tip: string }> = {
  General: { re: /./, tip: "" },
  Coding: {
    re: /\b(python|javascript|typescript|java|c\+\+|react|sql|api|function|class|version|framework|library|error|bug)\b/i,
    tip: "Name the language, framework/version, and paste relevant code or error messages.",
  },
  Writing: {
    re: /\b(tone|audience|style|voice|formal|casual|reader|blog|essay|story|email)\b/i,
    tip: "State the audience, tone, and the type of piece (blog, email, essay...).",
  },
  Education: {
    re: /\b(student|grade|level|beginner|class|syllabus|exam|learn|explain|lesson)\b/i,
    tip: "Specify the learner level (e.g. 2nd-year B.Tech) and the learning goal.",
  },
  Research: {
    re: /\b(source|citation|paper|study|evidence|literature|peer|data|method)\b/i,
    tip: "Ask for sources/citations and define the scope, time period, or field.",
  },
  Business: {
    re: /\b(customer|market|revenue|kpi|stakeholder|strategy|budget|goal|product|company)\b/i,
    tip: "Describe the business, target customer, and the decision or goal.",
  },
};

export function analyzePrompt(raw: string, category: Category): Analysis {
  const t = raw.trim();
  const words = t ? t.split(/\s+/).length : 0;
  const sentences = Math.max(1, count(t, /[.!?](\s|$)/g));
  const avgSentence = words / sentences;

  // --- Clarity (20)
  const clarity: Criterion = { key: "clarity", label: "Clarity", max: 20, score: 0, notes: [], suggestions: [] };
  const actionVerb = has(t, /\b(write|create|explain|summari[sz]e|generate|list|compare|analy[sz]e|design|build|draft|translate|review|fix|describe|outline|suggest|plan|convert|rewrite)\b/i);
  if (actionVerb) { clarity.score += 8; clarity.notes.push("Contains a clear action verb."); }
  else clarity.suggestions.push("Start with a direct action verb, e.g. \"Explain…\", \"Write…\", \"Compare…\".");
  if (avgSentence <= 30) clarity.score += 6; else clarity.suggestions.push("Break long sentences into shorter, single-idea sentences.");
  const vague = count(t, /\b(something|stuff|things|etc|some|good|nice|better|whatever|anything)\b/gi);
  if (vague === 0) clarity.score += 6;
  else { clarity.score += Math.max(0, 6 - vague * 2); clarity.notes.push(`${vague} vague word(s) detected.`); clarity.suggestions.push("Replace vague words (\"something\", \"good\", \"etc.\") with concrete terms."); }

  // --- Specificity (25)
  const spec: Criterion = { key: "specificity", label: "Specificity", max: 25, score: 0, notes: [], suggestions: [] };
  if (words >= 40) spec.score += 9; else if (words >= 15) spec.score += 5; else if (words > 0) spec.score += 2;
  if (words < 15) spec.suggestions.push("Add more detail — very short prompts tend to get generic answers.");
  const numbers = count(t, /\d+/g);
  if (numbers > 0) { spec.score += 5; spec.notes.push("Includes concrete numbers."); }
  else spec.suggestions.push("Add quantities (e.g. \"5 examples\", \"300 words\").");
  const proper = count(t.replace(/(^|[.!?]\s+)[A-Z]/g, ""), /\b[A-Z][a-zA-Z0-9+#]+/g);
  if (proper > 0) { spec.score += 5; spec.notes.push("Mentions specific names/terms."); }
  const hint = CATEGORY_HINTS[category];
  if (category === "General" || has(t, hint.re)) spec.score += 6;
  else spec.suggestions.push(hint.tip);

  // --- Context (20)
  const ctx: Criterion = { key: "context", label: "Context", max: 20, score: 0, notes: [], suggestions: [] };
  if (has(t, /\b(i am|i'm|we are|as a|my|our|you are|act as)\b/i)) { ctx.score += 7; ctx.notes.push("Provides a role or background."); }
  else ctx.suggestions.push("Add background: who you are or the role the AI should take (\"Act as a…\").");
  if (has(t, /\b(because|so that|in order to|goal|purpose|for (a|an|my|our)|to help)\b/i)) { ctx.score += 7; ctx.notes.push("States a purpose or goal."); }
  else ctx.suggestions.push("Explain why you need it (\"so that…\", \"the goal is…\").");
  if (has(t, /\b(audience|reader|students?|beginners?|experts?|customers?|team|users?)\b/i)) { ctx.score += 6; ctx.notes.push("Identifies an audience."); }
  else ctx.suggestions.push("Specify the target audience.");

  // --- Output requirements (20)
  const out: Criterion = { key: "output", label: "Output Requirements", max: 20, score: 0, notes: [], suggestions: [] };
  if (has(t, /\b(table|list|bullet|json|markdown|paragraphs?|steps?|code block|outline|csv|headings?|format)\b/i)) { out.score += 8; out.notes.push("Specifies an output format."); }
  else out.suggestions.push("Say what format you want (bullet list, table, JSON, steps…).");
  if (has(t, /\b(\d+\s*(words?|sentences?|paragraphs?|points?|examples?|items?|lines?)|short|brief|concise|detailed)\b/i)) { out.score += 6; out.notes.push("Defines length or depth."); }
  else out.suggestions.push("Define length (e.g. \"under 200 words\", \"3 paragraphs\").");
  if (has(t, /\b(tone|formal|informal|friendly|professional|simple language|style)\b/i)) { out.score += 6; out.notes.push("Sets tone/style."); }
  else out.suggestions.push("Mention the desired tone or style.");

  // --- Constraints / details (15)
  const con: Criterion = { key: "constraints", label: "Constraints / Details", max: 15, score: 0, notes: [], suggestions: [] };
  if (has(t, /\b(must|should|only|do not|don't|avoid|without|at least|at most|no more than|limit|exclude|include)\b/i)) { con.score += 7; con.notes.push("Contains explicit constraints."); }
  else con.suggestions.push("Add rules: what to include, avoid, or limit.");
  if (has(t, /\b(example|e\.g\.|for instance|such as|like this)\b|["“].+["”]/i)) { con.score += 4; con.notes.push("Gives an example."); }
  else con.suggestions.push("Provide an example of the desired output or input.");
  if (count(t, /\n/g) >= 2 || has(t, /^\s*[-*\d]+[.)]?\s/m)) { con.score += 4; con.notes.push("Well-structured (multiple lines/lists)."); }
  else con.suggestions.push("Structure long prompts with line breaks or bullet points.");

  const criteria = [clarity, spec, ctx, out, con].map((c) => ({ ...c, score: words === 0 ? 0 : Math.min(c.max, c.score) }));
  const total = criteria.reduce((s, c) => s + c.score, 0);
  const band = total >= 85 ? "Excellent" : total >= 70 ? "Strong" : total >= 50 ? "Fair" : total >= 30 ? "Weak" : "Needs work";
  return { total, band, criteria, wordCount: words };
}

export type CriterionComparison = {
  key: string;
  label: string;
  max: number;
  beforeScore: number;
  afterScore: number;
  diff: number;
  beforeNotes: string[];
  afterNotes: string[];
  newNotes: string[];
  resolvedSuggestions: string[];
};

export type PromptComparison = {
  before: Analysis;
  after: Analysis;
  scoreDiff: number;
  wordDiff: number;
  percentageChange: number;
  criteria: CriterionComparison[];
  improvements: string[];
  resolvedSuggestions: string[];
};

export function comparePrompts(beforeRaw: string, afterRaw: string, category: Category): PromptComparison {
  const before = analyzePrompt(beforeRaw, category);
  const after = analyzePrompt(afterRaw, category);
  const scoreDiff = after.total - before.total;
  const wordDiff = after.wordCount - before.wordCount;
  const percentageChange =
    before.total > 0
      ? Math.round(((after.total - before.total) / before.total) * 100)
      : after.total > 0
        ? 100
        : 0;

  const criteria: CriterionComparison[] = after.criteria.map((afterC) => {
    const beforeC = before.criteria.find((c) => c.key === afterC.key) ?? {
      score: 0,
      notes: [] as string[],
      suggestions: [] as string[],
    };
    const diff = afterC.score - beforeC.score;
    const newNotes = afterC.notes.filter((n) => !beforeC.notes.includes(n));
    const resolvedSuggestions = beforeC.suggestions.filter((s) => !afterC.suggestions.includes(s));
    return {
      key: afterC.key,
      label: afterC.label,
      max: afterC.max,
      beforeScore: beforeC.score,
      afterScore: afterC.score,
      diff,
      beforeNotes: beforeC.notes,
      afterNotes: afterC.notes,
      newNotes,
      resolvedSuggestions,
    };
  });

  const improvements: string[] = [];
  if (scoreDiff > 0) {
    improvements.push(`Overall score increased by ${scoreDiff} points (${before.total} → ${after.total})`);
  } else if (scoreDiff < 0) {
    improvements.push(`Overall score changed by ${scoreDiff} points (${before.total} → ${after.total})`);
  }

  for (const c of criteria) {
    if (c.diff > 0) {
      const details = c.newNotes.length > 0 ? ` (${c.newNotes.join(", ")})` : "";
      improvements.push(`${c.label}: +${c.diff} pts${details}`);
    }
  }

  const allResolved = criteria.flatMap((c) => c.resolvedSuggestions);
  if (wordDiff > 0) {
    improvements.push(`Expanded from ${before.wordCount} to ${after.wordCount} words for richer instructions`);
  }

  return {
    before,
    after,
    scoreDiff,
    wordDiff,
    percentageChange,
    criteria,
    improvements,
    resolvedSuggestions: allResolved,
  };
}

export function buildReport(
  prompt: string,
  category: Category,
  a: Analysis,
  ai?: { analysis?: string; improvedPrompt?: string } | null,
  improvedPromptOverride?: string,
) {
  const improvedText = improvedPromptOverride ?? ai?.improvedPrompt;
  const lines = [
    "PROMPT QUALITY CHECKER — ANALYSIS REPORT",
    `Generated: ${new Date().toLocaleString()}`,
    `Category: ${category}`,
    "Note: Scores are heuristic/rule-based estimates, not an objective measure.",
    "",
    "== Original prompt ==",
    prompt,
    "",
    `== Score: ${a.total}/100 (${a.band}) ==`,
    ...a.criteria.map((c) => `- ${c.label}: ${c.score}/${c.max}`),
    "",
    "== Suggestions ==",
    ...a.criteria.flatMap((c) => c.suggestions.map((s) => `- [${c.label}] ${s}`)),
  ];

  if (improvedText) {
    const comparison = comparePrompts(prompt, improvedText, category);
    lines.push(
      "",
      "== Before vs After Comparison ==",
      `Original Score: ${comparison.before.total}/100 (${comparison.before.band})`,
      `Improved Score: ${comparison.after.total}/100 (${comparison.after.band})`,
      `Score Difference: ${comparison.scoreDiff >= 0 ? "+" : ""}${comparison.scoreDiff} pts (${comparison.percentageChange >= 0 ? "+" : ""}${comparison.percentageChange}%)`,
      `Word Count: ${comparison.before.wordCount} -> ${comparison.after.wordCount} words`,
      "",
      "-- Criteria Score Comparison --",
      ...comparison.criteria.map(
        (c) => `- ${c.label}: ${c.beforeScore}/${c.max} -> ${c.afterScore}/${c.max} (${c.diff >= 0 ? "+" : ""}${c.diff} pts)`,
      ),
    );

    if (comparison.improvements.length > 0) {
      lines.push("", "-- Key Improvements --", ...comparison.improvements.map((imp) => `- ${imp}`));
    }

    if (comparison.resolvedSuggestions.length > 0) {
      lines.push("", "-- Resolved Suggestions --", ...comparison.resolvedSuggestions.map((res) => `- [Resolved] ${res}`));
    }

    if (ai?.analysis) {
      lines.push("", "== AI Analysis (Groq) ==", ai.analysis);
    }

    lines.push("", "== Improved Prompt ==", improvedText);
  } else if (ai?.analysis) {
    lines.push("", "== AI Analysis (Groq) ==", ai.analysis);
  }

  return lines.join("\n");
}

export const SAMPLE_PROMPT = "Write something about machine learning for my class.";
export const SAMPLE_IMPROVED_PROMPT =
  "Act as an experienced computer science professor. Write a structured introductory guide to Machine Learning for 2nd-year B.Tech students in under 300 words. Explain supervised vs unsupervised learning with 2 concrete real-world examples. Format the response with clear markdown headings, bullet points, and a comparison table. Do not use undefined jargon.";
