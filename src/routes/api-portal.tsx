import { createFileRoute } from "@tanstack/react-router";
import { ApiPortalPage } from "@/components/ApiPortalPage";

export const Route = createFileRoute("/api-portal")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Developer API & REST Integrations | PromptIQ" },
      { name: "description", content: "REST API keys, interactive API tester, code snippets, and usage analytics." },
      { property: "og:title", content: "Developer API & REST Integrations | PromptIQ" },
      { property: "og:description", content: "Integrate prompt quality checks, optimization, and security into your production codebase." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ApiPortalPage,
});
