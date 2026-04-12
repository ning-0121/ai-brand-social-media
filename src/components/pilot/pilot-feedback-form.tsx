"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const MODULES = [
  { value: "dashboard", label: "运营总览" },
  { value: "store", label: "店铺优化" },
  { value: "content", label: "内容工厂" },
  { value: "social", label: "社媒规划" },
  { value: "creative", label: "创意中心" },
  { value: "approvals", label: "审批中心" },
  { value: "analytics", label: "数据分析" },
  { value: "settings", label: "系统设置" },
];

export function PilotFeedbackForm({ runId, onSubmitted }: { runId?: string; onSubmitted?: () => void }) {
  const [module, setModule] = useState("");
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [mostUseful, setMostUseful] = useState("");
  const [leastUseful, setLeastUseful] = useState("");
  const [timeSaved, setTimeSaved] = useState("");
  const [wouldContinue, setWouldContinue] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!module || score === 0) {
      toast.error("请选择模块和评分");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/pilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit_feedback",
          run_id: runId,
          module_name: module,
          score,
          feedback,
          most_useful: mostUseful,
          least_useful: leastUseful,
          time_saved_minutes: timeSaved ? parseInt(timeSaved) : null,
          would_continue: wouldContinue,
        }),
      });
      if (res.ok) {
        toast.success("反馈已提交");
        setModule(""); setScore(0); setFeedback(""); setMostUseful(""); setLeastUseful(""); setTimeSaved(""); setWouldContinue(null);
        onSubmitted?.();
      } else {
        const data = await res.json();
        toast.error(data.error || "提交失败");
      }
    } catch {
      toast.error("提交失败");
    }
    setSubmitting(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">提交反馈</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">模块</label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={module}
              onChange={(e) => setModule(e.target.value)}
            >
              <option value="">选择模块</option>
              {MODULES.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">评分</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} onClick={() => setScore(s)} className="p-1">
                  <Star className={cn("h-5 w-5", s <= score ? "text-amber-500 fill-amber-500" : "text-muted-foreground")} />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">反馈内容</label>
          <Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="你的使用感受..." className="min-h-[80px]" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">最有用的功能</label>
            <Input value={mostUseful} onChange={(e) => setMostUseful(e.target.value)} placeholder="例: SEO 一键优化" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">最没用的功能</label>
            <Input value={leastUseful} onChange={(e) => setLeastUseful(e.target.value)} placeholder="例: 直播中心" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">估计节省时间（分钟/天）</label>
            <Input type="number" value={timeSaved} onChange={(e) => setTimeSaved(e.target.value)} placeholder="例: 30" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">是否愿意继续使用</label>
            <div className="flex gap-2">
              <Button size="sm" variant={wouldContinue === true ? "default" : "outline"} onClick={() => setWouldContinue(true)} className="flex-1">是</Button>
              <Button size="sm" variant={wouldContinue === false ? "default" : "outline"} onClick={() => setWouldContinue(false)} className="flex-1">否</Button>
            </div>
          </div>
        </div>

        <Button onClick={handleSubmit} disabled={submitting || !module || score === 0} className="w-full">
          {submitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
          提交反馈
        </Button>
      </CardContent>
    </Card>
  );
}
