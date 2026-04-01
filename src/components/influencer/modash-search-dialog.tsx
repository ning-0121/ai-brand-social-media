"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Search, Globe, Plus, AlertCircle } from "lucide-react";
import { createInfluencer } from "@/lib/supabase-mutations";

interface ModashSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

interface SearchResult {
  profile: {
    username: string;
    fullname: string;
    picture?: string;
    followers?: number;
    engagements?: number;
    engagement_rate?: number;
  };
  match_score?: number;
}

function formatFollowers(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return Math.round(num / 1000) + "k";
  return num.toString();
}

export function ModashSearchDialog({ open, onOpenChange, onImported }: ModashSearchDialogProps) {
  const [platform, setPlatform] = useState("instagram");
  const [keywords, setKeywords] = useState("");
  const [minFollowers, setMinFollowers] = useState("10000");
  const [maxFollowers, setMaxFollowers] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState("");
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const handleSearch = async () => {
    setSearching(true);
    setError("");
    setResults([]);
    try {
      const res = await fetch("/api/modash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: `search_${platform}`,
          min_followers: parseInt(minFollowers) || 10000,
          max_followers: maxFollowers ? parseInt(maxFollowers) : undefined,
          keywords: keywords || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "搜索失败");
      setResults(data.lookalikes || data.results || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "搜索失败");
    }
    setSearching(false);
  };

  const handleAddInfluencer = async (result: SearchResult) => {
    const p = result.profile;
    try {
      await createInfluencer({
        name: p.fullname || p.username,
        platform: platform === "instagram" ? "instagram" : "tiktok",
        handle: `@${p.username}`,
        followers: p.followers || 0,
        engagement_rate: p.engagement_rate ? Math.round(p.engagement_rate * 100) / 100 : 0,
      });
      setAddedIds((prev) => new Set(Array.from(prev).concat(p.username)));
      onImported();
    } catch (err) {
      console.error("添加失败:", err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-blue-500" />
            Modash 达人搜索
          </DialogTitle>
          <DialogDescription>
            搜索全球 3.5 亿+ 达人数据库，找到匹配你品牌的 KOL
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search filters */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Select value={platform} onValueChange={(v) => v && setPlatform(v)}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="关键词"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              className="h-9 text-xs"
            />
            <Input
              type="number"
              placeholder="最少粉丝"
              value={minFollowers}
              onChange={(e) => setMinFollowers(e.target.value)}
              className="h-9 text-xs"
            />
            <Input
              type="number"
              placeholder="最多粉丝"
              value={maxFollowers}
              onChange={(e) => setMaxFollowers(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          <Button size="sm" onClick={handleSearch} disabled={searching} className="w-full sm:w-auto">
            {searching ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Search className="mr-1.5 h-3.5 w-3.5" />
            )}
            {searching ? "搜索中..." : "搜索达人"}
          </Button>

          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p>{error}</p>
                {error.includes("MODASH_API_KEY") && (
                  <p className="text-xs mt-1 opacity-70">
                    需要在 .env.local 中添加 MODASH_API_KEY，可在 modash.io 申请
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">
                找到 {results.length} 个达人
              </div>
              {results.map((r) => {
                const p = r.profile;
                const added = addedIds.has(p.username);
                return (
                  <Card key={p.username}>
                    <CardContent className="p-3 flex items-center gap-3">
                      {p.picture ? (
                        <img
                          src={p.picture}
                          alt={p.fullname}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                          {(p.fullname || p.username).charAt(0)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">
                            {p.fullname || p.username}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            @{p.username}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                          {p.followers && (
                            <span>{formatFollowers(p.followers)} 粉丝</span>
                          )}
                          {p.engagement_rate && (
                            <span>互动率 {(p.engagement_rate * 100).toFixed(1)}%</span>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={added ? "outline" : "default"}
                        className="h-8 text-xs shrink-0"
                        disabled={added}
                        onClick={() => handleAddInfluencer(r)}
                      >
                        {added ? (
                          "已添加"
                        ) : (
                          <>
                            <Plus className="mr-1 h-3 w-3" />
                            添加
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
