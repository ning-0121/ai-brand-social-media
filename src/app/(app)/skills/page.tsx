"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { KPICard, KPICardGrid } from "@/components/shared/kpi-card";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { SkillCategory, SkillDifficulty, KPIData } from "@/lib/types";
import { useSupabase } from "@/hooks/use-supabase";
import { getSkillPacks, getSkillsKPIs } from "@/lib/supabase-queries";
import { mockSkills } from "@/modules/skills/mock-data";
import { SkillPack } from "@/modules/skills/types";
import * as Icons from "lucide-react";
import { Search, Star, Users, CheckCircle2, ArrowRight } from "lucide-react";

const CATEGORY_LABELS: Record<"all" | SkillCategory, string> = {
  all: "全部",
  operations: "运营",
  content: "内容",
  seo: "SEO",
  ads: "投放",
  service: "客服",
};

const DIFFICULTY_LABELS: Record<SkillDifficulty, string> = {
  beginner: "入门",
  intermediate: "进阶",
  advanced: "高级",
};

const DIFFICULTY_STARS: Record<SkillDifficulty, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
};

const CATEGORY_COLORS: Record<SkillCategory, string> = {
  operations: "bg-blue-500/10 text-blue-600",
  content: "bg-purple-500/10 text-purple-600",
  seo: "bg-green-500/10 text-green-600",
  ads: "bg-orange-500/10 text-orange-600",
  service: "bg-pink-500/10 text-pink-600",
};

const ICON_BG_COLORS: Record<SkillCategory, string> = {
  operations: "bg-blue-500/10",
  content: "bg-purple-500/10",
  seo: "bg-green-500/10",
  ads: "bg-orange-500/10",
  service: "bg-pink-500/10",
};

const ICON_TEXT_COLORS: Record<SkillCategory, string> = {
  operations: "text-blue-500",
  content: "text-purple-500",
  seo: "text-green-500",
  ads: "text-orange-500",
  service: "text-pink-500",
};

function getIcon(name: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const IconComponent = (Icons as any)[name];
  return IconComponent || Icons.BookOpen;
}

