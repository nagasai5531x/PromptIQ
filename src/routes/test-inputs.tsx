import { createFileRoute } from "@tanstack/react-router";
import { TestInputsPage } from "@/components/FeaturePages";

export const Route = createFileRoute("/test-inputs")({
  staticData: { sitemap: false },
  head: () => ({ meta: [
    { title: "AI Test Input Generator | Prompt Quality Checker" },
    { name: "description", content: "Generate realistic test inputs and evaluation criteria for validating a prompt." },
    { property: "og:title", content: "AI Test Input Generator | Prompt Quality Checker" },
    { property: "og:description", content: "Create useful test cases from a prompt and its intended use case." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: TestInputsPage,
});