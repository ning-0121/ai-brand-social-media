import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { requirePermission } from "@/lib/permissions";
import {
  getOrCreateTeam,
  getTeamMembers,
  getTeamInvitations,
  inviteMember,
  updateMemberRole,
  removeMember,
} from "@/lib/team";
import type { TeamRole } from "@/lib/permissions";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { team, role } = await getOrCreateTeam(auth.userId);
    const members = await getTeamMembers(team.id);
    const invitations = await getTeamInvitations(team.id);

    return NextResponse.json({ team, role, members, invitations });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "获取团队信息失败" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { action } = body;

    // Check team management permission
    const permError = requirePermission(auth.role, "manage_team");
    if (permError) return permError;

    const { team } = await getOrCreateTeam(auth.userId);

    switch (action) {
      case "invite": {
        const { email, role = "editor" } = body;
        if (!email?.trim()) {
          return NextResponse.json({ error: "请输入邮箱" }, { status: 400 });
        }
        const invitation = await inviteMember(
          team.id,
          email.trim(),
          role as TeamRole,
          auth.userId
        );
        return NextResponse.json({ success: true, invitation });
      }

      case "update_role": {
        const { member_id, role } = body;
        if (!member_id || !role) {
          return NextResponse.json({ error: "缺少参数" }, { status: 400 });
        }
        await updateMemberRole(team.id, member_id, role as TeamRole);
        return NextResponse.json({ success: true });
      }

      case "remove": {
        const { member_id } = body;
        if (!member_id) {
          return NextResponse.json({ error: "缺少 member_id" }, { status: 400 });
        }
        await removeMember(team.id, member_id);
        return NextResponse.json({ success: true });
      }

      case "rename": {
        const { name } = body;
        if (!name?.trim()) {
          return NextResponse.json({ error: "团队名称不能为空" }, { status: 400 });
        }
        const { supabase } = await import("@/lib/supabase");
        await supabase.from("teams").update({ name: name.trim() }).eq("id", team.id);
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: `未知操作: ${action}` }, { status: 400 });
    }
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "操作失败" },
      { status: 500 }
    );
  }
}
