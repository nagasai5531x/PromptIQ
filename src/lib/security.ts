// Rule-based prompt security scanner. Runs in the browser; pattern matching, not a guarantee of safety.
export type Severity = "low" | "medium" | "high" | "critical";
export type Finding = {
  id: string;
  title: string;
  severity: Severity;
  match: string;
  fix: string;
};
export type SecurityReport = {
  risk: number;
  level: Severity | "safe";
  findings: Finding[];
  hasSecrets: boolean;
};

const RULES: { id: string; title: string; severity: Severity; re: RegExp; fix: string }[] = [
  {
    id: "inject",
    title: "Instruction override / prompt injection",
    severity: "critical",
    re: /\b(ignore|disregard|forget)\b.{0,30}\b(previous|above|prior|all|earlier)\b.{0,20}\b(instructions?|rules?|prompts?)\b/i,
    fix: "Remove override phrases; never tell a model to ignore its rules.",
  },
  {
    id: "inject_te",
    title: "Telugu Prompt Injection / Override Attempt",
    severity: "critical",
    re: /\b(previous|mundu|anni|mundhati)\b.{0,35}\b(instructions?|rules?|soochanalu|niyamalu)\b.{0,30}\b(marchipo|vadilesey|pattinchukoku|marchipondi)\b|(మునుపటి|అన్ని).{0,25}(సూచనలు|నియమాలు).{0,25}(మర్చిపో|వదిలేయ్)/i,
    fix: "మునుపటి నిబంధనలను విస్మరించమని AI కి నిర్దేశించవద్దు (Do not attempt system instruction override in Telugu).",
  },
  {
    id: "inject_hi",
    title: "Hindi Prompt Injection / Override Attempt",
    severity: "critical",
    re: /\b(purane|pichle|saare|sabhi)\b.{0,35}\b(rules?|niyam|instructions?|hidayat)\b.{0,30}\b(bhul jao|bhol jao|chhod do|mat mano)\b|(पुराने|पिछले|सभी).{0,25}(नियम|निर्देश).{0,25}(भूल जाओ|छोड़ दो)/i,
    fix: "सिस्टम नियमों को अनदेखा करने के निर्देश निकालें (Remove rule bypass instructions in Hindi).",
  },
  {
    id: "inject_multilingual",
    title: "Multilingual System Override",
    severity: "critical",
    re: /\b(ignora|olvida|ignorer|oublie|ignoriere|vergiss)\b.{0,35}\b(todas?|toutes?|alle|instrucciones|instructions|anweisungen)\b/i,
    fix: "Remove international override commands and instruction bypasses.",
  },
  {
    id: "jailbreak",
    title: "Known jailbreak pattern",
    severity: "critical",
    re: /\b(DAN|do anything now|developer mode|jailbreak|no restrictions|without any (filters?|restrictions?)|unfiltered)\b/i,
    fix: "Remove jailbreak personas and restriction-bypass wording.",
  },
  {
    id: "exfil",
    title: "System prompt extraction attempt",
    severity: "high",
    re: /\b(reveal|print|show|repeat|output)\b.{0,30}\b(system|hidden|initial|developer)\b.{0,15}\b(prompt|instructions?|message)\b/i,
    fix: "Don't request hidden instructions; ask for the task output only.",
  },
  {
    id: "apikey",
    title: "Possible API key or secret",
    severity: "critical",
    re: /\b(sk-[A-Za-z0-9_-]{16,}|gsk_[A-Za-z0-9]{16,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{30,}|ghp_[A-Za-z0-9]{30,}|xox[bp]-[A-Za-z0-9-]{10,})/,
    fix: "Remove the key from the prompt and rotate it — never paste secrets into AI tools.",
  },
  {
    id: "password",
    title: "Password or token in text",
    severity: "high",
    re: /\b(password|passwd|pwd|token|secret)\s*[:=]\s*\S{4,}/i,
    fix: "Replace credentials with a placeholder like <PASSWORD>.",
  },
  {
    id: "email",
    title: "Email address (personal data)",
    severity: "medium",
    re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/,
    fix: "Replace with a placeholder such as <EMAIL> unless the model truly needs it.",
  },
  {
    id: "phone",
    title: "Phone number (personal data)",
    severity: "medium",
    re: /(\+?\d{1,3}[\s-]?)?\b[6-9]\d{9}\b|\+\d{1,3}[\s-]?\d{3}[\s-]?\d{3}[\s-]?\d{3,4}/,
    fix: "Mask phone numbers (e.g. 98XXXXXX10).",
  },
  {
    id: "aadhaar",
    title: "Aadhaar / card-like number",
    severity: "high",
    re: /\b\d{4}\s?\d{4}\s?\d{4}(\s?\d{4})?\b/,
    fix: "Never share Aadhaar, card or account numbers with an AI model.",
  },
  {
    id: "encoded",
    title: "Encoded / obfuscated payload",
    severity: "medium",
    re: /\b(base64|rot13|hex encoded|decode this)\b|[A-Za-z0-9+/]{60,}={0,2}/i,
    fix: "Avoid hidden encoded instructions; write the request in plain text.",
  },
  {
    id: "roleplay",
    title: "Role-play to bypass rules",
    severity: "medium",
    re: /\b(pretend|act as if|imagine) (you are|you're) (not an ai|evil|unrestricted|my (late )?grandmother)/i,
    fix: "Use role prompts for expertise, not to escape safety rules.",
  },
  {
    id: "harm",
    title: "Request for harmful content",
    severity: "high",
    re: /\b(make|build|create|synthesi[sz]e)\b.{0,25}\b(bomb|explosive|malware|ransomware|keylogger|weapon|poison)\b/i,
    fix: "This request is likely to be refused and may violate usage policies.",
  },
];

const WEIGHT: Record<Severity, number> = { low: 5, medium: 15, high: 30, critical: 45 };

export function scanPrompt(text: string): SecurityReport {
  const findings: Finding[] = [];
  let hasSecrets = false;

  for (const r of RULES) {
    const m = text.match(r.re);
    if (m) {
      if (r.id === "apikey" || r.id === "password" || r.id === "aadhaar") {
        hasSecrets = true;
      }
      findings.push({
        id: r.id,
        title: r.title,
        severity: r.severity,
        match: m[0].slice(0, 80),
        fix: r.fix,
      });
    }
  }

  if (
    text.trim().split(/\s+/).length > 20 &&
    !/\b(do not|don't|avoid|only|limit|must not|never)\b/i.test(text)
  ) {
    findings.push({
      id: "bounds",
      title: "No output boundaries",
      severity: "low",
      match: "—",
      fix: "Add limits (length, scope, what to avoid) to reduce unpredictable output.",
    });
  }

  const risk = Math.min(
    100,
    findings.reduce((s, f) => s + WEIGHT[f.severity], 0),
  );
  const level: SecurityReport["level"] = findings.some((f) => f.severity === "critical")
    ? "critical"
    : risk >= 30
      ? "high"
      : risk >= 15
        ? "medium"
        : risk > 0
          ? "low"
          : "safe";

  return { risk, level, findings, hasSecrets };
}

export function sanitizeSecrets(text: string): { sanitized: string; count: number } {
  let count = 0;
  let result = text;

  // Redact API keys
  result = result.replace(
    /\b(sk-[A-Za-z0-9_-]{16,}|gsk_[A-Za-z0-9]{16,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{30,}|ghp_[A-Za-z0-9]{30,}|xox[bp]-[A-Za-z0-9-]{10,})/g,
    () => {
      count++;
      return "<REDACTED_API_KEY>";
    },
  );

  // Redact passwords / credentials
  result = result.replace(
    /(\b(?:password|passwd|pwd|token|secret)\s*[:=]\s*)(\S{4,})/gi,
    (_, prefix) => {
      count++;
      return `${prefix}<REDACTED_PASSWORD>`;
    },
  );

  // Redact Aadhaar / Card numbers
  result = result.replace(/\b\d{4}\s?\d{4}\s?\d{4}(\s?\d{4})?\b/g, () => {
    count++;
    return "<REDACTED_CARD_NUMBER>";
  });

  // Redact emails
  result = result.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, () => {
    count++;
    return "<REDACTED_EMAIL>";
  });

  // Redact phone numbers
  result = result.replace(/(\+?\d{1,3}[\s-]?)?\b[6-9]\d{9}\b/g, () => {
    count++;
    return "<REDACTED_PHONE>";
  });

  return { sanitized: result, count };
}
