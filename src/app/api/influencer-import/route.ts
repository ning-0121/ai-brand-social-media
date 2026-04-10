import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/api-auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Parse CSV text into array of objects
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^["']|["']$/g, ""));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim().replace(/^["']|["']$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || "";
    });
    rows.push(row);
  }
  return rows;
}

// Normalize field names from various CSV exports (蝉妈妈, 千瓜, etc.)
function normalizeInfluencer(row: Record<string, string>) {
  const name = row["达人名称"] || row["昵称"] || row["name"] || row["Name"] || row["账号名称"] || "";
  const platform =
    row["平台"] || row["platform"] || row["Platform"] || "xiaohongshu";
  const handle =
    row["账号"] || row["handle"] || row["Handle"] || row["ID"] || "";
  const followersRaw =
    row["粉丝数"] || row["followers"] || row["Followers"] || row["粉丝"] || "0";
  const engagementRaw =
    row["互动率"] || row["engagement_rate"] || row["Engagement Rate"] || row["互动率(%)"] || "0";
  const category =
    row["品类"] || row["分类"] || row["category"] || row["Category"] || row["领域"] || "未分类";
  const priceRaw =
    row["报价"] || row["价格"] || row["price"] || row["Price"] || "";

  // Parse followers: handle "328k", "1.2M", "12万" etc
  let followers = 0;
  const fStr = followersRaw.replace(/,/g, "").trim();
  if (fStr.includes("万")) followers = parseFloat(fStr) * 10000;
  else if (fStr.toLowerCase().includes("m")) followers = parseFloat(fStr) * 1000000;
  else if (fStr.toLowerCase().includes("k")) followers = parseFloat(fStr) * 1000;
  else followers = parseInt(fStr) || 0;

  // Parse engagement rate: handle "6.8%", "6.8" etc
  const engagement = parseFloat(engagementRaw.replace("%", "")) || 0;

  // Parse price range: "5000-12000", "¥5,000 - ¥12,000" etc
  let priceMin = 0;
  let priceMax = 0;
  if (priceRaw) {
    const prices = priceRaw
      .replace(/[¥￥,]/g, "")
      .split(/[-~～]/)
      .map((p) => parseFloat(p.trim()) || 0);
    priceMin = prices[0] || 0;
    priceMax = prices[1] || priceMin;
  }

  // Normalize platform names
  const platformMap: Record<string, string> = {
    "小红书": "xiaohongshu",
    "抖音": "tiktok",
    "TikTok": "tiktok",
    "tiktok": "tiktok",
    "Instagram": "instagram",
    "instagram": "instagram",
    "IG": "instagram",
    "YouTube": "independent",
    "youtube": "independent",
  };

  return {
    name,
    platform: platformMap[platform] || platform.toLowerCase() || "xiaohongshu",
    handle,
    followers: Math.round(followers),
    engagement_rate: engagement,
    category,
    price_min: priceMin,
    price_max: priceMax,
  };
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { csv_text, rows: directRows } = await request.json();

    let influencers: ReturnType<typeof normalizeInfluencer>[];

    if (csv_text) {
      const parsed = parseCSV(csv_text);
      influencers = parsed.map(normalizeInfluencer).filter((i) => i.name);
    } else if (directRows) {
      influencers = (directRows as Record<string, string>[])
        .map(normalizeInfluencer)
        .filter((i) => i.name);
    } else {
      return NextResponse.json({ error: "请提供 CSV 数据" }, { status: 400 });
    }

    if (influencers.length === 0) {
      return NextResponse.json({ error: "未找到有效的达人数据" }, { status: 400 });
    }

    // Upsert: check by name + platform
    let imported = 0;
    let skipped = 0;
    for (const inf of influencers) {
      const { data: existing } = await supabase
        .from("influencers")
        .select("id")
        .eq("name", inf.name)
        .eq("platform", inf.platform)
        .limit(1)
        .single();

      if (existing) {
        await supabase.from("influencers").update(inf).eq("id", existing.id);
        skipped++;
      } else {
        await supabase.from("influencers").insert({
          ...inf,
          status: "pending",
          ai_score: 0,
        });
        imported++;
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      updated: skipped,
      total: influencers.length,
    });
  } catch (error: unknown) {
    console.error("Import error:", error);
    const message = error instanceof Error ? error.message : "导入失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
