import { NextResponse } from "next/server";
import { testShopifyConnection } from "@/lib/shopify-operations";

export async function POST(request: Request) {
  try {
    const { domain, access_token } = await request.json();

    if (!domain || !access_token) {
      return NextResponse.json(
        { error: "请提供店铺域名和 Access Token" },
        { status: 400 }
      );
    }

    const result = await testShopifyConnection(domain, access_token);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "连接测试失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
