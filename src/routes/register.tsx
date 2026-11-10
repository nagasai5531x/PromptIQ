import { createFileRoute } from "@tanstack/react-router";
import { RegisterPage } from "@/components/auth/RegisterPage";

export const Route = createFileRoute("/register")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Create Account | PromptIQ" },
      { name: "description", content: "Register for PromptIQ AI prompt engineering and optimization platform." },
    ],
  }),
  component: RegisterPage,
});
