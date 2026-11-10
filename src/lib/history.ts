// Prompt history & A/B testing storage in this browser (localStorage).
import type { Category } from "./analyzer";

export type PromptVersion = {
  version: number;
  prompt: string;
  ts: number;
  score?: number | undefined;
};

export type HistoryEntry = {
  id: string;
  ts: number;
  prompt: string;
  title?: string | undefined;
  category: Category;
  score: number;
  band: string;
  criteria: Record<string, number>;
  improved?: { prompt: string; score: number } | undefined;
  security?: string | undefined;
  favorite?: boolean | undefined;
  source: "checker" | "builder" | "ab" | "library";
  versions?: PromptVersion[] | undefined;
};

export type AbHistoryEntry = {
  id: string;
  ts: number;
  promptA: string;
  promptB: string;
  testInput: string;
  outputA: string;
  outputB: string;
  winner: "A" | "B" | "tie";
  scoreA: number;
  scoreB: number;
  latencyA?: number | undefined; // in milliseconds
  latencyB?: number | undefined; // in milliseconds
  ratingA?: number | undefined;  // manual user rating 1-5
  ratingB?: number | undefined;  // manual user rating 1-5
  reasoning: string;
};

const KEY = "pqc-history-v1";
const AB_KEY = "pqc-ab-history-v1";
const EVT = "pqc-history-change";
const AB_EVT = "pqc-ab-history-change";

export function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function save(list: HistoryEntry[]) {
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, 200)));
  window.dispatchEvent(new Event(EVT));
}

export function addHistory(e: Omit<HistoryEntry, "id" | "ts">): HistoryEntry {
  const entry: HistoryEntry = {
    ...e,
    id: crypto.randomUUID(),
    ts: Date.now(),
    versions: [{ version: 1, prompt: e.prompt, ts: Date.now(), score: e.score }],
  };
  const list = loadHistory();
  // Collapse repeat analyses of the same prompt into the latest one
  save([entry, ...list.filter((x) => x.prompt !== e.prompt)]);
  return entry;
}

export function updateHistory(id: string, patch: Partial<HistoryEntry>) {
  save(loadHistory().map((x) => (x.id === id ? { ...x, ...patch } : x)));
}

export function editPromptHistory(
  id: string,
  newPrompt: string,
  newScore?: number,
  newBand?: string,
  newCriteria?: Record<string, number>,
) {
  const list = loadHistory();
  const updated = list.map((item) => {
    if (item.id !== id) return item;

    const previousVersions = item.versions || [
      { version: 1, prompt: item.prompt, ts: item.ts, score: item.score },
    ];
    const newVersionNum = previousVersions.length + 1;

    const newVersions: PromptVersion[] = [
      ...previousVersions,
      {
        version: newVersionNum,
        prompt: newPrompt,
        ts: Date.now(),
        score: newScore ?? item.score,
      },
    ];

    return {
      ...item,
      prompt: newPrompt,
      score: newScore ?? item.score,
      band: newBand ?? item.band,
      criteria: newCriteria ?? item.criteria,
      ts: Date.now(),
      versions: newVersions,
    };
  });
  save(updated);
}

export function restorePromptVersion(id: string, versionNumber: number) {
  const list = loadHistory();
  const entry = list.find((x) => x.id === id);
  if (!entry || !entry.versions) return;

  const targetVersion = entry.versions.find((v) => v.version === versionNumber);
  if (!targetVersion) return;

  editPromptHistory(id, targetVersion.prompt, targetVersion.score);
}

export function removeHistory(id: string) {
  save(loadHistory().filter((x) => x.id !== id));
}

export function clearHistory() {
  save([]);
}

export function onHistoryChange(cb: () => void) {
  window.addEventListener(EVT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVT, cb);
    window.removeEventListener("storage", cb);
  };
}

// --- JSON Backup Export & Import ---
export function exportHistoryJson(): string {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    prompts: loadHistory(),
    abTests: loadAbHistory(),
  };
  return JSON.stringify(data, null, 2);
}

export function importHistoryJson(jsonStr: string): { success: boolean; count: number; error?: string } {
  try {
    const data = JSON.parse(jsonStr);
    let promptCount = 0;

    if (Array.isArray(data.prompts)) {
      const current = loadHistory();
      const existingIds = new Set(current.map((x) => x.id));
      const newItems = data.prompts.filter(
        (x: any) => x && typeof x.prompt === "string" && !existingIds.has(x.id),
      );
      save([...newItems, ...current]);
      promptCount = newItems.length;
    }

    if (Array.isArray(data.abTests)) {
      const currentAb = loadAbHistory();
      const existingAbIds = new Set(currentAb.map((x) => x.id));
      const newAb = data.abTests.filter((x: any) => x && !existingAbIds.has(x.id));
      saveAbList([...newAb, ...currentAb]);
    }

    return { success: true, count: promptCount };
  } catch (err) {
    return { success: false, count: 0, error: err instanceof Error ? err.message : "Invalid JSON file" };
  }
}

// --- A/B Test History ---
export function loadAbHistory(): AbHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(AB_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveAbList(list: AbHistoryEntry[]) {
  localStorage.setItem(AB_KEY, JSON.stringify(list.slice(0, 100)));
  window.dispatchEvent(new Event(AB_EVT));
}

export function saveAbTest(e: Omit<AbHistoryEntry, "id" | "ts">): AbHistoryEntry {
  const entry: AbHistoryEntry = { ...e, id: crypto.randomUUID(), ts: Date.now() };
  const list = loadAbHistory();
  saveAbList([entry, ...list]);
  return entry;
}

export function updateAbTestRating(id: string, ratingA?: number, ratingB?: number) {
  const list = loadAbHistory();
  const updated = list.map((item) =>
    item.id === id
      ? {
          ...item,
          ratingA: ratingA ?? item.ratingA,
          ratingB: ratingB ?? item.ratingB,
        }
      : item,
  );
  saveAbList(updated);
}

export function clearAbHistory() {
  saveAbList([]);
}

export function onAbHistoryChange(cb: () => void) {
  window.addEventListener(AB_EVT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(AB_EVT, cb);
    window.removeEventListener("storage", cb);
  };
}

// --- Pending prompt handoff between pages (e.g. Builder/Library -> Checker) ---
const PENDING = "pqc-pending";
export function setPending(prompt: string, category: Category) {
  sessionStorage.setItem(PENDING, JSON.stringify({ prompt, category }));
}
export function takePending(): { prompt: string; category: Category } | null {
  const v = sessionStorage.getItem(PENDING);
  if (!v) return null;
  sessionStorage.removeItem(PENDING);
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
}
