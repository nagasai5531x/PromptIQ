import { createFileRoute } from "@tanstack/react-router";
import { AttackSimulatorPage } from "@/components/AttackSimulatorPage";

export const Route = createFileRoute("/attack-simulator")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Prompt Attack Simulator & Security Testing | PromptIQ" },
      { name: "description", content: "Controlled defensive security testing for prompt injection, jailbreaks, and secret leak prevention." },
      { property: "og:title", content: "Prompt Attack Simulator & Security Testing | PromptIQ" },
      { property: "og:description", content: "Simulate adversarial attack vectors and generate hardened prompt guardrails." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AttackSimulatorPage,
});
