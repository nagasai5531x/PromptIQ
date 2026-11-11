// Server-only Groq helper. Only imported by *.functions.ts handlers; key passed in from the handler.
export const MODEL = "openai/gpt-oss-120b";
const FALLBACK_MODELS = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "qwen/qwen3.8-27b",
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
];

export type GroqFail = { ok: false; code: "missing_key" | "api_error" | "parse_error"; message: string };

export async function callGroq(
  key: string,
  messages: { role: "system" | "user"; content: string }[],
  json: boolean,
): Promise<{ ok: true; content: string } | GroqFail> {
  let lastError = "";

  for (const modelToTry of FALLBACK_MODELS) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: modelToTry,
          temperature: 0.4,
          ...(json ? { response_format: { type: "json_object" } } : {}),
          messages,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Groq error with model", modelToTry, res.status, errorText);

        if (res.status === 404) {
          // Model not found on this account, try the next model in FALLBACK_MODELS
          lastError = `Model "${modelToTry}" isn't available.`;
          continue;
        }

        const message =
          res.status === 401
            ? "The API key was rejected — please check GROQ_API_KEY."
            : res.status === 429
              ? "Rate limited by Groq — please try again in a few moments."
              : `Groq returned status ${res.status}.`;
        return { ok: false, code: "api_error", message };
      }

      const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      return { ok: true, content: body.choices?.[0]?.message?.content ?? "" };
    } catch (e) {
      console.error("Fetch exception for model", modelToTry, e);
      lastError = "Could not reach Groq. Please try again.";
    }
  }

  return { ok: false, code: "api_error", message: lastError || "Could not complete request with Groq models." };
}

export const missingKey: GroqFail = { ok: false, code: "missing_key", message: "GROQ_API_KEY is not configured on the server." };
