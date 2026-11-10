const RUN_ID_HEADER = "X-Lovable-AIG-Run-ID";

export function createRunIdFetch(initialRunId?: string) {
  let runId = initialRunId?.trim() || undefined;
  let resolveReady: (value: string | undefined) => void = () => {};
  let ready = false;
  const runIdReady = new Promise<string | undefined>((resolve) => {
    resolveReady = resolve;
  });

  const publishRunId = (value?: string) => {
    runId ??= value?.trim() || undefined;
    if (!ready) {
      ready = true;
      resolveReady(runId);
    }
  };

  if (runId) publishRunId(runId);

  return {
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      if (runId && !headers.has(RUN_ID_HEADER)) headers.set(RUN_ID_HEADER, runId);
      try {
        const response = await fetch(input, { ...init, headers });
        publishRunId(response.headers.get(RUN_ID_HEADER) ?? undefined);
        return response;
      } catch (error) {
        publishRunId(undefined);
        throw error;
      }
    },
    getRunId: () => runId,
    waitForRunId: () => (runId ? Promise.resolve(runId) : runIdReady),
  };
}

export function getRequestRunId(request: Request) {
  return request.headers.get(RUN_ID_HEADER)?.trim() || undefined;
}