"use client";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function QuotationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="报价单"
        description="OEM 报价单管理 — AI 自动生成 + 人工审批"
      />

      <Card className="border-dashed">
        <CardContent className="py-12 text-center space-y-4">
          <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
            <FileSpreadsheet className="h-7 w-7 text-primary" />
          </div>
          <div>
            <p className="text-base font-semibold">报价单 V1 即将上线</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              你可以现在就用 <strong>OEM 报价单生成 Skill</strong> 在内容工厂里直接生成报价单，
              下个版本会有完整的报价单 CRUD + PDF 导出 + 状态追踪。
            </p>
          </div>
          <Link href="/content">
            <Button>
              <Sparkles className="mr-2 h-4 w-4" />
              去内容工厂用 Skill 生成
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <p className="text-sm font-medium mb-3">即将推出的功能</p>
          <ul className="text-xs text-muted-foreground space-y-1.5">
            <li>· AI 一键生成完整报价单（产品 / 数量 / 阶梯价 / 付款条款）</li>
            <li>· PDF 导出（含工厂 logo、签字栏）</li>
            <li>· 报价单状态追踪：草稿 / 已发送 / 已接受 / 已拒绝 / 已过期</li>
            <li>· 一键 WhatsApp 发送给买家</li>
            <li>· 自动跟进提醒（报价后 3 天 / 7 天 / 14 天）</li>
            <li>· 报价转化率分析</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
