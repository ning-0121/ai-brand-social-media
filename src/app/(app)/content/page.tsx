"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SkillResultViewer } from "@/components/content/skill-result-viewer";
import { SkillCard } from "@/components/content/skill-card";
import {
  Sparkles,
  Loader2,
  Search,
  RefreshCw,
  Radar,
  Inbox,
  Package,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  X,
  DollarSign,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Skill {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  color: string;
  inputs: SkillInputDef[];
  estimated_cost: { text: number; image: number };
  estimated_time_seconds: number;
  requires_image?: boolean;
}

interface SkillInputDef {
  key: string;
  label: string;
  type: string;
  required?: boolean;
  default?: string;
  options?: { value: string; label: string }[];
  placeholder?: string;
}

interface Product {
  id: string;
  name: string;
  body_html?: string;
  meta_title?: string;
  meta_description?: string;
  tags?: string;
  price?: number;
  category?: string;
  image_url?: string;
  shopify_product_id?: number;
}

interface RadarSignal {
  id: string;
  type: string;
  title: string;
  source: string;
  signal: Record<string, unknown>;
  suggested_skill_id: string;
  priority: string;
  status: string;
}

interface ContentTask {
  id: string;
  skill_id: string;
  product_name?: string;
  source_module: string;
  status: string;
  result?: Record<string, unknown>;
  created_at: string;
}

const PLATFORM_OPTIONS = [
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "xiaohongshu", label: "小红书" },
  { value: "shopify", label: "Shopify" },
  { value: "amazon", label: "Amazon" },
  { value: "independent", label: "独立站" },
];

