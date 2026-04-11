import { NextResponse } from "next/server";

export type TeamRole = "owner" | "admin" | "editor" | "viewer";

export type Permission =
  | "manage_team"
  | "manage_integrations"
  | "approve"
  | "edit"
  | "publish"
  | "view";

const ROLE_PERMISSIONS: Record<TeamRole, Permission[] | ["*"]> = {
  owner: ["*"],
  admin: ["manage_team", "manage_integrations", "approve", "edit", "publish", "view"],
  editor: ["edit", "publish", "view", "approve"],
  viewer: ["view"],
};

/**
 * Check if a role has a specific permission.
 */
export function hasPermission(role: TeamRole, permission: Permission): boolean {
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;
  if (perms[0] === "*") return true;
  return (perms as Permission[]).includes(permission);
}

/**
 * Return 403 response if the user's role lacks the required permission.
 */
export function requirePermission(
  role: TeamRole | undefined,
  permission: Permission
): NextResponse | null {
  if (!role) {
    return NextResponse.json(
      { error: "未找到角色信息" },
      { status: 403 }
    );
  }
  if (!hasPermission(role, permission)) {
    return NextResponse.json(
      { error: `权限不足：需要 ${permission} 权限` },
      { status: 403 }
    );
  }
  return null;
}

export const ROLE_LABELS: Record<TeamRole, string> = {
  owner: "所有者",
  admin: "管理员",
  editor: "编辑",
  viewer: "只读",
};
