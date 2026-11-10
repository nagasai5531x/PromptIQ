import { createFileRoute } from "@tanstack/react-router";
import { ProfileSettingsPage } from "@/components/ProfileSettingsPage";

export const Route = createFileRoute("/profile")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Profile & Security Settings | PromptIQ" },
      { name: "description", content: "Manage credentials, update profile, change password, and session telemetry." },
    ],
  }),
  component: ProfileSettingsPage,
});
