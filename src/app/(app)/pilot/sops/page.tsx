"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ChevronDown, ChevronRight, CheckCircle2, AlertTriangle } from "lucide-react";
import { DEFAULT_SOPS } from "@/lib/pilot-data";
import type { SOP } from "@/lib/pilot-data";

function SOPCard({ sop }: { sop: SOP }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card>
      <CardHeader className="pb-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
            <CardTitle className="text-sm">{sop.title}</CardTitle>
          </div>
          <div className="flex gap-1.5">
            {sop.applicable_roles.map((role) => (
              <Badge key={role} variant="secondary" className="text-[10px]">
                {role}
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 space-y-5">
          {/* Inputs */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">输入条件</h4>
            <ul className="space-y-1">
              {sop.inputs.map((input, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-muted-foreground mt-0.5">-</span>
                  <span>{input}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Steps */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">操作步骤</h4>
            <ol className="space-y-2">
              {sop.steps.map((step) => (
                <li key={step.step} className="flex items-start gap-3 text-sm">
                  <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 mt-0.5">
                    {step.step}
                  </span>
                  <div>
                    <span className="font-medium">{step.action}</span>
                    <span className="text-muted-foreground"> — {step.detail}</span>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Approval Criteria */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">审批标准</h4>
            <ul className="space-y-1">
              {sop.approval_criteria.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Expected Output */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">预期输出</h4>
            <ul className="space-y-1">
              {sop.expected_output.map((o, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-muted-foreground mt-0.5">-</span>
                  <span>{o}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Common Errors */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">常见错误</h4>
            <ul className="space-y-1">
              {sop.common_errors.map((e, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <span>{e}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Acceptance Criteria */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">验收标准</h4>
            <ul className="space-y-1">
              {sop.acceptance_criteria.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function PilotSOPsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="SOP 中心"
        description="标准操作流程，帮助团队高效使用系统"
        actions={
          <Link href="/pilot">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              返回
            </Button>
          </Link>
        }
      />

      <div className="space-y-4">
        {DEFAULT_SOPS.map((sop) => (
          <SOPCard key={sop.id} sop={sop} />
        ))}
      </div>

      {DEFAULT_SOPS.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            暂无 SOP 数据
          </CardContent>
        </Card>
      )}
    </div>
  );
}
