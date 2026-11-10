import { createFileRoute } from "@tanstack/react-router";
import { LibraryPage } from "@/components/FeaturePages";

export const Route = createFileRoute("/library")({
  staticData: { sitemap: false },
  head: () => ({ meta: [
    { title: "Prompt Library & History | Prompt Quality Checker" },
    { name: "description", content: "Browse practical prompt templates and review saved prompt analysis from this browser." },
    { property: "og:title", content: "Prompt Library & History | Prompt Quality Checker" },
    { property: "og:description", content: "Explore reusable examples and revisit your prompt history." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: LibraryPage,
});