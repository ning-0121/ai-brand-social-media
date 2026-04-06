import { NextResponse } from "next/server";
import { getAllSkills, getSkill, getSkillMetadata } from "@/lib/content-skills/registry";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const category = url.searchParams.get("category");

  if (id) {
    const skill = getSkill(id);
    if (!skill) return NextResponse.json({ error: "未找到 Skill" }, { status: 404 });
    return NextResponse.json({ skill: getSkillMetadata(skill) });
  }

  let skills = getAllSkills();
  if (category) {
    skills = skills.filter((s) => s.category === category);
  }

  return NextResponse.json({
    skills: skills.map(getSkillMetadata),
  });
}
