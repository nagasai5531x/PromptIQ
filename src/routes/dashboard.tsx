import { createFileRoute } from "@tanstack/react-router";
import { UserDashboardPage } from "@/components/UserDashboardPage";

export const Route = createFileRoute("/dashboard")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Personal Dashboard | PromptIQ" },
      { name: "description", content: "Your prompt engineering metrics, activity history, and recent runs." },
    ],
  }),
  component: UserDashboardPage,
});
