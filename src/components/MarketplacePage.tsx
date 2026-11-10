import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  ShoppingBag,
  Search,
  Star,
  Download,
  Copy,
  Check,
  Plus,
  Flame,
  Filter,
  Flag,
  Share2,
  Bookmark,
  Sparkles,
  MessageSquare,
  ThumbsUp,
  Tag,
  ArrowRight,
} from "lucide-react";
import {
  getMarketplacePrompts,
  publishMarketplacePrompt,
  submitPromptReview,
  incrementSaveCount,
  reportMarketplacePrompt,
  type MarketplacePrompt,
} from "@/lib/marketplace.functions";
import { useLang } from "@/lib/i18n";
import { addHistory } from "@/lib/history";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PromptIQLayout } from "./PromptIQLayout";

const MARKETPLACE_CATEGORIES = [
  "All",
  "Coding",
  "Education",
  "Business",
  "Marketing",
  "Research",
  "Productivity",
];

export function MarketplacePage() {
  const { t } = useLang();
  const getPromptsFn = useServerFn(getMarketplacePrompts);
  const publishPromptFn = useServerFn(publishMarketplacePrompt);
  const submitReviewFn = useServerFn(submitPromptReview);
  const saveCountFn = useServerFn(incrementSaveCount);
  const reportPromptFn = useServerFn(reportMarketplacePrompt);

  const [prompts, setPrompts] = useState<MarketplacePrompt[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"trending" | "top_rated" | "newest">("trending");

  // Publish Modal state
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [pubTitle, setPubTitle] = useState("");
  const [pubDescription, setPubDescription] = useState("");
  const [pubCategory, setPubCategory] = useState("Coding");
  const [pubPrompt, setPubPrompt] = useState("");
  const [pubTags, setPubTags] = useState("typescript, fullstack, clean-code");

  // Review modal state
  const [reviewingPromptId, setReviewingPromptId] = useState<string | null>(null);
  const [ratingStars, setRatingStars] = useState(5);
  const [reviewComment, setReviewComment] = useState("");

  // Copy / Save feedback states
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  useEffect(() => {
    loadPrompts();
  }, [selectedCategory, searchQuery, sortBy]);

  const loadPrompts = async () => {
    try {
      const res = await getPromptsFn({
        data: {
          category: selectedCategory,
          search: searchQuery.trim(),
          sort: sortBy,
        },
      });
      if (Array.isArray(res)) {
        setPrompts(res);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePublish = async () => {
    if (!pubTitle.trim() || !pubPrompt.trim()) return;
    try {
      const res = await publishPromptFn({
        data: {
          title: pubTitle.trim(),
          description: pubDescription.trim(),
          category: pubCategory,
          prompt: pubPrompt.trim(),
          tags: pubTags
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          authorName: "Prompt Specialist",
          authorId: "usr_alice",
        },
      });
      if (res && res.ok) {
        setShowPublishModal(false);
        setPubTitle("");
        setPubDescription("");
        setPubPrompt("");
        setStatusNotice("Prompt published to marketplace!");
        loadPrompts();
        setTimeout(() => setStatusNotice(null), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopyPrompt = (p: MarketplacePrompt) => {
    navigator.clipboard.writeText(p.prompt);
    setCopiedId(p.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveToPersonalLibrary = async (p: MarketplacePrompt) => {
    addHistory({
      prompt: p.prompt,
      title: p.title,
      category: p.category as any,
      score: p.score || 90,
      band: "Excellent",
      criteria: {},
      source: "library",
      favorite: true,
    });
    setSavedId(p.id);
    saveCountFn({ data: { promptId: p.id } });
    setTimeout(() => setSavedId(null), 2500);
  };

  const handleSubmitReview = async () => {
    if (!reviewingPromptId) return;
    try {
      await submitReviewFn({
        data: {
          promptId: reviewingPromptId,
          userId: "usr_alice",
          userName: "Alice Chen",
          rating: ratingStars,
          review: reviewComment.trim() || "High quality prompt.",
        },
      });
      setReviewingPromptId(null);
      setReviewComment("");
      loadPrompts();
      setStatusNotice("Review submitted successfully!");
      setTimeout(() => setStatusNotice(null), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleReport = async (promptId: string) => {
    const reason = window.prompt("Reason for reporting this prompt:");
    if (!reason?.trim()) return;
    try {
      await reportPromptFn({
        data: {
          promptId,
          reporterId: "usr_alice",
          reason: reason.trim(),
        },
      });
      setStatusNotice("Report received for moderation review.");
      setTimeout(() => setStatusNotice(null), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <PromptIQLayout
      title={t.mp_title}
      subtitle={t.mp_sub}
    >
      <div className="space-y-6">
        {/* Header Search & Publish Action */}
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search prompts by title, keywords, or tags..."
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="rounded-lg border border-input bg-background px-3 py-2 text-xs font-semibold text-foreground focus:ring-1 focus:ring-primary"
            >
              <option value="trending">🔥 Trending</option>
              <option value="top_rated">⭐ Highest Rated</option>
              <option value="newest">🕒 Newest Releases</option>
            </select>

            <Button
              size="sm"
              onClick={() => setShowPublishModal(true)}
              className="gap-1.5 text-xs font-semibold shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              Publish Prompt
            </Button>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {MARKETPLACE_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition shrink-0 ${
                selectedCategory === cat
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Notification Alert */}
        {statusNotice && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-700">
            {statusNotice}
          </div>
        )}

        {/* Prompts Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {prompts.map((p: MarketplacePrompt) => {
            const isCopied = copiedId === p.id;
            const isSaved = savedId === p.id;

            return (
              <div
                key={p.id}
                className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md"
              >
                <div>
                  {/* Category and Rating Header */}
                  <div className="flex items-start justify-between">
                    <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wider">
                      {p.category}
                    </Badge>
                    <div className="flex items-center gap-1 text-amber-500 text-xs font-bold">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      <span>{p.ratingAvg.toFixed(1)}</span>
                      <span className="text-[10px] text-muted-foreground font-normal">({p.ratingCount})</span>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h4 className="mt-2.5 font-display text-sm font-bold text-foreground leading-snug">{p.title}</h4>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.description}</p>

                  {/* Prompt Preview Snippet */}
                  <div className="mt-3 rounded-xl border border-border bg-muted/20 p-3 font-mono text-[11px] text-foreground line-clamp-4 leading-relaxed">
                    {p.prompt}
                  </div>

                  {/* Tags */}
                  <div className="mt-3 flex flex-wrap gap-1">
                    {p.tags.map((tag, idx) => (
                      <span key={idx} className="rounded bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-4 pt-3 border-t border-border space-y-3">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>By {p.authorName}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleReport(p.id)}
                        className="text-muted-foreground hover:text-destructive text-[10px]"
                        title="Report Prompt"
                      >
                        <Flag className="h-3 w-3 inline" />
                      </button>
                      <button
                        onClick={() => setReviewingPromptId(p.id)}
                        className="text-primary hover:underline text-[10px] font-semibold"
                      >
                        Rate & Review
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyPrompt(p)}
                      className="gap-1 text-xs"
                    >
                      {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      {isCopied ? "Copied" : "Copy"}
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => handleSaveToPersonalLibrary(p)}
                      className="gap-1 text-xs font-semibold"
                    >
                      {isSaved ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Bookmark className="h-3.5 w-3.5" />}
                      {isSaved ? "Saved!" : "Save to Lib"}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Publish Modal */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-display text-base font-bold text-foreground">Publish Prompt to Marketplace</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-foreground">Title</label>
                <Input
                  value={pubTitle}
                  onChange={(e) => setPubTitle(e.target.value)}
                  placeholder="e.g. Senior Clean Code Reviewer"
                  className="mt-1 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground">Category</label>
                  <select
                    value={pubCategory}
                    onChange={(e) => setPubCategory(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-primary"
                  >
                    {MARKETPLACE_CATEGORIES.filter((c) => c !== "All").map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground">Tags (comma-separated)</label>
                  <Input
                    value={pubTags}
                    onChange={(e) => setPubTags(e.target.value)}
                    placeholder="react, clean-code, refactor"
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Description</label>
                <Input
                  value={pubDescription}
                  onChange={(e) => setPubDescription(e.target.value)}
                  placeholder="Summary of what this prompt achieves..."
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Prompt Instructions</label>
                <Textarea
                  rows={5}
                  value={pubPrompt}
                  onChange={(e) => setPubPrompt(e.target.value)}
                  placeholder="Write prompt with system role, constraints, and output format..."
                  className="mt-1 font-mono text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={() => setShowPublishModal(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handlePublish} disabled={!pubTitle.trim() || !pubPrompt.trim()}>
                  Publish to Marketplace
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewingPromptId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <h3 className="font-display text-base font-bold text-foreground">Rate & Review Prompt</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-foreground">Rating (1 to 5 Stars)</label>
                <div className="mt-1 flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRatingStars(star)}
                      className="text-amber-500 hover:scale-110 transition"
                    >
                      <Star
                        className={`h-6 w-6 ${star <= ratingStars ? "fill-current" : "stroke-current text-muted"}`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Feedback Comment (Optional)</label>
                <Textarea
                  rows={3}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share how this prompt performed for your use case..."
                  className="mt-1 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={() => setReviewingPromptId(null)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSubmitReview}>
                  Submit Review
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PromptIQLayout>
  );
}
