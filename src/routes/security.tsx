import { createFileRoute } from "@tanstack/react-router";
import { SecurityPage } from "@/components/FeaturePages";

export const Route = createFileRoute("/security")({
  staticData: { sitemap: false },
  head: () => ({ meta: [
    { title: "Prompt Security Checker | Prompt Quality Checker" },
    { name: "description", content: "Scan prompts for common injection, secret, privacy, and output-boundary risks." },
    { property: "og:title", content: "Prompt Security Checker | Prompt Quality Checker" },
    { property: "og:description", content: "Check for common risky patterns before sending a prompt to an AI." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: SecurityPage,
});