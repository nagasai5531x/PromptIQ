import { createFileRoute } from "@tanstack/react-router";
import { AnalyticsPage } from "@/components/FeaturePages";

export const Route = createFileRoute("/analytics")({
  staticData: { sitemap: false },
  head: () => ({ meta: [
    { title: "Prompt Analytics | Prompt Quality Checker" },
    { name: "description", content: "Review score trends, common weak areas, and categories from your saved prompt history." },
    { property: "og:title", content: "Prompt Analytics | Prompt Quality Checker" },
    { property: "og:description", content: "Understand prompt score trends using your browser’s saved analyses." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: AnalyticsPage,
});