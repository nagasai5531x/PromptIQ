const { detectLanguage } = require('../src/lib/language-detector.ts');
const { analyzeMultilingualPrompt } = require('../src/lib/multilingual-analyzer.ts');
const { transliterateRomanizedToNative } = require('../src/lib/transliteration.ts');

const testCases = [
  { id: 1, prompt: 'I want to create an AI chatbot.', expectedLang: 'en', expectedStyle: 'english' },
  { id: 2, prompt: 'Naku oka AI chatbot create cheyyali.', expectedLang: 'te', expectedStyle: 'romanized' },
  { id: 3, prompt: 'నాకు ఒక AI చాట్బాట్ రూపొందించాలి.', expectedLang: 'te', expectedStyle: 'native_script' },
  { id: 4, prompt: 'Mujhe ek AI chatbot banana hai.', expectedLang: 'hi', expectedStyle: 'romanized' },
  { id: 5, prompt: 'Enakku oru AI chatbot venum.', expectedLang: 'ta', expectedStyle: 'romanized' },
  { id: 6, prompt: 'Nanage ondu AI chatbot beku.', expectedLang: 'kn', expectedStyle: 'romanized' },
  { id: 7, prompt: 'Enikku oru AI chatbot venam.', expectedLang: 'ml', expectedStyle: 'romanized' },
  { id: 8, prompt: 'I want an online shopping website, dantlo login and cart undali.', expectedLang: 'te', expectedStyle: 'mixed' },
  { id: 9, prompt: 'Quiero crear una aplicación web.', expectedLang: 'es', expectedStyle: 'romanized' },
  { id: 10, prompt: '私はウェブサイトを作りたいです。', expectedLang: 'ja', expectedStyle: 'native_script' },
];

console.log('================================================================');
console.log('TEST SUITE: ALL 10 MULTILINGUAL BENCHMARK PROMPTS');
console.log('================================================================');

let allPassed = true;

for (const tc of testCases) {
  const det = detectLanguage(tc.prompt);
  const analysis = analyzeMultilingualPrompt(tc.prompt);
  const transliterated = transliterateRomanizedToNative(tc.prompt, det.detectedCode);

  const langMatch = det.detectedCode === tc.expectedLang;
  const styleMatch = det.writingStyle === tc.expectedStyle;
  const scoreValid = analysis.overallScore > 0 && analysis.overallScore <= 100;

  if (!langMatch || !styleMatch || !scoreValid) {
    allPassed = false;
  }

  console.log('[Case ' + tc.id + '] "' + tc.prompt + '"');
  console.log('  -> Detected: ' + det.languageName + ' (' + det.detectedCode + ') | Style: ' + det.writingStyle + ' | Conf: ' + det.confidence + '%');
  console.log('  -> Score: ' + analysis.overallScore + '/100 (' + analysis.rating + ') | Fairness: ' + analysis.fairnessNote);
  if (det.writingStyle === 'romanized' || det.writingStyle === 'mixed') {
    console.log('  -> Transliterated Native Script: ' + transliterated);
  }
  console.log('  -> Status: ' + (langMatch && styleMatch && scoreValid ? 'PASS ✓' : 'FAIL ✗'));
  console.log('----------------------------------------------------------------');
}

console.log('RESULT: ' + (allPassed ? 'ALL 10 TEST CASES PASSED WITH 100% ACCURACY! ✓' : 'SOME CASES FAILED'));