export default function SkillsPage() {
  const { data: kpiData } = useSupabase(getSkillsKPIs, { total: 0, topSkill: "-", totalUsage: 0 });
  const skillsKPIs: KPIData[] = [
    { label: "技能包总数", value: kpiData.total, trend: "up", trendPercent: 6, icon: "BookOpen", format: "number" },
    { label: "热门技能", value: kpiData.topSkill, trend: "up", trendPercent: 0, icon: "Star" },
    { label: "总使用次数", value: kpiData.totalUsage, trend: "up", trendPercent: 18, icon: "Users", format: "number" },
  ];

  const { data: skills, loading: loadingSkills } = useSupabase(getSkillPacks, mockSkills);
  const [activeCategory, setActiveCategory] = useState<"all" | SkillCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSkill, setSelectedSkill] = useState<SkillPack | null>(null);

  // Normalize Supabase rows: map `steps` -> `sop_steps`, `prompts` -> `prompt_templates`
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const normalizedSkills: SkillPack[] = (skills as any[]).map((s) => ({
    ...s,
    sop_steps: s.sop_steps ?? s.steps ?? [],
    prompt_templates: s.prompt_templates ?? s.prompts ?? [],
    is_learned: s.is_learned ?? false,
    tags: s.tags ?? [],
  }));

  const filteredSkills = normalizedSkills.filter((skill) => {
    const matchesCategory = activeCategory === "all" || skill.category === activeCategory;
    const matchesSearch =
      searchQuery === "" ||
      skill.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="技能包中心"
        description="探索和学习品牌运营所需的各项技能"
      />

      <KPICardGrid>
        {skillsKPIs.map((kpi) => (
          <KPICard key={kpi.label} {...kpi} />
        ))}
      </KPICardGrid>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(CATEGORY_LABELS) as Array<"all" | SkillCategory>).map((key) => (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              className="cursor-pointer"
            >
              <Badge
                variant={activeCategory === key ? "default" : "outline"}
                className={cn(
                  "cursor-pointer transition-colors",
                  activeCategory === key
                    ? ""
                    : "hover:bg-muted"
                )}
              >
                {CATEGORY_LABELS[key]}
              </Badge>
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="搜索技能包..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Skill cards grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loadingSkills ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <div className="flex items-center justify-between border-t pt-3">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : filteredSkills.map((skill) => {
          const Icon = getIcon(skill.icon);
          return (
            <Card
              key={skill.id}
              className="cursor-pointer transition-all hover:shadow-sm hover:border-primary/20"
              onClick={() => setSelectedSkill(skill)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={cn("rounded-lg p-2.5", ICON_BG_COLORS[skill.category])}>
                    <Icon className={cn("h-5 w-5", ICON_TEXT_COLORS[skill.category])} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium truncate">{skill.title}</h3>
                      {skill.is_learned && (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {skill.description}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className={cn("text-xs", CATEGORY_COLORS[skill.category])}
                    >
                      {CATEGORY_LABELS[skill.category]}
                    </Badge>
                    <span className="flex items-center gap-0.5">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            "h-3 w-3",
                            i < DIFFICULTY_STARS[skill.difficulty]
                              ? "fill-amber-400 text-amber-400"
                              : "text-muted-foreground/30"
                          )}
                        />
                      ))}
                      <span className="ml-1 text-xs text-muted-foreground">
                        {DIFFICULTY_LABELS[skill.difficulty]}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t pt-3">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    <span>{skill.usage_count.toLocaleString()} 次使用</span>
                  </div>
                  <Button variant="ghost" size="xs">
                    查看详情
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!loadingSkills && filteredSkills.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Icons.SearchX className="h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">未找到匹配的技能包</p>
          <p className="mt-1 text-xs text-muted-foreground">请尝试其他关键词或分类</p>
        </div>
      )}

      {/* Skill detail dialog */}
      <Dialog open={!!selectedSkill} onOpenChange={(open) => !open && setSelectedSkill(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            {selectedSkill && (
              <>
                <div className="flex items-center gap-3">
                  <div className={cn("rounded-lg p-2", ICON_BG_COLORS[selectedSkill.category])}>
                    {(() => {
                      const Icon = getIcon(selectedSkill.icon);
                      return <Icon className={cn("h-5 w-5", ICON_TEXT_COLORS[selectedSkill.category])} />;
                    })()}
                  </div>
                  <div>
                    <DialogTitle>{selectedSkill.title}</DialogTitle>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={cn("text-xs", CATEGORY_COLORS[selectedSkill.category])}
                      >
                        {CATEGORY_LABELS[selectedSkill.category]}
                      </Badge>
                      <span className="flex items-center gap-0.5">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              "h-3 w-3",
                              i < DIFFICULTY_STARS[selectedSkill.difficulty]
                                ? "fill-amber-400 text-amber-400"
                                : "text-muted-foreground/30"
                            )}
                          />
                        ))}
                        <span className="ml-1 text-xs text-muted-foreground">
                          {DIFFICULTY_LABELS[selectedSkill.difficulty]}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
                <DialogDescription className="mt-2">
                  {selectedSkill.description}
                </DialogDescription>
              </>
            )}
          </DialogHeader>

          {selectedSkill?.sop_steps && selectedSkill.sop_steps.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">SOP 步骤</h4>
              <div className="space-y-2">
                {selectedSkill.sop_steps.map((step) => (
                  <div
                    key={step.id}
                    className="flex gap-3 rounded-lg border p-3"
                  >
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                      {step.order}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{step.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {step.description}
                      </p>
                      {step.tips && (
                        <p className="mt-1 text-xs text-blue-600">
                          提示：{step.tips}
                        </p>
                      )}
                      {step.estimated_minutes && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          预计 {step.estimated_minutes} 分钟
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedSkill && (
            <div className="flex flex-wrap gap-1.5">
              {selectedSkill.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
