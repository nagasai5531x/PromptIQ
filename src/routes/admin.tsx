import { createFileRoute } from "@tanstack/react-router";
import { AdminDashboardPage } from "@/components/AdminDashboardPage";

export const Route = createFileRoute("/admin")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Platform Administration Console | PromptIQ" },
      { name: "description", content: "Role-based access, platform-wide activity logs, and user management." },
    ],
  }),
  component: AdminDashboardPage,
});
