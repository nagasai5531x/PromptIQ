import { createFileRoute } from "@tanstack/react-router";
import { EvaluatorPage } from "@/components/EvaluatorPage";

export const Route = createFileRoute("/evaluator")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "AI Prompt Benchmark Suite | PromptIQ" },
      { name: "description", content: "6-dimension prompt evaluation, test case benchmarking, and weakness diagnostics." },
      { property: "og:title", content: "AI Prompt Benchmark Suite | PromptIQ" },
      { property: "og:description", content: "Comprehensive AI evaluation and benchmark scoring." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EvaluatorPage,
});
