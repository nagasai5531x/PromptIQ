import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/health")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      GET: async () => {
        return new Response(JSON.stringify({ status: "ok" }), {
          status: 200,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-cache, no-store, must-revalidate",
          },
        });
      },
    },
  },
});
