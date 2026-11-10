// Intelligent Multilingual & Romanized Language Detector
// Detects native scripts, Romanized South Asian/European languages, and mixed code-switching.

export type SupportedLanguageCode =
  | "en"
  | "te"
  | "hi"
  | "ta"
  | "kn"
  | "ml"
  | "bn"
  | "mr"
  | "gu"
  | "pa"
  | "ur"
  | "es"
  | "fr"
  | "de"
  | "pt"
  | "ja"
  | "zh"
  | "ko"
  | "ar"
  | "ru";

export type WritingStyle = "native_script" | "romanized" | "english" | "mixed";

export interface LanguageInfo {
  code: SupportedLanguageCode;
  name: string;
  nativeName: string;
  script: string;
}

export interface DetectionResult {
  detectedCode: SupportedLanguageCode;
  languageName: string;
  nativeName: string;
  writingStyle: WritingStyle;
  confidence: number; // 0 - 100
  isMixed: boolean;
  mixedDetails?: string | undefined;
  detectedScripts: string[];
}

export const SUPPORTED_LANGUAGES: Record<SupportedLanguageCode, LanguageInfo> = {
  en: { code: "en", name: "English", nativeName: "English", script: "Latin" },
  te: { code: "te", name: "Telugu", nativeName: "తెలుగు", script: "Telugu" },
  hi: { code: "hi", name: "Hindi", nativeName: "हिन्दी", script: "Devanagari" },
  ta: { code: "ta", name: "Tamil", nativeName: "தமிழ்", script: "Tamil" },
  kn: { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ", script: "Kannada" },
  ml: { code: "ml", name: "Malayalam", nativeName: "മലയാളം", script: "Malayalam" },
  bn: { code: "bn", name: "Bengali", nativeName: "বাংলা", script: "Bengali" },
  mr: { code: "mr", name: "Marathi", nativeName: "मराठी", script: "Devanagari" },
  gu: { code: "gu", name: "Gujarati", nativeName: "ગુજરાતી", script: "Gujarati" },
  pa: { code: "pa", name: "Punjabi", nativeName: "ਪੰਜਾਬੀ", script: "Gurmukhi" },
  ur: { code: "ur", name: "Urdu", nativeName: "اردو", script: "Arabic" },
  es: { code: "es", name: "Spanish", nativeName: "Español", script: "Latin" },
  fr: { code: "fr", name: "French", nativeName: "Français", script: "Latin" },
  de: { code: "de", name: "German", nativeName: "Deutsch", script: "Latin" },
  pt: { code: "pt", name: "Portuguese", nativeName: "Português", script: "Latin" },
  ja: { code: "ja", name: "Japanese", nativeName: "日本語", script: "Japanese" },
  zh: { code: "zh", name: "Chinese", nativeName: "中文", script: "Han" },
  ko: { code: "ko", name: "Korean", nativeName: "한국어", script: "Hangul" },
  ar: { code: "ar", name: "Arabic", nativeName: "العربية", script: "Arabic" },
  ru: { code: "ru", name: "Russian", nativeName: "Русский", script: "Cyrillic" },
};

// 1. Script Unicode Block Regexes
const SCRIPT_PATTERNS: { code: SupportedLanguageCode; name: string; regex: RegExp }[] = [
  { code: "te", name: "Telugu", regex: /[\u0C00-\u0C7F]/ },
  { code: "ta", name: "Tamil", regex: /[\u0B80-\u0BFF]/ },
  { code: "kn", name: "Kannada", regex: /[\u0C80-\u0CFF]/ },
  { code: "ml", name: "Malayalam", regex: /[\u0D00-\u0D7F]/ },
  { code: "bn", name: "Bengali", regex: /[\u0980-\u09FF]/ },
  { code: "gu", name: "Gujarati", regex: /[\u0A80-\u0AFF]/ },
  { code: "pa", name: "Punjabi", regex: /[\u0A00-\u0A7F]/ },
  { code: "ja", name: "Japanese", regex: /[\u3040-\u309F\u30A0-\u30FF]/ },
  { code: "ko", name: "Korean", regex: /[\uAC00-\uD7AF\u1100-\u11FF]/ },
  { code: "zh", name: "Chinese", regex: /[\u4E00-\u9FFF]/ },
  { code: "ar", name: "Arabic", regex: /[\u0600-\u06FF\u0750-\u077F]/ },
  { code: "ru", name: "Russian", regex: /[\u0400-\u04FF]/ },
  { code: "hi", name: "Hindi / Marathi", regex: /[\u0900-\u097F]/ }, // Devanagari
];

// 2. High-precision Romanized Indic & European vocabulary dictionaries
const ROMANIZED_PATTERNS: Record<SupportedLanguageCode, { regex: RegExp; weight: number; markers: string[] }> = {
  te: {
    // Telugu Romanized markers (Telugu-specific verbs, pronouns, suffixes, words)
    regex: /\b(naku|neeku|maku|tanaku|vaallaku|undali|kavali|cheyyali|cheyali|cheyyandi|cheyandi|ivvali|chudali|rayali|pampali|ela|enti|enduku|ekkada|eppudu|dantlo|andulo|indulo|oka|okati|rendu|chala|bagundi|chesi|pettali|avunu|ledu|gurinchi|kosam|matladali|vadali|chesko|kuda|chesuko|ravali|vasthundi|vastundi)\b/i,
    weight: 3,
    markers: [
      "naku", "neeku", "maku", "undali", "kavali", "cheyyali", "cheyali", "cheyyandi",
      "dantlo", "andulo", "indulo", "oka", "chala", "bagundi", "chesi", "pettali", "gurinchi", "kosam"
    ],
  },
  hi: {
    // Hindi Romanized markers
    regex: /\b(mujhe|tumhe|humein|use|unhe|banana|banaye|karein|karna|chahiye|hona|kaise|kya|kyun|kahan|kab|ismein|usmein|ek|bahut|achha|diya|dejiye|baare|liye|sakta|sakate|hoga|raha|rahi|hain|karo|batao|chahata|chahati)\b/i,
    weight: 3,
    markers: [
      "mujhe", "tumhe", "humein", "banana", "chahiye", "karna", "kaise", "kya", "kyun",
      "ismein", "usmein", "bahut", "achha", "dejiye", "liye", "hoga", "hain", "batao"
    ],
  },
  ta: {
    // Tamil Romanized markers
    regex: /\b(enakku|unakku|engalukku|avangalukku|venum|pannanum|seyyanum|irukkanum|eppadi|enna|yean|enge|eppothu|idhu|adhu|oru|rombha|romba|nalla|kudunga|pannunga|kooda|patri|thodarbaga)\b/i,
    weight: 3,
    markers: [
      "enakku", "unakku", "venum", "pannanum", "seyyanum", "irukkanum", "eppadi", "enna",
      "romba", "rombha", "nalla", "kudunga", "pannunga", "oru"
    ],
  },
  kn: {
    // Kannada Romanized markers
    regex: /\b(nanage|ninage|namage|avarige|beku|madabeku|irabeku|hege|yenu|yake|elli|yavaga|idu|adu|ondu|tumba|chennagi|kodi|madi|bahu|bagge|kurithu)\b/i,
    weight: 3,
    markers: ["nanage", "ninage", "beku", "madabeku", "hege", "yenu", "ondu", "tumba", "chennagi"],
  },
  ml: {
    // Malayalam Romanized markers
    regex: /\b(enikku|ninakku|njangalkku|avarkku|venam|cheyyanam|undavanam|enganeyanu|enthanu|enthukondu|evide|eppozhanu|ithu|athu|oru|valare|nallath|tharu|cheyyu|kurichu)\b/i,
    weight: 3,
    markers: ["enikku", "ninakku", "venam", "cheyyanam", "undavanam", "enganeyanu", "enthanu", "oru", "valare"],
  },
  bn: {
    // Bengali Romanized markers
    regex: /\b(amar|tomar|amader|tader|dorkar|chai|korbo|korte|hobe|ki|bhabe|keno|kothay|kokhon|eta|ota|ekta|khub|bhalo|din|korun|somporke)\b/i,
    weight: 3,
    markers: ["amar", "tomar", "dorkar", "chai", "korbo", "korte", "hobe", "ekta", "khub", "bhalo"],
  },
  mr: {
    // Marathi Romanized markers
    regex: /\b(mala|tula|amhala|tyana|pahije|karaycha|banvaychi|aahe|kasa|kay|ka|kuthe|kadhi|he|te|ek|khup|chhan|dya|kara|baddal)\b/i,
    weight: 3,
    markers: ["mala", "tula", "pahije", "karaycha", "banvaychi", "aahe", "kasa", "kay", "khup", "chhan"],
  },
  gu: {
    // Gujarati Romanized markers
    regex: /\b(mane|tamne|amne|temne|joiye|karvu|banavvi|che|kem|shu|kyan|kyare|aa|te|ek|bahu|saras|aapo|karo|vishe)\b/i,
    weight: 3,
    markers: ["mane", "tamne", "joiye", "karvu", "banavvi", "che", "kem", "shu", "bahu", "saras"],
  },
  pa: {
    // Punjabi Romanized markers
    regex: /\b(mainu|tenu|saanu|unha|chahida|chahidi|karna|banani|hai|kivein|ki|kyun|kithe|kadon|eh|oh|ik|bahut|vadiya|dasso|karo)\b/i,
    weight: 3,
    markers: ["mainu", "tenu", "chahida", "chahidi", "karna", "banani", "kivein", "vadiya"],
  },
  ur: {
    // Urdu Romanized markers
    regex: /\b(mujhe|aapko|humein|unhe|chahiye|karna|hoga|kaise|kya|kyun|kahan|kab|bohat|shukriya|janab|tashreef|bataiye)\b/i,
    weight: 2,
    markers: ["shukriya", "janab", "tashreef", "bataiye"],
  },
  es: {
    // Spanish markers
    regex: /\b(quiero|crear|aplicaci[oó]n|hacer|por favor|c[oó]mo|d[oó]nde|cu[aá]ndo|para|con|este|esta|una|un|el|la|los|las|de|que|en|es)\b/i,
    weight: 2,
    markers: ["quiero", "crear", "aplicación", "hacer", "por favor", "cómo", "para"],
  },
  fr: {
    // French markers
    regex: /\b(je veux|cr[eé]er|faire|s'il vous pla[iî]t|comment|o[uù]|quand|pour|avec|cette|ce|un|une|le|la|les|dans|est)\b/i,
    weight: 2,
    markers: ["je veux", "créer", "faire", "comment", "pour", "avec"],
  },
  de: {
    // German markers
    regex: /\b(ich m[oö]chte|erstellen|machen|bitte|wie|wo|wann|f[uü]r|mit|dieser|dieses|ein|eine|der|die|das|und|ist)\b/i,
    weight: 2,
    markers: ["ich möchte", "erstellen", "machen", "bitte", "wie", "für"],
  },
  pt: {
    // Portuguese markers
    regex: /\b(eu quero|criar|fazer|por favor|como|onde|quando|para|com|este|esta|um|uma|o|a|os|as|do|da|em|é)\b/i,
    weight: 2,
    markers: ["eu quero", "criar", "fazer", "como", "para"],
  },
  ru: {
    // Romanized Russian markers (distinct multi-character words only)
    regex: /\b(ya khochu|khochu|sozdat|sdelat|pozhaluysta|privet|spasibo|khorosho|pochemu|kogda|skolko|pomogi|bystro)\b/i,
    weight: 3,
    markers: ["khochu", "sozdat", "sdelat", "pozhaluysta", "privet", "spasibo"],
  },
  en: {
    // Common English words
    regex: /\b(the|is|are|was|were|have|has|had|will|would|can|could|should|about|create|write|explain|with|this|that|from|for|and|in|on|at|to)\b/i,
    weight: 1,
    markers: ["the", "is", "are", "was", "have", "will", "write", "explain", "create", "with"],
  },
  ja: { regex: /$^/, weight: 1, markers: [] },
  zh: { regex: /$^/, weight: 1, markers: [] },
  ko: { regex: /$^/, weight: 1, markers: [] },
  ar: { regex: /$^/, weight: 1, markers: [] },
};

// Common English words used in code-switching
const ENGLISH_MARKERS = [
  "i", "want", "to", "create", "website", "an", "online", "shopping", "app", "application",
  "login", "cart", "chatbot", "ai", "button", "page", "user", "with", "and", "under", "words",
  "code", "react", "python", "javascript", "function", "design", "portfolio", "explain"
];

/**
 * Intelligent Language Detector
 * Accurately detects:
 * - Native Script languages
 * - Romanized native languages (e.g. Telugu, Hindi, Tamil in Latin alphabet)
 * - Mixed / code-switched inputs
 * - Confidence level
 */
export function detectLanguage(text: string): DetectionResult {
  const clean = text.trim();
  if (!clean) {
    return {
      detectedCode: "en",
      languageName: "English",
      nativeName: "English",
      writingStyle: "english",
      confidence: 100,
      isMixed: false,
      detectedScripts: ["Latin"],
    };
  }

  // 1. Check for Native Scripts (Non-Latin Unicode characters)
  const scriptHits: { code: SupportedLanguageCode; name: string; count: number }[] = [];
  for (const script of SCRIPT_PATTERNS) {
    const matches = clean.match(new RegExp(script.regex.source, "gu"));
    if (matches && matches.length > 0) {
      scriptHits.push({ code: script.code, name: script.name, count: matches.length });
    }
  }

  // If predominant native script is found:
  if (scriptHits.length > 0) {
    scriptHits.sort((a, b) => b.count - a.count);
    const topScript = scriptHits[0]!;
    const langInfo = SUPPORTED_LANGUAGES[topScript.code];

    // Check if there is also Latin text (mixed script)
    const latinLetters = (clean.match(/[a-zA-Z]/g) || []).length;
    const isMixed = latinLetters >= 3 && topScript.count >= 3;

    let confidence = 98;
    if (isMixed) {
      confidence = 92;
    }

    return {
      detectedCode: topScript.code,
      languageName: langInfo.name,
      nativeName: langInfo.nativeName,
      writingStyle: isMixed ? "mixed" : "native_script",
      confidence,
      isMixed,
      mixedDetails: isMixed ? `${langInfo.name} Native Script + English Words` : undefined,
      detectedScripts: [topScript.name, ...(isMixed ? ["Latin"] : [])],
    };
  }

  // 2. Pure or Predominant Latin Script -> Analyze Romanized Languages vs English
  const words = clean.toLowerCase().split(/[\s,.;:!?()[\]{}"'\\/+-]+/).filter(Boolean);
  const totalWords = Math.max(1, words.length);

  // Score each Romanized language
  const scores: Record<SupportedLanguageCode, number> = {
    en: 0, te: 0, hi: 0, ta: 0, kn: 0, ml: 0, bn: 0, mr: 0, gu: 0, pa: 0, ur: 0,
    es: 0, fr: 0, de: 0, pt: 0, ja: 0, zh: 0, ko: 0, ar: 0, ru: 0,
  };

  let englishWordCount = 0;
  for (const word of words) {
    if (ENGLISH_MARKERS.includes(word)) {
      englishWordCount++;
    }

    // Check against language specific markers
    for (const [codeStr, pattern] of Object.entries(ROMANIZED_PATTERNS)) {
      const code = codeStr as SupportedLanguageCode;
      if (pattern.markers.includes(word)) {
        scores[code] += pattern.weight * 2;
      } else if (pattern.regex.test(word)) {
        scores[code] += pattern.weight;
      }
    }
  }

  // Also check phrase-level regex hits across the whole sentence
  for (const [codeStr, pattern] of Object.entries(ROMANIZED_PATTERNS)) {
    const code = codeStr as SupportedLanguageCode;
    const phraseMatches = clean.match(new RegExp(pattern.regex.source, "gi"));
    if (phraseMatches) {
      scores[code] += phraseMatches.length * pattern.weight;
    }
  }

  // Give baseline weight to English if common English words found
  scores.en += englishWordCount * 1.5;

  // Find highest scoring language
  const nonEnglishEntries = (Object.entries(scores) as [SupportedLanguageCode, number][])
    .filter(([c]) => c !== "en")
    .sort((a, b) => b[1] - a[1]);

  const topNonEnglish = nonEnglishEntries[0];

  // Logic: Did we find strong Romanized Indic / Foreign language markers?
  if (topNonEnglish && topNonEnglish[1] >= 3) {
    const detectedCode = topNonEnglish[0];
    const langInfo = SUPPORTED_LANGUAGES[detectedCode];
    const nonEnglishScore = topNonEnglish[1];
    const enScore = scores.en;

    // Differentiate pure Romanized native vs mixed code-switching (e.g., "I want an online shopping website, dantlo login and cart undali.")
    // Mixed occurs when there are genuine English functional words (pronouns/conjunctions/clauses) alongside native markers
    const englishGrammarWords = ["i", "want", "need", "the", "an", "a", "and", "with", "for", "in", "on", "should", "will", "is", "have"];
    const englishGrammarCount = words.filter((w) => englishGrammarWords.includes(w)).length;
    const isMixed = englishGrammarCount >= 2 && nonEnglishScore >= 3;
    const confidence = Math.min(99, Math.round(75 + (nonEnglishScore / (nonEnglishScore + enScore + 1)) * 24));

    return {
      detectedCode,
      languageName: langInfo.name,
      nativeName: langInfo.nativeName,
      writingStyle: isMixed ? "mixed" : "romanized",
      confidence,
      isMixed,
      mixedDetails: isMixed ? `${langInfo.name} (Romanized) + English Mixed` : `Romanized ${langInfo.name}`,
      detectedScripts: ["Latin (Romanized)"],
    };
  }

  // Default to English if no strong native or romanized markers detected
  const isEnglish = true;
  return {
    detectedCode: "en",
    languageName: "English",
    nativeName: "English",
    writingStyle: "english",
    confidence: Math.min(98, 85 + Math.min(10, englishWordCount * 2)),
    isMixed: false,
    detectedScripts: ["Latin"],
  };
}
