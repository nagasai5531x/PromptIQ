import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

function isApiOrServerFn(request: Request): boolean {
  try {
    const url = new URL(request.url);
    if (
      url.pathname.includes("/_serverFn") ||
      url.pathname.startsWith("/api") ||
      request.headers.get("x-tanstack-start-server-fn") ||
      request.headers.get("accept")?.includes("application/json") ||
      request.headers.get("content-type")?.includes("application/json") ||
      request.method === "POST"
    ) {
      return true;
    }
  } catch {}
  return false;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response, request: Request): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  const captured = consumeLastCapturedError();
  const errorMessage = captured instanceof Error ? captured.message : "Internal Server Error";
  console.error(captured ?? new Error(`h3 swallowed SSR error: ${body}`));

  if (isApiOrServerFn(request)) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: errorMessage || "Server function execution failed.",
        message: errorMessage || "Server function execution failed.",
      }),
      {
        status: 500,
        headers: { "content-type": "application/json; charset=utf-8" },
      },
    );
  }

  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const url = new URL(request.url);

    // Immediate lightweight health check endpoint (0 dependencies on SSR, DB, Auth, or Groq)
    if (request.method === "GET" && (url.pathname === "/health" || url.pathname === "/healthz" || url.pathname === "/api/health")) {
      return new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-cache, no-store, must-revalidate",
        },
      });
    }

    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response, request);
    } catch (error) {
      console.error(error);
      if (isApiOrServerFn(request)) {
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return new Response(
          JSON.stringify({
            ok: false,
            error: message,
            message,
          }),
          {
            status: 500,
            headers: { "content-type": "application/json; charset=utf-8" },
          },
        );
      }
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
