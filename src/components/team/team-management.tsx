"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Users, UserPlus, Trash2, Loader2, Mail, Crown, Shield, Edit3, Eye } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  email?: string;
}

interface TeamInvitation {
  id: string;
  email: string;
  role: string;
  accepted: boolean;
  expires_at: string;
}

interface TeamData {
  team: { id: string; name: string; owner_id: string };
  role: string;
  members: TeamMember[];
  invitations: TeamInvitation[];
}

const ROLE_CONFIG: Record<string, { label: string; icon: typeof Crown; color: string }> = {
  owner: { label: "所有者", icon: Crown, color: "text-amber-500" },
  admin: { label: "管理员", icon: Shield, color: "text-blue-500" },
  editor: { label: "编辑", icon: Edit3, color: "text-emerald-500" },
  viewer: { label: "只读", icon: Eye, color: "text-muted-foreground" },
};

export function TeamManagement() {
  const [data, setData] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("editor");
  const [submitting, setSubmitting] = useState(false);

  const fetchTeam = useCallback(() => {
    fetch("/api/team")
      .then((r) => r.json())
      .then(setData)
      .catch(() => toast.error("加载团队信息失败"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchTeam(); }, [fetchTeam]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "invite", email: inviteEmail, role: inviteRole }),
      });
      if (res.ok) {
        toast.success(`已发送邀请到 ${inviteEmail}`);
        setInviteOpen(false);
        setInviteEmail("");
        fetchTeam();
      } else {
        const err = await res.json();
        toast.error(err.error || "邀请失败");
      }
    } catch {
      toast.error("邀请失败");
    }
    setSubmitting(false);
  };

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_role", member_id: memberId, role: newRole }),
      });
      if (res.ok) {
        toast.success("角色已更新");
        fetchTeam();
      } else {
        const err = await res.json();
        toast.error(err.error || "更新失败");
      }
    } catch {
      toast.error("更新失败");
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!confirm("确定要移除此成员吗？")) return;
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", member_id: memberId }),
      });
      if (res.ok) {
        toast.success("成员已移除");
        fetchTeam();
      } else {
        const err = await res.json();
        toast.error(err.error || "移除失败");
      }
    } catch {
      toast.error("移除失败");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) return null;

  const canManage = data.role === "owner" || data.role === "admin";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">{data.team.name}</h3>
          <Badge variant="outline" className="text-xs">
            {data.members.length} 成员
          </Badge>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            <UserPlus className="mr-1.5 h-3.5 w-3.5" />
            邀请成员
          </Button>
        )}
      </div>

      {/* Members list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">团队成员</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.members.map((member) => {
            const config = ROLE_CONFIG[member.role] || ROLE_CONFIG.viewer;
            const Icon = config.icon;
            const isOwner = member.role === "owner";

            return (
              <div
                key={member.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-bold">
                  {(member.email || member.user_id).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {member.email || member.user_id.slice(0, 8)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    加入于 {new Date(member.joined_at).toLocaleDateString("zh-CN")}
                  </div>
                </div>
                <div className={cn("flex items-center gap-1 text-xs font-medium", config.color)}>
                  <Icon className="h-3 w-3" />
                  {config.label}
                </div>
                {canManage && !isOwner && (
                  <div className="flex items-center gap-1">
                    <Select
                      value={member.role}
                      onValueChange={(v) => v && handleUpdateRole(member.id, v)}
                    >
                      <SelectTrigger className="h-7 w-20 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">管理员</SelectItem>
                        <SelectItem value="editor">编辑</SelectItem>
                        <SelectItem value="viewer">只读</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive"
                      onClick={() => handleRemove(member.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Pending invitations */}
      {data.invitations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">待接受邀请</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.invitations.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-border"
              >
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <div className="text-sm">{inv.email}</div>
                  <div className="text-xs text-muted-foreground">
                    角色: {ROLE_CONFIG[inv.role]?.label || inv.role} · 过期: {new Date(inv.expires_at).toLocaleDateString("zh-CN")}
                  </div>
                </div>
                <Badge variant="outline" className="text-xs text-amber-600">待接受</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>邀请团队成员</DialogTitle>
            <DialogDescription>输入邮箱地址，发送邀请链接</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">邮箱地址</label>
              <Input
                type="email"
                placeholder="member@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">角色</label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v || "editor")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">管理员 — 可管理团队和平台连接</SelectItem>
                  <SelectItem value="editor">编辑 — 可编辑内容和发布</SelectItem>
                  <SelectItem value="viewer">只读 — 仅查看数据</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>取消</DialogClose>
            <Button onClick={handleInvite} disabled={submitting || !inviteEmail.trim()}>
              {submitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              发送邀请
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
