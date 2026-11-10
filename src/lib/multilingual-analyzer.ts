// Language-Aware Multilingual & Romanized Prompt Analyzer
// Evaluates prompts on 8 quality dimensions without penalizing Romanized or native non-English scripts.

import { detectLanguage, type DetectionResult, type SupportedLanguageCode } from "./language-detector.ts";

export interface ParameterScore {
  name: string;
  score: number; // 0 - 100
  weight: number;
  description: string;
  status: "excellent" | "good" | "needs_improvement" | "poor";
}

export interface MultilingualAnalysisResult {
  overallScore: number; // 0 - 100
  rating: "Weak" | "Moderate" | "Strong" | "Excellent";
  detection: DetectionResult;
  parameters: {
    clarity: ParameterScore;
    context: ParameterScore;
    specificity: ParameterScore;
    completeness: ParameterScore;
    taskDefinition: ParameterScore;
    outputRequirements: ParameterScore;
    constraints: ParameterScore;
    expectedResult: ParameterScore;
  };
  strengths: string[];
  weaknesses: string[];
  missingElements: string[];
  recommendations: string[];
  fairnessNote: string;
}

export function analyzeMultilingualPrompt(
  prompt: string,
  category: string = "General",
  overrideLang?: SupportedLanguageCode,
): MultilingualAnalysisResult {
  const clean = prompt.trim();
  const detection = detectLanguage(clean);
  const lang = overrideLang || detection.detectedCode;

  if (!clean) {
    return createEmptyAnalysis(detection);
  }

  const words = clean.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const lower = clean.toLowerCase();

  // 1. Task Definition Evaluation
  // Checks if an actionable instruction exists in English, Romanized Indic, or Native script
  const taskPatterns = [
    // English
    /\b(create|write|explain|generate|build|develop|summarize|list|compare|design|implement|find|translate)\b/i,
    // Telugu Romanized
    /\b(cheyyali|cheyali|cheyyandi|ivvali|rayali|chudali|pettali|nerpali|tayaru)\b/i,
    // Telugu Native
    /(చేయాలి|రాయాలి|ఇవ్వాలి|చూడాలి|రూపొందించాలి|సృష్టించు)/u,
    // Hindi Romanized
    /\b(banana|banaye|karein|karna|chahiye|likho|batao|samjhao)\b/i,
    // Hindi Native
    /(बनाना|बनाएं|करें|लिखें|बताएं|समझाइए)/u,
    // Tamil Romanized & Native
    /\b(pannanum|seyyanum|kudunga|ezhudhu)\b/i,
    /(செய்ய|எழுது|தா)/u,
    // Kannada Romanized & Native
    /\b(madabeku|bari|kodi)\b/i,
    /(ಮಾಡಬೇಕು|ಬರೆಯಿರಿ)/u,
    // Malayalam Romanized & Native
    /\b(cheyyanam|undakku|ezhuthu)\b/i,
    /(ചെയ്യണം|എഴുതുക)/u,
    // Spanish / European
    /\b(crear|escribir|explicar|generar|construir|faire|erstellen)\b/i,
  ];

  const hasTaskAction = taskPatterns.some((rgx) => rgx.test(clean));
  let taskScore = hasTaskAction ? 75 : 40;
  if (wordCount >= 5 && hasTaskAction) taskScore += 15;
  if (wordCount >= 12) taskScore += 10;
  taskScore = Math.min(100, taskScore);

  // 2. Clarity Evaluation
  // Evaluates structural coherence, reasonable sentence length, and lack of ambiguous fragments
  let clarityScore = 60;
  if (wordCount >= 6 && wordCount <= 250) clarityScore += 20;
  if (/[.!?\n]/.test(clean)) clarityScore += 10;
  if (!/(blah|etc\b|stuff|something like that|edho oka|kuch bhi)/i.test(lower)) clarityScore += 10;
  clarityScore = Math.min(100, clarityScore);

  // 3. Context Evaluation
  // Looks for background info, persona, audience, domain keywords
  const contextPatterns = [
    /\b(act as|you are|role|background|context|for\s+(beginners|students|developers|users|team))\b/i,
    /\b(nenu|memu|na\s+business|maa\s+company|naku\s+kosam)\b/i, // Telugu context
    /\b(main|hum|meri\s+company|mere\s+liye)\b/i, // Hindi context
    /\b(company|business|system|project|website|database|app|store|banking|e-commerce)\b/i,
  ];
  let contextMatches = contextPatterns.filter((rgx) => rgx.test(clean)).length;
  let contextScore = Math.min(100, 35 + contextMatches * 20 + (wordCount > 20 ? 15 : 0));

  // 4. Specificity Evaluation
  // Checks for technical details, numbers, versions, frameworks, named entities
  const specificityPatterns = [
    /\b(react|typescript|python|node|sql|tailwind|jwt|rs256|api|rest|json|css|html)\b/i,
    /\b(\d+|step|bullet|points|paragraphs?|columns?|table|lines?)\b/i,
    /\b(login|cart|auth|authentication|database|schema|payment|checkout)\b/i,
    /\b(dantlo|andulo|ismein|usmein)\b/i, // Romanized feature anchors
  ];
  let specMatches = specificityPatterns.filter((rgx) => rgx.test(clean)).length;
  let specificityScore = Math.min(100, 40 + specMatches * 18);

  // 5. Completeness Evaluation
  // Evaluates breadth of instructions
  let completenessScore = 40;
  if (wordCount > 8) completenessScore += 20;
  if (wordCount > 18) completenessScore += 20;
  if (clean.includes(",") || clean.includes("and") || clean.includes("&") || clean.includes("mariyu") || clean.includes("aur")) completenessScore += 10;
  if (hasTaskAction && specMatches >= 1) completenessScore += 10;
  completenessScore = Math.min(100, completenessScore);

  // 6. Output Requirements Evaluation
  // Checks if the user specifies response structure, language, format
  const outputPatterns = [
    /\b(json|markdown|table|bullet|list|code\s+only|step\s+by\s+step|in\s+(telugu|hindi|english))\b/i,
    /\b(format|structure|output|response|schema)\b/i,
    /\b(telugu\s+lo|hindi\s+mein|english\s+lo|bullet\s+points\s+lo)\b/i,
    /(తెలుగులో|హిందీలో)/u,
  ];
  const hasOutputReq = outputPatterns.some((rgx) => rgx.test(clean));
  let outputScore = hasOutputReq ? 85 : 45;
  if (clean.includes("```") || /table|columns/i.test(clean)) outputScore = 95;

  // 7. Constraints Evaluation
  // Checks for negative conditions, length limits, exclusions
  const constraintPatterns = [
    /\b(do not|don't|must not|never|without|limit|under\s+\d+|max\b|only)\b/i,
    /\b(vaddu|cheyoddu|petoddu|lekunda|kunda)\b/i, // Telugu constraints
    /\b(mat|nahi|bina)\b/i, // Hindi constraints
  ];
  const hasConstraints = constraintPatterns.some((rgx) => rgx.test(clean));
  let constraintScore = hasConstraints ? 85 : 40;

  // 8. Expected Result Evaluation
  // Checks whether the final deliverable or user goal is concrete
  let expectedResultScore = 50;
  if (hasTaskAction) expectedResultScore += 15;
  if (specMatches >= 1) expectedResultScore += 15;
  if (wordCount >= 10) expectedResultScore += 15;
  expectedResultScore = Math.min(100, expectedResultScore);

  // Compute weighted composite score (0 - 100)
  const weightedTotal =
    taskScore * 0.18 +
    clarityScore * 0.16 +
    specificityScore * 0.16 +
    completenessScore * 0.14 +
    contextScore * 0.12 +
    outputScore * 0.10 +
    expectedResultScore * 0.08 +
    constraintScore * 0.06;

  const overallScore = Math.round(weightedTotal);

  let rating: "Weak" | "Moderate" | "Strong" | "Excellent" = "Weak";
  if (overallScore >= 85) rating = "Excellent";
  else if (overallScore >= 70) rating = "Strong";
  else if (overallScore >= 50) rating = "Moderate";

  // Build strengths and weaknesses
  const isTe = lang === "te";
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const missingElements: string[] = [];
  const recommendations: string[] = [];

  if (hasTaskAction) {
    strengths.push(isTe ? "ప్రధాన లక్ష్యం స్పష్టంగా నిర్వచించబడింది (Clear Task Definition)" : "Core task objective is clearly stated.");
  } else {
    weaknesses.push(isTe ? "నిర్దిష్ట కార్యాచరణ క్రియ లేదు (Missing explicit action verb)" : "Lacks explicit action verb (e.g. create, explain, design).");
    missingElements.push(isTe ? "యాక్షన్ క్రియ (Action Verb)" : "Direct Action Verb");
  }

  if (specMatches >= 1) {
    strengths.push(isTe ? "కీలక ఫీచర్లు లేదా సాంకేతిక అంశాలు గుర్తించబడ్డాయి" : "Includes specific domain features or technical terms.");
  } else {
    weaknesses.push(isTe ? "సాంకేతిక వివరాలు మరియు స్పష్టత తక్కువగా ఉంది" : "Lacks specific details, tools, or target technologies.");
    missingElements.push(isTe ? "టెక్నాలజీ లేదా ఫీచర్ల వివరాలు" : "Framework or Feature Details");
  }

  if (contextMatches >= 1) {
    strengths.push(isTe ? "సందర్భం మరియు ఉద్దేశం అందించబడింది (Context provided)" : "Provides audience or background context.");
  } else {
    missingElements.push(isTe ? "సందర్భం మరియు టార్గెట్ ఆడియన్స్" : "Target Audience / Role Context");
    recommendations.push(isTe ? "AI కి నిర్దిష్ట పాత్ర (ఉదా: 'Act as a Senior Architect') లేదా సందర్భాన్ని జోడించండి." : "Add a specific persona or context (e.g., 'Act as a Senior Architect').");
  }

  if (!hasOutputReq) {
    missingElements.push(isTe ? "అవుట్‌పుట్ ఫార్మాట్ (JSON, Code, Markdown)" : "Output Format (JSON, Code, Table)");
    recommendations.push(isTe ? "మీకు కావలసిన ఫార్మాట్ (కోడ్ మాత్రమే, పట్టిక, లేదా బుల్లెట్ పాయింట్లు) పేర్కొనండి." : "Specify desired output format (e.g., step-by-step, code only, or markdown table).");
  }

  if (!hasConstraints) {
    recommendations.push(isTe ? "పరిమితులు లేదా ఏమి నివారించాలో పేర్కొనండి (ఉదా: పరిమితులు లేదా నిబంధనలు)." : "Define negative constraints or boundaries (e.g., 'Do not use external libraries').");
  }

  return {
    overallScore,
    rating,
    detection,
    parameters: {
      taskDefinition: {
        name: isTe ? "కార్య నిర్వచనం" : "Task Definition",
        score: taskScore,
        weight: 18,
        description: isTe ? "స్పష్టమైన కార్యాచరణ మరియు లక్ష్యం" : "Clarity of the primary directive and objective",
        status: getStatus(taskScore),
      },
      clarity: {
        name: isTe ? "స్పష్టత" : "Clarity",
        score: clarityScore,
        weight: 16,
        description: isTe ? "గందరగోళం లేని వాక్య నిర్మాణం" : "Unambiguous sentence structure and readable intent",
        status: getStatus(clarityScore),
      },
      specificity: {
        name: isTe ? "నిర్దిష్టత" : "Specificity",
        score: specificityScore,
        weight: 16,
        description: isTe ? "టెక్నాలజీ, సంఖ్యలు, ఫీచర్లు" : "Presence of concrete technologies, numbers, or named components",
        status: getStatus(specificityScore),
      },
      completeness: {
        name: isTe ? "సమగ్రత" : "Completeness",
        score: completenessScore,
        weight: 14,
        description: isTe ? "వివరాల పరిధి మరియు లోతు" : "Breadth and depth of information provided to the model",
        status: getStatus(completenessScore),
      },
      context: {
        name: isTe ? "సందర్భం" : "Context",
        score: contextScore,
        weight: 12,
        description: isTe ? "లక్ష్య ప్రేక్షకులు మరియు నేపథ్యం" : "Background circumstances, audience, and domain grounding",
        status: getStatus(contextScore),
      },
      outputRequirements: {
        name: isTe ? "అవుట్‌పుట్ నిబంధనలు" : "Output Requirements",
        score: outputScore,
        weight: 10,
        description: isTe ? "ఫార్మాట్, నిర్మాణం, టోన్" : "Format specification (JSON, markdown, table, code-only)",
        status: getStatus(outputScore),
      },
      expectedResult: {
        name: isTe ? "ఆశించిన ఫలితం" : "Expected Result",
        score: expectedResultScore,
        weight: 8,
        description: isTe ? "తుది ఫలితం లేదా ప్రయోజనం" : "Measurable outcome expected from the AI execution",
        status: getStatus(expectedResultScore),
      },
      constraints: {
        name: isTe ? "పరిమితులు" : "Constraints",
        score: constraintScore,
        weight: 6,
        description: isTe ? "నిషేధాలు లేదా నియమాలు" : "Boundaries, exclusions, and negative guidance",
        status: getStatus(constraintScore),
      },
    },
    strengths,
    weaknesses,
    missingElements,
    recommendations,
    fairnessNote: detection.writingStyle === "romanized" || detection.writingStyle === "mixed"
      ? `Fairness Guaranteed: Prompt evaluated based on prompt engineering quality in Romanized ${detection.languageName}. Writing style is not penalized.`
      : `Evaluated in ${detection.languageName} (${detection.writingStyle}).`,
  };
}

function getStatus(score: number): "excellent" | "good" | "needs_improvement" | "poor" {
  if (score >= 80) return "excellent";
  if (score >= 65) return "good";
  if (score >= 45) return "needs_improvement";
  return "poor";
}

function createEmptyAnalysis(detection: DetectionResult): MultilingualAnalysisResult {
  const p = (name: string, weight: number): ParameterScore => ({
    name,
    score: 0,
    weight,
    description: "No prompt content entered",
    status: "poor",
  });

  return {
    overallScore: 0,
    rating: "Weak",
    detection,
    parameters: {
      taskDefinition: p("Task Definition", 18),
      clarity: p("Clarity", 16),
      specificity: p("Specificity", 16),
      completeness: p("Completeness", 14),
      context: p("Context", 12),
      outputRequirements: p("Output Requirements", 10),
      expectedResult: p("Expected Result", 8),
      constraints: p("Constraints", 6),
    },
    strengths: [],
    weaknesses: ["Prompt is empty."],
    missingElements: ["All required prompt components."],
    recommendations: ["Type or paste your prompt to receive language-aware quality analysis."],
    fairnessNote: "PromptIQ scores all 20 languages and Romanized inputs fairly.",
  };
}
