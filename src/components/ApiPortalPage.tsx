import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Code2,
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  Play,
  Terminal,
  Activity,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import {
  listApiKeys,
  generateApiKey,
  revokeApiKey,
  getApiAnalytics,
  executeSimulatedApiCall,
  type ApiKeyInfo,
  type ApiLogEntry,
  type ApiStats,
} from "@/lib/developer-api.functions";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PromptIQLayout } from "./PromptIQLayout";

export function ApiPortalPage() {
  const { t } = useLang();
  const listKeysFn = useServerFn(listApiKeys);
  const generateKeyFn = useServerFn(generateApiKey);
  const revokeKeyFn = useServerFn(revokeApiKey);
  const getAnalyticsFn = useServerFn(getApiAnalytics);
  const executeApiCallFn = useServerFn(executeSimulatedApiCall);

  const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
  const [analytics, setAnalytics] = useState<{
    stats: ApiStats;
    recentLogs: ApiLogEntry[];
  } | null>(null);

  // New key dialog & copy-once state
  const [newKeyName, setNewKeyName] = useState("");
  const [createdRawKey, setCreatedRawKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Interactive API tester
  const [selectedEndpoint, setSelectedEndpoint] = useState<"/api/v1/analyze" | "/api/v1/security" | "/api/v1/optimize">(
    "/api/v1/analyze",
  );
  const [testPrompt, setTestPrompt] = useState(
    "Act as a software architect and design a scalable microservices architecture for real-time video streaming.",
  );
  const [isCallingApi, setIsCallingApi] = useState(false);
  const [apiResponse, setApiResponse] = useState<any>(null);

  // Code snippets tab
  const [activeCodeLang, setActiveCodeLang] = useState<"curl" | "javascript" | "python">("curl");
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    loadKeysAndAnalytics();
  }, []);

  const loadKeysAndAnalytics = async () => {
    try {
      const [kRes, aRes] = await Promise.all([
        listKeysFn({ data: { userId: "usr_admin_001" } }),
        getAnalyticsFn(),
      ]);
      if (Array.isArray(kRes)) setKeys(kRes);
      if (aRes && aRes.stats) setAnalytics(aRes);
    } catch (e) {
      console.error(e);
    }
  };

  const handleGenerateKey = async () => {
    if (!newKeyName.trim()) return;
    try {
      const res = await generateKeyFn({
        data: { name: newKeyName.trim(), userId: "usr_admin_001" },
      });
      if (res.ok && res.rawKey) {
        setCreatedRawKey(res.rawKey);
        setNewKeyName("");
        loadKeysAndAnalytics();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRevokeKey = async (id: string) => {
    try {
      await revokeKeyFn({ data: { keyId: id } });
      loadKeysAndAnalytics();
    } catch (e) {
      console.error(e);
    }
  };

  const handleTestApi = async () => {
    setIsCallingApi(true);
    setApiResponse(null);

    const activeKey = keys.find((k) => k.isActive);
    const rawKeyToUse = createdRawKey || (activeKey ? `piq_live_${activeKey.prefix}` : "piq_live_demo123");

    try {
      const res = await executeApiCallFn({
        data: {
          endpoint: selectedEndpoint,
          rawApiKey: rawKeyToUse,
          payload: { prompt: testPrompt, category: "Coding" },
        },
      });
      setApiResponse(res);
      loadKeysAndAnalytics();
    } catch (e: any) {
      setApiResponse({ status: 500, data: { error: e.message } });
    } finally {
      setIsCallingApi(false);
    }
  };

  const copySnippet = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const getCurlSnippet = () => `curl -X POST https://promptiq.ai${selectedEndpoint} \\
  -H "Authorization: Bearer ${createdRawKey || "piq_live_your_api_key_here"}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "prompt": "${testPrompt.replace(/"/g, '\\"')}",
    "category": "Coding"
  }'`;

  const getJsSnippet = () => `const response = await fetch("https://promptiq.ai${selectedEndpoint}", {
  method: "POST",
  headers: {
    "Authorization": "Bearer ${createdRawKey || "piq_live_your_api_key_here"}",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    prompt: "${testPrompt.replace(/"/g, '\\"')}",
    category: "Coding"
  })
});
const result = await response.json();
console.log(result);`;

  const getPySnippet = () => `import requests

url = "https://promptiq.ai${selectedEndpoint}"
headers = {
    "Authorization": "Bearer ${createdRawKey || "piq_live_your_api_key_here"}",
    "Content-Type": "application/json"
}
payload = {
    "prompt": """${testPrompt}""",
    "category": "Coding"
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`;

  return (
    <PromptIQLayout
      title={t.api_title}
      subtitle={t.api_sub}
    >
      <div className="space-y-6">
        {/* Top Telemetry Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total API Requests
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-foreground">{analytics?.stats.totalRequests ?? 0}</span>
              <span className="text-xs text-muted-foreground">calls logged</span>
            </div>
            <p className="mt-1 text-xs text-emerald-600 font-medium">99.9% Platform SLA</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Success Rate
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-emerald-500">{analytics?.stats.successRate ?? 100}%</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">HTTP 200 responses</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Average API Latency
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-primary">{analytics?.stats.avgLatencyMs ?? 14} ms</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Real-time edge compute</p>
          </div>
        </div>

        {/* API Key Management */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-display text-base font-bold text-foreground">API Credentials</h3>
              <p className="text-xs text-muted-foreground">
                Keys are hashed with SHA-256 and never stored in plain text. Keep your keys secret.
              </p>
            </div>

            <div className="flex gap-2">
              <Input
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Key label (e.g. CI/CD Pipeline)..."
                className="w-56 text-xs"
              />
              <Button size="sm" onClick={handleGenerateKey} disabled={!newKeyName.trim()} className="gap-1.5 text-xs font-semibold">
                <Plus className="h-3.5 w-3.5" />
                Generate Key
              </Button>
            </div>
          </div>

          {/* Secure Raw Key Notification Modal/Banner */}
          {createdRawKey && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-700">
                  <ShieldCheck className="h-5 w-5" />
                  <span className="text-xs font-bold">New Secret Key Generated</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(createdRawKey);
                    setCopiedKey(true);
                    setTimeout(() => setCopiedKey(false), 2000);
                  }}
                  className="gap-1.5 text-xs"
                >
                  {copiedKey ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedKey ? "Copied" : "Copy Secret Key"}
                </Button>
              </div>
              <p className="font-mono text-xs font-bold text-foreground bg-background p-2 rounded-lg border border-border select-all">
                {createdRawKey}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Please copy your secret key now. For security purposes, you will not be able to view it again.
              </p>
            </div>
          )}

          {/* Keys Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="pb-3 font-semibold">Label</th>
                  <th className="pb-3 font-semibold">Prefix</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Created</th>
                  <th className="pb-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {keys.map((k) => (
                  <tr key={k.id} className="hover:bg-muted/30">
                    <td className="py-3 font-bold text-foreground">{k.name}</td>
                    <td className="py-3 font-mono text-[11px] text-muted-foreground">{k.prefix}</td>
                    <td className="py-3">
                      <Badge
                        variant="outline"
                        className={
                          k.isActive
                            ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/10"
                            : "border-muted text-muted-foreground"
                        }
                      >
                        {k.isActive ? "active" : "revoked"}
                      </Badge>
                    </td>
                    <td className="py-3 text-muted-foreground">{new Date(k.createdAt).toLocaleDateString()}</td>
                    <td className="py-3">
                      {k.isActive && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevokeKey(k.id)}
                          className="h-7 text-xs text-destructive hover:bg-destructive/10"
                        >
                          Revoke Key
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Interactive API Explorer & Code Snippets */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Interactive Tester */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-bold text-foreground">Interactive API Tester</h3>
              <select
                value={selectedEndpoint}
                onChange={(e) => setSelectedEndpoint(e.target.value as any)}
                className="rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-mono font-bold text-foreground focus:ring-1 focus:ring-primary"
              >
                <option value="/api/v1/analyze">POST /api/v1/analyze</option>
                <option value="/api/v1/security">POST /api/v1/security</option>
                <option value="/api/v1/optimize">POST /api/v1/optimize</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Request Payload (JSON)</label>
              <Textarea
                rows={4}
                value={testPrompt}
                onChange={(e) => setTestPrompt(e.target.value)}
                placeholder="Target prompt to analyze or optimize..."
                className="font-mono text-xs leading-relaxed"
              />
            </div>

            <Button
              onClick={handleTestApi}
              disabled={isCallingApi || !testPrompt.trim()}
              className="w-full gap-2 text-xs font-semibold"
            >
              {isCallingApi ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Sending API Request...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-current" />
                  Send Live Test Request
                </>
              )}
            </Button>

            {/* Response Output */}
            {apiResponse && (
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="flex items-center gap-1.5 text-emerald-600 font-bold">
                    <CheckCircle2 className="h-3.5 w-3.5" /> HTTP {apiResponse.status} OK
                  </span>
                  <span className="text-muted-foreground">{apiResponse.latencyMs} ms</span>
                </div>
                <div className="max-h-60 overflow-y-auto rounded-xl border border-border bg-muted/20 p-3 font-mono text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                  {JSON.stringify(apiResponse.data, null, 2)}
                </div>
              </div>
            )}
          </div>

          {/* Code Snippets */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-bold text-foreground">Code Snippets</h3>
              <div className="flex gap-1 rounded-lg border border-border p-1 text-xs">
                {(["curl", "javascript", "python"] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setActiveCodeLang(lang)}
                    className={`rounded px-2.5 py-1 text-[11px] font-bold uppercase transition ${
                      activeCodeLang === lang ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <pre className="max-h-96 overflow-x-auto rounded-xl border border-border bg-muted/30 p-4 font-mono text-xs text-foreground leading-relaxed">
                {activeCodeLang === "curl" && getCurlSnippet()}
                {activeCodeLang === "javascript" && getJsSnippet()}
                {activeCodeLang === "python" && getPySnippet()}
              </pre>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  copySnippet(
                    activeCodeLang === "curl"
                      ? getCurlSnippet()
                      : activeCodeLang === "javascript"
                        ? getJsSnippet()
                        : getPySnippet(),
                  )
                }
                className="absolute right-3 top-3 h-7 gap-1 text-xs"
              >
                {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedCode ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
        </div>

        {/* Real-Time API Logs Table */}
        {analytics?.recentLogs && analytics.recentLogs.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            <h3 className="font-display text-sm font-bold text-foreground">Recent API Request Audit Trail</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="pb-3 font-semibold">Timestamp</th>
                    <th className="pb-3 font-semibold">Endpoint</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold">Latency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {analytics.recentLogs.slice(0, 8).map((log) => (
                    <tr key={log.id} className="hover:bg-muted/30">
                      <td className="py-2.5 text-muted-foreground">{new Date(log.createdAt).toLocaleTimeString()}</td>
                      <td className="py-2.5 font-bold text-foreground">{log.endpoint}</td>
                      <td className="py-2.5">
                        <span
                          className={log.status < 400 ? "text-emerald-600 font-bold" : "text-destructive font-bold"}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-muted-foreground">{log.responseTimeMs} ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </PromptIQLayout>
  );
}
