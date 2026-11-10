import { createFileRoute } from "@tanstack/react-router";
import { TeamsPage } from "@/components/TeamsPage";

export const Route = createFileRoute("/teams")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Team Collaboration & Workspace | PromptIQ" },
      { name: "description", content: "Collaborative prompt workspaces, role-based access, team sharing, and audit feeds." },
      { property: "og:title", content: "Team Collaboration & Workspace | PromptIQ" },
      { property: "og:description", content: "Workspaces, prompt reviews, and permissions for prompt engineering teams." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TeamsPage,
});
