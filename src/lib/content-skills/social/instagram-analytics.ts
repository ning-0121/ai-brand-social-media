import { getProfileInfo, getRecentPosts, getAccountInsights, discoverBusiness } from "../../instagram-api";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

export const instagramAnalyticsSkill: ContentSkill = {
  id: "instagram_analytics",
  name: "Instagram 数据分析",
  category: "social",
  description: "分析 Instagram 账号表现 — 粉丝增长、帖子互动、竞品对标",
  icon: "TrendingUp",
  color: "pink",
  estimated_cost: { text: 0, image: 0 },
  estimated_time_seconds: 10,
  agents: ["social_strategist"],
  inputs: [
    { key: "competitor_username", label: "竞品账号（可选）", type: "text", placeholder: "如 alo_yoga" },
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const profile = await getProfileInfo();
    const posts = await getRecentPosts(12);
    const insights = await getAccountInsights("day");

    const topPosts = posts
      .sort((a, b) => ((b.like_count as number) || 0) - ((a.like_count as number) || 0))
      .slice(0, 3);

    const avgLikes = posts.length > 0
      ? Math.round(posts.reduce((s, p) => s + ((p.like_count as number) || 0), 0) / posts.length)
      : 0;
    const avgComments = posts.length > 0
      ? Math.round(posts.reduce((s, p) => s + ((p.comments_count as number) || 0), 0) / posts.length)
      : 0;

    let competitor = null;
    if (input.competitor_username) {
      competitor = await discoverBusiness(input.competitor_username as string);
    }

    return {
      skill_id: "instagram_analytics",
      output: {
        profile,
        recent_posts_count: posts.length,
        avg_likes: avgLikes,
        avg_comments: avgComments,
        top_posts: topPosts.map(p => ({ id: p.id, caption: (p.caption as string || "").slice(0, 100), likes: p.like_count, comments: p.comments_count, permalink: p.permalink })),
        insights,
        competitor: competitor ? { username: input.competitor_username, data: competitor } : null,
      },
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0, image: 0 },
    };
  },
};
