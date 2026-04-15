import { generateProductFeed } from "@/lib/google-shopping-feed";

// 公开 API — Google Merchant Center 需要无需认证即可访问
export async function GET() {
  try {
    const xml = await generateProductFeed();
    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600", // 缓存 1 小时
      },
    });
  } catch (err) {
    return new Response(`<error>${err instanceof Error ? err.message : "Feed generation failed"}</error>`, {
      status: 500,
      headers: { "Content-Type": "application/xml" },
    });
  }
}
