import { createFileRoute } from "@tanstack/react-router";
import { ActivityHistoryPage } from "@/components/ActivityHistoryPage";

export const Route = createFileRoute("/activity-history")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "User Activity Audit History | PromptIQ" },
      { name: "description", content: "Chronological audit log of prompt optimizations, analyses, and platform events." },
    ],
  }),
  component: ActivityHistoryPage,
});
