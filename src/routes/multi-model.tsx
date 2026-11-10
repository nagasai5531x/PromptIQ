import { createFileRoute } from "@tanstack/react-router";
import { MultiModelPage } from "@/components/MultiModelPage";

export const Route = createFileRoute("/multi-model")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Multi-Model Comparison Matrix | PromptIQ" },
      { name: "description", content: "Compare identical prompts across Groq, OpenAI, and Gemini models with real latencies, token counts, and scoring." },
      { property: "og:title", content: "Multi-Model Comparison Matrix | PromptIQ" },
      { property: "og:description", content: "Parallel AI execution matrix with quality evaluation." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MultiModelPage,
});
