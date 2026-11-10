// Bidirectional Transliteration Engine for Indic and Supported Languages
// Converts Romanized (Latin letters) to Native Script and vice versa.

import type { SupportedLanguageCode } from "./language-detector.ts";

// Common spoken vocabulary transliterations / phrasing dictionary for high fidelity
const INDIC_PHRASE_DICTIONARY: Record<SupportedLanguageCode, Record<string, string>> = {
  te: {
    "naku": "నాకు",
    "neeku": "నీకు",
    "maku": "మాకు",
    "oka": "ఒక",
    "website": "వెబ్‌సైట్",
    "ai": "AI",
    "chatbot": "చాట్బాట్",
    "create": "క్రియేట్",
    "cheyyali": "చేయాలి",
    "cheyali": "చేయాలి",
    "cheyyandi": "చేయండి",
    "undali": "ఉండాలి",
    "kavali": "కావాలి",
    "dantlo": "దాంట్లో",
    "andulo": "అందులో",
    "login": "లాగిన్",
    "cart": "కార్ట్",
    "online": "ఆన్‌లైన్",
    "shopping": "షాపింగ్",
    "app": "యాప్",
    "application": "అప్లికేషన్",
    "chala": "చాలా",
    "bagundi": "బాగుంది",
    "kosam": "కోసం",
    "gurinchi": "గురించి",
    "ivvali": "ఇవ్వాలి",
    "rayali": "రాయాలి",
    "chudali": "చూడాలి",
    "ela": "ఎలా",
    "enti": "ఏంటి",
    "enduku": "ఎందుకు",
    "ekkada": "ఎక్కడ",
    "eppudu": "ఎప్పుడు",
    "matladali": "మాట్లాడాలి",
    "rupondinchali": "రూపొందించాలి",
  },
  hi: {
    "mujhe": "मुझे",
    "tumhe": "तुम्हें",
    "humein": "हमें",
    "ek": "एक",
    "website": "वेबसाइट",
    "ai": "AI",
    "chatbot": "चैटबॉट",
    "banana": "बनाना",
    "banaye": "बनाएं",
    "hai": "है",
    "hain": "हैं",
    "chahiye": "चाहिए",
    "karna": "करना",
    "karein": "करें",
    "kaise": "कैसे",
    "kya": "क्या",
    "kyun": "क्यों",
    "kahan": "कहाँ",
    "kab": "कब",
    "ismein": "इसमें",
    "usmein": "उसमें",
    "login": "लॉगिन",
    "cart": "कार्ट",
    "online": "ऑनलाइन",
    "shopping": "शॉपिंग",
    "bahut": "बहुत",
    "achha": "अच्छा",
    "liye": "लिए",
    "batao": "बताओ",
  },
  ta: {
    "enakku": "எனக்கு",
    "unakku": "உனக்கு",
    "oru": "ஒரு",
    "website": "வலைத்தளம்",
    "ai": "AI",
    "chatbot": "சாட்பாட்",
    "venum": "வேண்டும்",
    "pannanum": "பண்ணனும்",
    "seyyanum": "செய்ய வேண்டும்",
    "eppadi": "எப்படி",
    "enna": "என்ன",
    "irukkanum": "இருக்க வேண்டும்",
    "shopping": "ஷாப்பிங்",
    "online": "ஆன்லைன்",
    "romba": "ரொம்ப",
    "nalla": "நல்ல",
  },
  kn: {
    "nanage": "ನನಗೆ",
    "ninage": "ನಿನಗೆ",
    "ondu": "ಒಂದು",
    "website": "ವೆಬ್‌ಸೈಟ್",
    "ai": "AI",
    "chatbot": "ಚಾಟ್‌ಬಾಟ್",
    "beku": "ಬೇಕು",
    "madabeku": "ಮಾಡಬೇಕು",
    "irabeku": "ಇರಬೇಕು",
    "hege": "ಹೇಗೆ",
    "yenu": "ಏನು",
    "tumba": "ತುಂಬಾ",
  },
  ml: {
    "enikku": "എനിക്ക്",
    "ninakku": "നിനക്ക്",
    "oru": "ഒരു",
    "website": "വെബ്സൈറ്റ്",
    "ai": "AI",
    "chatbot": "ചാറ്റ്ബോട്ട്",
    "venam": "വേണം",
    "cheyyanam": "ചെയ്യണം",
    "undavanam": "ഉണ്ടാവണം",
    "enganeyanu": "എങ്ങനെയാണ്",
  },
  bn: {
    "amar": "আমার",
    "tomar": "তোমার",
    "ekta": "একটা",
    "website": "ওয়েবসাইট",
    "ai": "AI",
    "chatbot": "চ্যাটবট",
    "dorkar": "দরকার",
    "chai": "চাই",
    "korte": "করতে",
    "hobe": "হবে",
    "khub": "খুব",
    "bhalo": "ভালো",
  },
  mr: {
    "mala": "मला",
    "tula": "तुला",
    "ek": "एक",
    "website": "वेबसाइट",
    "ai": "AI",
    "chatbot": "चॅटबॉट",
    "banvaychi": "बनवायची",
    "aahe": "आहे",
    "pahije": "पाहिजे",
    "karaycha": "करायचा",
  },
  gu: {
    "mane": "મને",
    "tamne": "તમને",
    "ek": "એક",
    "website": "વેબસાઇટ",
    "ai": "AI",
    "chatbot": "ચેટબોટ",
    "joiye": "જોઈએ",
    "banavvi": "બનાવવી",
    "che": "છે",
  },
  pa: {
    "mainu": "ਮੈਨੂੰ",
    "tenu": "ਤੈਨੂੰ",
    "ik": "ਇੱਕ",
    "website": "ਵੈੱਬਸਾਈਟ",
    "ai": "AI",
    "chatbot": "ਚੈਟਬੋਟ",
    "chahida": "ਚਾਹੀਦਾ",
    "karna": "ਕਰਨਾ",
    "hai": "ਹੈ",
  },
  ur: {
    "mujhe": "مجھے",
    "aapko": "آپ کو",
    "ek": "ایک",
    "website": "ویب سائٹ",
    "ai": "AI",
    "chatbot": "چیٹ بوٹ",
    "chahiye": "چاہیے",
    "karna": "کرنا",
    "hai": "ہے",
  },
  en: {},
  es: {},
  fr: {},
  de: {},
  pt: {},
  ja: {},
  zh: {},
  ko: {},
  ar: {},
  ru: {},
};

/**
 * Fast client/server rule-based transliteration from Romanized to Native Script
 */
export function transliterateRomanizedToNative(text: string, targetLanguage: SupportedLanguageCode): string {
  if (!text || !text.trim()) return text;

  const dict = INDIC_PHRASE_DICTIONARY[targetLanguage];
  if (!dict || Object.keys(dict).length === 0) {
    return text; // No transliteration needed for non-Indic Latin or direct scripts
  }

  // Tokenize preserving whitespace and punctuation
  return text.replace(/([a-zA-Z0-9'-]+|[^\s\w]+|\s+)/g, (match) => {
    // If whitespace or punctuation, return as-is
    if (/^[\s\p{P}\p{S}]+$/u.test(match)) return match;

    const lower = match.toLowerCase();
    if (dict[lower]) {
      return dict[lower];
    }

    return match;
  });
}
