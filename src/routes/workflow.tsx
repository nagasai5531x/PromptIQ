import { createFileRoute } from "@tanstack/react-router";
import { WorkflowPage } from "@/components/WorkflowPage";

export const Route = createFileRoute("/workflow")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Visual Prompt Workflow Builder | PromptIQ" },
      { name: "description", content: "Assemble and execute visual prompt pipelines with optimization, security check, and evaluation nodes." },
      { property: "og:title", content: "Visual Prompt Workflow Builder | PromptIQ" },
      { property: "og:description", content: "Drag-and-drop visual pipeline execution engine." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WorkflowPage,
});
