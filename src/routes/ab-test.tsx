import { createFileRoute } from "@tanstack/react-router";
import { ABTestingPage } from "@/components/FeaturePages";

export const Route = createFileRoute("/ab-test")({
  staticData: { sitemap: false },
  head: () => ({ meta: [
    { title: "A/B Prompt Testing | Prompt Quality Checker" },
    { name: "description", content: "Compare two prompt versions on the same input and review their AI-generated outputs." },
    { property: "og:title", content: "A/B Prompt Testing | Prompt Quality Checker" },
    { property: "og:description", content: "Run two prompts on a shared test input and compare the results." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: ABTestingPage,
});