import { NextResponse } from "next/server";

const MODASH_API_BASE = "https://api.modash.io/v1";

export async function POST(request: Request) {
  try {
    const { action, ...params } = await request.json();
    const apiKey = process.env.MODASH_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "未配置 Modash API Key，请在环境变量中添加 MODASH_API_KEY" },
        { status: 400 }
      );
    }

    const headers = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };

    switch (action) {
      // Search influencers on Instagram
      case "search_instagram": {
        const {
          min_followers = 10000,
          max_followers,
          location,
          language,
          gender,
          engagement_rate,
          keywords,
          interests,
          page = 0,
        } = params;

        const filter: Record<string, unknown> = {
          followers: { min: min_followers, ...(max_followers && { max: max_followers }) },
        };
        if (engagement_rate) filter.engagement_rate = { min: engagement_rate };
        if (gender) filter.gender = gender;
        if (location) filter.audience_geo = [{ id: location, weight: 0.3 }];
        if (language) filter.audience_lang = [{ code: language, weight: 0.3 }];
        if (interests) filter.interests = interests;
        if (keywords) filter.keywords = keywords;

        const res = await fetch(`${MODASH_API_BASE}/instagram/search`, {
          method: "POST",
          headers,
          body: JSON.stringify({ filter, page, limit: 15 }),
        });

        if (!res.ok) {
          const errText = await res.text();
          return NextResponse.json(
            { error: `Modash API 错误: ${res.status}`, details: errText },
            { status: res.status }
          );
        }

        const data = await res.json();
        return NextResponse.json(data);
      }

      // Search influencers on TikTok
      case "search_tiktok": {
        const {
          min_followers = 10000,
          max_followers,
          engagement_rate,
          keywords,
          page = 0,
        } = params;

        const filter: Record<string, unknown> = {
          followers: { min: min_followers, ...(max_followers && { max: max_followers }) },
        };
        if (engagement_rate) filter.engagement_rate = { min: engagement_rate };
        if (keywords) filter.keywords = keywords;

        const res = await fetch(`${MODASH_API_BASE}/tiktok/search`, {
          method: "POST",
          headers,
          body: JSON.stringify({ filter, page, limit: 15 }),
        });

        if (!res.ok) {
          const errText = await res.text();
          return NextResponse.json(
            { error: `Modash API 错误: ${res.status}`, details: errText },
            { status: res.status }
          );
        }

        const data = await res.json();
        return NextResponse.json(data);
      }

      // Get influencer profile details
      case "get_profile": {
        const { platform, username } = params;
        if (!platform || !username) {
          return NextResponse.json({ error: "缺少 platform 或 username" }, { status: 400 });
        }

        const res = await fetch(
          `${MODASH_API_BASE}/${platform}/profile/${encodeURIComponent(username)}/report`,
          { headers }
        );

        if (!res.ok) {
          const errText = await res.text();
          return NextResponse.json(
            { error: `Modash API 错误: ${res.status}`, details: errText },
            { status: res.status }
          );
        }

        const data = await res.json();
        return NextResponse.json(data);
      }

      // Get influencer email (costs extra credits)
      case "get_email": {
        const { platform, username } = params;
        if (!platform || !username) {
          return NextResponse.json({ error: "缺少 platform 或 username" }, { status: 400 });
        }

        const res = await fetch(
          `${MODASH_API_BASE}/${platform}/profile/${encodeURIComponent(username)}/contacts`,
          { headers }
        );

        if (!res.ok) {
          const errText = await res.text();
          return NextResponse.json(
            { error: `获取联系方式失败: ${res.status}`, details: errText },
            { status: res.status }
          );
        }

        const data = await res.json();
        return NextResponse.json(data);
      }

      default:
        return NextResponse.json({ error: `未知操作: ${action}` }, { status: 400 });
    }
  } catch (error: unknown) {
    console.error("Modash API error:", error);
    const message = error instanceof Error ? error.message : "操作失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