export default function ContentPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [signals, setSignals] = useState<RadarSignal[]>([]);
  const [pendingTasks, setPendingTasks] = useState<ContentTask[]>([]);

  const [loadingSkills, setLoadingSkills] = useState(true);
  const [scanningRadar, setScanningRadar] = useState(false);

  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [skillInputs, setSkillInputs] = useState<Record<string, unknown>>({});
  const [executing, setExecuting] = useState(false);
  const [skillResult, setSkillResult] = useState<{
    task_id: string;
    skill_id: string;
    skill_name: string;
    output: Record<string, unknown>;
  } | null>(null);

  // 加载初始数据
  useEffect(() => {
    fetchSkills();
    fetchProducts();
    fetchRadar();
    fetchTasks();
  }, []);

  const fetchSkills = async () => {
    try {
      const res = await fetch("/api/content-skills");
      const data = await res.json();
      setSkills(data.skills || []);
    } catch {
      toast.error("加载 Skills 失败");
    }
    setLoadingSkills(false);
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/content-plan?type=products");
      const data = await res.json();
      setProducts(data.products || []);
    } catch {
      toast.error("加载商品失败");
    }
  };

  const fetchRadar = async () => {
    try {
      const res = await fetch("/api/radar");
      const data = await res.json();
      setSignals(data.signals || []);
    } catch {
      toast.error("加载雷达失败");
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await fetch("/api/content-plan?type=tasks");
      const data = await res.json();
      setPendingTasks(data.pending || []);
    } catch {
      toast.error("加载任务失败");
    }
  };

  const handleScanRadar = async () => {
    setScanningRadar(true);
    try {
      const res = await fetch("/api/radar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "scan" }),
      });
      const data = await res.json();
      setSignals(data.signals || []);
    } catch {
      toast.error("扫描失败");
    }
    setScanningRadar(false);
  };

  const handleSelectSkill = (skill: Skill) => {
    setSelectedSkill(skill);
    setSkillResult(null);
    // 初始化默认值
    const defaults: Record<string, unknown> = {};
    for (const input of skill.inputs) {
      if (input.default) defaults[input.key] = input.default;
    }
    if (selectedProduct) defaults.product = selectedProduct;
    setSkillInputs(defaults);
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    if (selectedSkill) {
      setSkillInputs((prev) => ({ ...prev, product }));
    }
  };

  const handleExecute = async () => {
    if (!selectedSkill) return;

    // 验证必填
    for (const input of selectedSkill.inputs) {
      if (input.required && !skillInputs[input.key]) {
        alert(`请填写: ${input.label}`);
        return;
      }
    }

    setExecuting(true);
    setSkillResult(null);
    try {
      const res = await fetch("/api/content-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "execute_skill",
          skill_id: selectedSkill.id,
          inputs: skillInputs,
          product_id: selectedProduct?.id,
          product_name: selectedProduct?.name,
        }),
      });
      const data = await res.json();
      if (data.result) {
        setSkillResult({
          task_id: data.task_id,
          skill_id: selectedSkill.id,
          skill_name: selectedSkill.name,
          output: data.result.output || data.result,
        });
        fetchTasks();
      } else if (data.error) {
        alert(`执行失败: ${data.error}`);
      }
    } catch {
      toast.error("执行失败");
    }
    setExecuting(false);
  };

  const filteredProducts = products.filter((p) =>
    productSearch ? p.name.toLowerCase().includes(productSearch.toLowerCase()) : true
  );

  const imageSkills = skills.filter((s) => s.category === "image");
  const pageSkills = skills.filter((s) => s.category === "page" || s.category === "website");
  const copySkills = skills.filter((s) => s.category === "social" || s.category === "copy");
  const videoSkills = skills.filter((s) => s.category === "video");
  const oemSkills = skills.filter((s) => s.category === "oem");

  return (
    <div className="space-y-6">
      <PageHeader
        title="内容工厂"
        description="AI Skills 驱动的全栈内容生产中心 — 12 个专业技能 + 雷达情报 + 跨模块联动"
      />

      {/* Top: Product Selector Bar */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <Package className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索你的商品..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
            {selectedProduct && (
              <Badge variant="secondary" className="gap-1">
                已选: {selectedProduct.name}
                <button onClick={() => setSelectedProduct(null)}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>

          {productSearch && (
            <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
              {filteredProducts.slice(0, 10).map((p) => (
                <button
                  key={p.id}
                  className={cn(
                    "w-full text-left rounded-md px-2 py-1.5 text-xs hover:bg-muted",
                    selectedProduct?.id === p.id && "bg-primary/10"
                  )}
                  onClick={() => {
                    handleSelectProduct(p);
                    setProductSearch("");
                  }}
                >
                  <span className="font-medium">{p.name}</span>
                  {p.category && <span className="text-muted-foreground ml-2">{p.category}</span>}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Layout: flex 3 columns */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
        {/* Left: Skills Library + Radar + Inbox */}
        <div className="w-full space-y-4 xl:w-[360px] xl:shrink-0">
          {/* Skills Library */}
          <Card className="overflow-visible">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <CardTitle className="text-sm">Skills 库</CardTitle>
                <span className="text-[10px] text-muted-foreground ml-auto">{skills.length} 个技能</span>
              </div>
            </CardHeader>
            <CardContent className="p-3">
              <Tabs defaultValue="image" className="flex flex-col">
                <TabsList className="w-full flex h-9 overflow-x-auto shrink-0">
                  <TabsTrigger value="image" className="text-[11px] flex-1 min-w-0 gap-1">
                    📸 图片 ({imageSkills.length})
                  </TabsTrigger>
                  <TabsTrigger value="page" className="text-[11px] flex-1 min-w-0 gap-1">
                    📄 页面 ({pageSkills.length})
                  </TabsTrigger>
                  <TabsTrigger value="copy" className="text-[11px] flex-1 min-w-0 gap-1">
                    ✍️ 文案 ({copySkills.length})
                  </TabsTrigger>
                  <TabsTrigger value="video" className="text-[11px] flex-1 min-w-0 gap-1">
                    🎬 视频 ({videoSkills.length})
                  </TabsTrigger>
                  <TabsTrigger value="oem" className="text-[11px] flex-1 min-w-0 gap-1">
                    🏢 OEM ({oemSkills.length})
                  </TabsTrigger>
                </TabsList>
                {[
                  { key: "image", items: imageSkills },
                  { key: "page", items: pageSkills },
                  { key: "copy", items: copySkills },
                  { key: "video", items: videoSkills },
                  { key: "oem", items: oemSkills },
                ].map((tab) => (
                  <TabsContent key={tab.key} value={tab.key} className="mt-3 max-h-[360px] overflow-y-auto">
                    {loadingSkills ? (
                      <div className="grid grid-cols-2 gap-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <Skeleton key={i} className="h-20" />
                        ))}
                      </div>
                    ) : tab.items.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2">
                        {tab.items.map((s) => (
                          <SkillCard
                            key={s.id}
                            name={s.name}
                            icon={s.icon}
                            color={s.color}
                            cost={s.estimated_cost.text + s.estimated_cost.image}
                            selected={selectedSkill?.id === s.id}
                            onClick={() => handleSelectSkill(s)}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-xs text-muted-foreground py-6">
                        此类别暂无 Skills
                      </p>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>

          {/* Radar */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Radar className="h-4 w-4 text-cyan-500" />
                  <CardTitle className="text-sm">市场雷达</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={handleScanRadar}
                  disabled={scanningRadar}
                >
                  {scanningRadar ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-2">
              {signals.length > 0 ? (
                signals.slice(0, 5).map((s) => (
                  <RadarSignalCard key={s.id} signal={s} skills={skills} onUseSkill={handleSelectSkill} />
                ))
              ) : (
                <div className="text-center py-4 text-xs text-muted-foreground">
                  暂无雷达信号<br />
                  <button onClick={handleScanRadar} className="text-primary underline mt-1">
                    立即扫描
                  </button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Inbox */}
          {pendingTasks.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Inbox className="h-4 w-4 text-blue-500" />
                  <CardTitle className="text-sm">任务收件箱 ({pendingTasks.length})</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0 space-y-2">
                {pendingTasks.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    className="rounded-md border px-2.5 py-2 text-xs hover:bg-muted/50"
                  >
                    <p className="font-medium truncate">{task.product_name || task.skill_id}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      来源: {task.source_module} · {task.status}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Middle: Skill Input Panel */}
        <div className="flex-1 min-w-0">
          {selectedSkill ? (
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <SkillIconBadge icon={selectedSkill.icon} color={selectedSkill.color} />
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base">{selectedSkill.name}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">{selectedSkill.description}</p>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-2">
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          ~${(selectedSkill.estimated_cost.text + selectedSkill.estimated_cost.image).toFixed(2)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          ~{selectedSkill.estimated_time_seconds}s
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedSkill(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedSkill.inputs.map((input) => (
                  <SkillInputField
                    key={input.key}
                    input={input}
                    value={skillInputs[input.key]}
                    onChange={(v) => setSkillInputs((prev) => ({ ...prev, [input.key]: v }))}
                    products={products}
                    selectedProduct={selectedProduct}
                  />
                ))}
                <Button className="w-full h-10" onClick={handleExecute} disabled={executing}>
                  {executing ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />AI 生成中...</>
                  ) : (
                    <><Sparkles className="mr-2 h-4 w-4" />执行 Skill 生成内容</>
                  )}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-24 text-center text-sm text-muted-foreground">
                <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground/20" />
                <p className="text-base font-medium text-foreground/60">从左侧选择一个 Skill</p>
                <p className="text-xs mt-2">12 个专业内容生产技能 · 网站 + 社媒全栈覆盖</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Result Viewer */}
        <div className="w-full xl:w-[420px] xl:shrink-0">
          {skillResult ? (
            <SkillResultViewer
              skillId={skillResult.skill_id}
              skillName={skillResult.skill_name}
              taskId={skillResult.task_id}
              result={skillResult.output}
              onClose={() => setSkillResult(null)}
            />
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-24 text-center text-sm text-muted-foreground">
                <ChevronRight className="h-12 w-12 mx-auto mb-4 text-muted-foreground/20" />
                <p className="text-base font-medium text-foreground/60">执行 Skill 后</p>
                <p className="text-xs mt-2">AI 生成结果将显示在此</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ========== Sub Components ==========

function SkillIconBadge({ icon, color }: { icon: string; color: string }) {
  // Lazy import all icons via lucide-react direct mapping (kept simple)
  const iconClass: Record<string, string> = {
    blue: "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400",
    green: "bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400",
    purple: "bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400",
    red: "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400",
    cyan: "bg-cyan-100 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-400",
    amber: "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
    pink: "bg-pink-100 text-pink-600 dark:bg-pink-500/20 dark:text-pink-400",
    indigo: "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400",
    teal: "bg-teal-100 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400",
    violet: "bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400",
    orange: "bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400",
    rose: "bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400",
  };
  void icon; // icon name is informational, we use Sparkles for badge consistency
  return (
    <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg shrink-0", iconClass[color] || iconClass.blue)}>
      <Sparkles className="h-5 w-5" />
    </div>
  );
}

function RadarSignalCard({
  signal,
  skills,
  onUseSkill,
}: {
  signal: RadarSignal;
  skills: Skill[];
  onUseSkill: (skill: Skill) => void;
}) {
  const skill = skills.find((s) => s.id === signal.suggested_skill_id);
  const typeIcons: Record<string, React.ElementType> = {
    competitor: AlertCircle,
    trend: TrendingUp,
    viral: Sparkles,
  };
  const Icon = typeIcons[signal.type] || AlertCircle;
  const priorityColors: Record<string, string> = {
    high: "text-red-500",
    medium: "text-yellow-500",
    low: "text-gray-400",
  };

  return (
    <div className="rounded-md border px-2 py-1.5 text-xs space-y-1">
      <div className="flex items-start gap-1.5">
        <Icon className={cn("h-3 w-3 mt-0.5 shrink-0", priorityColors[signal.priority])} />
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{signal.title}</p>
          <p className="text-[10px] text-muted-foreground line-clamp-1">
            {String((signal.signal as { insight?: string }).insight || signal.source)}
          </p>
        </div>
      </div>
      {skill && (
        <button
          onClick={() => onUseSkill(skill)}
          className="text-[10px] text-primary hover:underline"
        >
          → 用 {skill.name} 应对
        </button>
      )}
    </div>
  );
}

function SkillInputField({
  input,
  value,
  onChange,
  products,
  selectedProduct,
}: {
  input: SkillInputDef;
  value: unknown;
  onChange: (v: unknown) => void;
  products: Product[];
  selectedProduct: Product | null;
}) {
  if (input.type === "product") {
    return (
      <div>
        <label className="text-xs font-medium text-muted-foreground">{input.label}</label>
        {value || selectedProduct ? (
          <div className="mt-1 rounded-md border px-2 py-1.5 text-xs">
            {((value as Product) || selectedProduct)?.name}
          </div>
        ) : (
          <div className="mt-1 rounded-md border border-dashed px-2 py-1.5 text-xs text-muted-foreground">
            请在顶部搜索栏选择商品
          </div>
        )}
      </div>
    );
  }

  if (input.type === "products") {
    const list = (value as Product[]) || [];
    return (
      <div>
        <label className="text-xs font-medium text-muted-foreground">{input.label}</label>
        <div className="mt-1 space-y-1">
          {list.length > 0 ? (
            list.map((p) => (
              <div key={p.id} className="rounded-md border px-2 py-1 text-xs flex items-center justify-between">
                <span>{p.name}</span>
                <button onClick={() => onChange(list.filter((x) => x.id !== p.id))}>
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">未选择商品</p>
          )}
          {selectedProduct && !list.find((p) => p.id === selectedProduct.id) && (
            <Button
              size="sm"
              variant="outline"
              className="w-full h-7 text-xs"
              onClick={() => onChange([...list, selectedProduct])}
            >
              + 添加 {selectedProduct.name}
            </Button>
          )}
          {list.length === 0 && !selectedProduct && (
            <Button
              size="sm"
              variant="outline"
              className="w-full h-7 text-xs"
              onClick={() => onChange(products.slice(0, 5))}
            >
              使用全部商品 (前 5 个)
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (input.type === "select" || input.type === "platform") {
    const opts = input.type === "platform" ? PLATFORM_OPTIONS : input.options || [];
    return (
      <div>
        <label className="text-xs font-medium text-muted-foreground">{input.label}</label>
        <Select value={(value as string) || ""} onValueChange={(v) => v && onChange(v)}>
          <SelectTrigger className="mt-1 h-8 text-xs">
            <SelectValue placeholder="选择..." />
          </SelectTrigger>
          <SelectContent>
            {opts.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (input.type === "textarea") {
    return (
      <div>
        <label className="text-xs font-medium text-muted-foreground">{input.label}</label>
        <textarea
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={input.placeholder}
          className="mt-1 w-full rounded-md border px-2 py-1.5 text-xs min-h-[80px]"
        />
      </div>
    );
  }

  // default text
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{input.label}</label>
      <Input
        value={(value as string) || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={input.placeholder}
        className="mt-1 h-8 text-xs"
      />
    </div>
  );
}
