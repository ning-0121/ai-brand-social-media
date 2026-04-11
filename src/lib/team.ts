import { supabase } from "./supabase";
import type { TeamRole } from "./permissions";

export interface Team {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamRole;
  joined_at: string;
  email?: string;
}

export interface TeamInvitation {
  id: string;
  team_id: string;
  email: string;
  role: TeamRole;
  accepted: boolean;
  expires_at: string;
  created_at: string;
}

/**
 * Get the team for the current user. Creates one if it doesn't exist.
 */
export async function getOrCreateTeam(
  userId: string,
  email?: string
): Promise<{ team: Team; role: TeamRole }> {
  // Check if user is already a team member
  const { data: membership } = await supabase
    .from("team_members")
    .select("team_id, role")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (membership) {
    const { data: team } = await supabase
      .from("teams")
      .select("*")
      .eq("id", membership.team_id)
      .single();

    if (team) {
      return { team: team as Team, role: membership.role as TeamRole };
    }
  }

  // No team — create personal team
  const teamName = email ? `${email.split("@")[0]} 的团队` : "我的团队";
  const { data: newTeam, error: teamErr } = await supabase
    .from("teams")
    .insert({ name: teamName, owner_id: userId })
    .select()
    .single();

  if (teamErr || !newTeam) throw new Error("创建团队失败");

  // Add user as owner
  await supabase.from("team_members").insert({
    team_id: newTeam.id,
    user_id: userId,
    role: "owner",
  });

  return { team: newTeam as Team, role: "owner" };
}

/**
 * Get all members of a team.
 */
export async function getTeamMembers(
  teamId: string
): Promise<TeamMember[]> {
  const { data, error } = await supabase
    .from("team_members")
    .select("*")
    .eq("team_id", teamId)
    .order("joined_at", { ascending: true });

  if (error) throw error;
  return (data || []) as TeamMember[];
}

/**
 * Get pending invitations for a team.
 */
export async function getTeamInvitations(
  teamId: string
): Promise<TeamInvitation[]> {
  const { data, error } = await supabase
    .from("team_invitations")
    .select("*")
    .eq("team_id", teamId)
    .eq("accepted", false)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as TeamInvitation[];
}

/**
 * Invite a member to the team.
 */
export async function inviteMember(
  teamId: string,
  email: string,
  role: TeamRole,
  invitedBy: string
): Promise<TeamInvitation> {
  // Generate token
  const tokenBytes = new Uint8Array(24);
  crypto.getRandomValues(tokenBytes);
  const token = Array.from(tokenBytes, (b) => b.toString(16).padStart(2, "0")).join("");

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("team_invitations")
    .insert({
      team_id: teamId,
      email,
      role,
      invited_by: invitedBy,
      token,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error) throw error;
  return data as TeamInvitation;
}

/**
 * Accept a team invitation.
 */
export async function acceptInvitation(
  token: string,
  userId: string
): Promise<{ teamId: string; role: TeamRole }> {
  const { data: invitation, error } = await supabase
    .from("team_invitations")
    .select("*")
    .eq("token", token)
    .eq("accepted", false)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (error || !invitation) throw new Error("邀请无效或已过期");

  // Add to team
  await supabase.from("team_members").insert({
    team_id: invitation.team_id,
    user_id: userId,
    role: invitation.role,
  });

  // Mark accepted
  await supabase
    .from("team_invitations")
    .update({ accepted: true })
    .eq("id", invitation.id);

  return { teamId: invitation.team_id, role: invitation.role as TeamRole };
}

/**
 * Update a member's role.
 */
export async function updateMemberRole(
  teamId: string,
  memberId: string,
  newRole: TeamRole
): Promise<void> {
  await supabase
    .from("team_members")
    .update({ role: newRole })
    .eq("id", memberId)
    .eq("team_id", teamId);
}

/**
 * Remove a member from the team.
 */
export async function removeMember(
  teamId: string,
  memberId: string
): Promise<void> {
  // Prevent removing the owner
  const { data: member } = await supabase
    .from("team_members")
    .select("role")
    .eq("id", memberId)
    .single();

  if (member?.role === "owner") {
    throw new Error("不能移除团队所有者");
  }

  await supabase
    .from("team_members")
    .delete()
    .eq("id", memberId)
    .eq("team_id", teamId);
}
