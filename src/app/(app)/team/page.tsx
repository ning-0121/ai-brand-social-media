"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/hooks/use-store";
import {
  Users,
  Plus,
  Mail,
  Crown,
  Settings2,
  Eye,
  Pencil,
  Zap,
  Clock,
  CheckCircle2,
} from "lucide-react";

const ROLE_CONFIG: Record<string, { label: string; desc: string; color: string; icon: React.ElementType }> = {
  owner:    { label: "创始人",  desc: "全部权限",                 color: "bg-purple-100 text-purple-700", icon: Crown },
  manager:  { label: "管理员",  desc: "除账单外全部权限",          color: "bg-blue-100 text-blue-700",    icon: Settings2 },
  operator: { label: "运营",    desc: "执行任务、审批、查看数据",   color: "bg-green-100 text-green-700",  icon: Zap },
  designer: { label: "美工",    desc: "内容创作、素材管理",         color: "bg-pink-100 text-pink-700",    icon: Pencil },
  viewer:   { label: "观察者",  desc: "只读",                      color: "bg-gray-100 text-gray-600",    icon: Eye },
};

const DEMO_MEMBERS = [
  { name: "Ning", email: "ningq0615@gmail.com", role: "owner", status: "active", stores: ["全部店铺"], last_active: "刚刚" },
  { name: "小李（运营）", email: "li@team.com", role: "operator", status: "invited", stores: ["Amazon 施工手套"], last_active: "待加入" },
  { name: "小张（美工）", email: "zhang@team.com", role: "designer", status: "invited", stores: ["Amazon 施工手套"], last_active: "待加入" },
];

const RECENT_ACTIVITY = [
  { user: "Ning", action: "审批了 SEO 优化任务", target: "Construction Gloves L", time: "2小时前", type: "approve" },
  { user: "Ning", action: "运行了 AI 全店诊断", target: "Amazon 施工手套", time: "5小时前", type: "diagnose" },
  { user: "Ning", action: "生成了广告优化方案", target: "PPC - SP Campaign", time: "昨天", type: "generate" },
];

export default function TeamPage() {
  const { currentStore } = useStore();
  const [showInvite, setShowInvite] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">团队管理</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            邀请成员 · 分配权限 · 任务指派
          </p>
        </div>
        <Button size="sm" onClick={() => setShowInvite(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          邀请成员
        </Button>
      </div>

      {/* 邀请表单 */}
      {showInvite && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Mail className="h-4 w-4" />
              邀请新成员
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <input
                type="email"
                placeholder="邮件地址"
                className="rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <select className="rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="operator">运营</option>
                <option value="designer">美工</option>
                <option value="manager">管理员</option>
                <option value="viewer">观察者</option>
              </select>
              <select className="rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                <option>全部店铺</option>
                <option>{currentStore?.name || "当前店铺"}</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Button size="sm">
                <Mail className="mr-1.5 h-3.5 w-3.5" />
                发送邀请
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowInvite(false)}>取消</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 成员列表 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              团队成员
            </CardTitle>
            <Badge variant="secondary">{DEMO_MEMBERS.length} 人</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {DEMO_MEMBERS.map((member, i) => {
            const roleConf = ROLE_CONFIG[member.role];
            const RoleIcon = roleConf.icon;
            return (
              <div key={i} className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
                {/* Avatar */}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                  {member.name[0]}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{member.name}</span>
                    <Badge className={`text-[10px] px-1.5 py-0 ${roleConf.color}`}>
                      <RoleIcon className="h-2.5 w-2.5 mr-0.5" />
                      {roleConf.label}
                    </Badge>
                    {member.status === "invited" && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-orange-500 border-orange-200">
                        待加入
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-muted-foreground">{member.email}</span>
                    <span className="text-xs text-muted-foreground">· {member.stores.join(", ")}</span>
                  </div>
                </div>
                {/* Last active */}
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                    <Clock className="h-3 w-3" />
                    {member.last_active}
                  </p>
                </div>
                {/* Actions */}
                {member.role !== "owner" && (
                  <Button size="sm" variant="ghost" className="h-7 text-xs shrink-0">
                    管理
                  </Button>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* 角色权限说明 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">角色权限说明</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(ROLE_CONFIG).map(([role, conf]) => {
              const Icon = conf.icon;
              return (
                <div key={role} className="flex items-start gap-2.5 rounded-lg border p-3">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${conf.color}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold">{conf.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{conf.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 rounded-lg bg-muted/40 p-3 space-y-1.5">
            <p className="text-xs font-medium">权限细则</p>
            {[
              ["运营", "可执行任务、审批方案、查看所有数据、无法修改系统设置"],
              ["美工", "可访问内容工厂、素材库、查看任务，无法审批或执行操作"],
              ["观察者", "只能查看数据总览和报告，不能执行任何操作"],
            ].map(([role, desc]) => (
              <div key={role} className="flex gap-2 text-xs">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                <span><span className="font-medium">{role}</span>：{desc}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 最近操作 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">最近团队操作</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {RECENT_ACTIVITY.map((act, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted font-semibold text-xs">
                {act.user[0]}
              </div>
              <div className="flex-1">
                <span className="font-medium">{act.user}</span>
                <span className="text-muted-foreground"> {act.action}</span>
                {act.target && (
                  <span className="text-primary ml-1 font-medium">· {act.target}</span>
                )}
              </div>
              <span className="text-xs text-muted-foreground shrink-0">{act.time}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
