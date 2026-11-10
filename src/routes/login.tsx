import { createFileRoute } from "@tanstack/react-router";
import { LoginPage } from "@/components/auth/LoginPage";

export const Route = createFileRoute("/login")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Sign In | PromptIQ" },
      { name: "description", content: "Sign in to PromptIQ AI prompt engineering and optimization platform." },
    ],
  }),
  component: LoginPage,
});
