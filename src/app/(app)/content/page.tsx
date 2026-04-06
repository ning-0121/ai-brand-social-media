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
import {
  Sparkles,
  Loader2,
  Search,
  RefreshCw,
  Radar,
  Inbox,
  Package,
  ChevronRight,
  Globe,
  MessageSquare,
  TrendingUp,
  AlertCircle,
  X,
  DollarSign,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
    } catch (err) {
      console.error("加载 Skills 失败:", err);
    }
    setLoadingSkills(false);
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/content-plan?type=products");
      const data = await res.json();
      setProducts(data.products || []);
    } catch (err) {
      console.error("加载商品失败:", err);
    }
  };

  const fetchRadar = async () => {
    try {
      const res = await fetch("/api/radar");
      const data = await res.json();
      setSignals(data.signals || []);
    } catch (err) {
      console.error("加载雷达失败:", err);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await fetch("/api/content-plan?type=tasks");
      const data = await res.json();
      setPendingTasks(data.pending || []);
    } catch (err) {
      console.error("加载任务失败:", err);
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
    } catch (err) {
      console.error("扫描失败:", err);
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
    } catch (err) {
      console.error("执行失败:", err);
    }
    setExecuting(false);
  };

  const filteredProducts = products.filter((p) =>
    productSearch ? p.name.toLowerCase().includes(productSearch.toLowerCase()) : true
  );

  const websiteSkills = skills.filter((s) => s.category === "website");
  const socialSkills = skills.filter((s) => s.category === "social");

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

      {/* Main Layout: 3 columns */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Left: Skills Library + Radar + Inbox */}
        <div className="lg:col-span-4 space-y-4">
          {/* Skills Library */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <CardTitle className="text-sm">Skills 库</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-2">
              <Tabs defaultValue="website">
                <TabsList className="w-full grid grid-cols-2 h-8">
                  <TabsTrigger value="website" className="text-xs gap-1">
                    <Globe className="h-3 w-3" />
                    网站 ({websiteSkills.length})
                  </TabsTrigger>
                  <TabsTrigger value="social" className="text-xs gap-1">
                    <MessageSquare className="h-3 w-3" />
                    社媒 ({socialSkills.length})
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="website" className="mt-2 space-y-1">
                  {loadingSkills ? (
                    <Skeleton className="h-32" />
                  ) : (
                    websiteSkills.map((s) => (
                      <SkillItem
                        key={s.id}
                        skill={s}
                        selected={selectedSkill?.id === s.id}
                        onClick={() => handleSelectSkill(s)}
                      />
                    ))
                  )}
                </TabsContent>
                <TabsContent value="social" className="mt-2 space-y-1">
                  {loadingSkills ? (
                    <Skeleton className="h-32" />
                  ) : (
                    socialSkills.map((s) => (
                      <SkillItem
                        key={s.id}
                        skill={s}
                        selected={selectedSkill?.id === s.id}
                        onClick={() => handleSelectSkill(s)}
                      />
                    ))
                  )}
                </TabsContent>
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
                  className="h-6 text-xs"
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
            <CardContent className="p-2 space-y-1.5">
              {signals.length > 0 ? (
                signals.slice(0, 5).map((s) => (
                  <RadarSignalCard key={s.id} signal={s} skills={skills} onUseSkill={handleSelectSkill} />
                ))
              ) : (
                <div className="text-center py-3 text-xs text-muted-foreground">
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
              <CardContent className="p-2 space-y-1.5">
                {pendingTasks.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    className="rounded-md border px-2 py-1.5 text-xs hover:bg-muted/50"
                  >
                    <p className="font-medium truncate">{task.product_name || task.skill_id}</p>
                    <p className="text-[10px] text-muted-foreground">
                      来源: {task.source_module} · {task.status}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Middle: Skill Input Panel */}
        <div className="lg:col-span-4">
          {selectedSkill ? (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm">{selectedSkill.name}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">{selectedSkill.description}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedSkill(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
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
              </CardHeader>
              <CardContent className="space-y-3">
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
                <Button className="w-full" onClick={handleExecute} disabled={executing}>
                  {executing ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />AI 生成中...</>
                  ) : (
                    <><Sparkles className="mr-2 h-4 w-4" />执行 Skill</>
                  )}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center text-sm text-muted-foreground">
                <Sparkles className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                <p>从左侧选择一个 Skill</p>
                <p className="text-xs mt-1">12 个专业内容生产技能</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Result Viewer */}
        <div className="lg:col-span-4">
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
              <CardContent className="py-16 text-center text-sm text-muted-foreground">
                <ChevronRight className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                <p>执行 Skill 后</p>
                <p className="text-xs mt-1">AI 生成结果将显示在此</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ========== Sub Components ==========

function SkillItem({ skill, selected, onClick }: { skill: Skill; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-md px-2 py-2 hover:bg-muted transition-colors",
        selected && "bg-primary/10 ring-1 ring-primary/30"
      )}
    >
      <div className="flex items-center gap-2">
        <Sparkles className="h-3 w-3 text-amber-500 shrink-0" />
        <span className="text-xs font-medium flex-1">{skill.name}</span>
        <span className="text-[10px] text-muted-foreground">
          ${(skill.estimated_cost.text + skill.estimated_cost.image).toFixed(2)}
        </span>
      </div>
    </button>
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
