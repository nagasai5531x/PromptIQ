import { createFileRoute } from "@tanstack/react-router";
import { MarketplacePage } from "@/components/MarketplacePage";

export const Route = createFileRoute("/marketplace")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Prompt Marketplace & Community Hub | PromptIQ" },
      { name: "description", content: "Explore, rate, and reuse curated enterprise prompts across engineering, marketing, and business." },
      { property: "og:title", content: "Prompt Marketplace & Community Hub | PromptIQ" },
      { property: "og:description", content: "Community prompt library with reviews, ratings, and one-click saving." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MarketplacePage,
});
