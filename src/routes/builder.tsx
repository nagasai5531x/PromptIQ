import { createFileRoute } from "@tanstack/react-router";
import { BuilderPage } from "@/components/FeaturePages";

export const Route = createFileRoute("/builder")({
  staticData: { sitemap: false },
  head: () => ({ meta: [
    { title: "Smart Prompt Builder | Prompt Quality Checker" },
    { name: "description", content: "Build a structured AI prompt with role, task, context, output, and constraints." },
    { property: "og:title", content: "Smart Prompt Builder | Prompt Quality Checker" },
    { property: "og:description", content: "Compose a clear, structured prompt and score it as you build." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: BuilderPage,
});