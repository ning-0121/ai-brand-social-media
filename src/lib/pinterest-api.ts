/**
 * Pinterest API 封装
 * 产品 Pin 自动发布、Board 管理、Shopping Ads
 * Pinterest 是美国女性运动服饰的关键发现渠道
 *
 * 需要环境变量：
 * - PINTEREST_ACCESS_TOKEN
 * - PINTEREST_BOARD_ID (默认 board)
 */

const PINTEREST_API = "https://api.pinterest.com/v5";

function getHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.PINTEREST_ACCESS_TOKEN || ""}`,
  };
}

// ─── Pin 管理 ───────────────────────────────────────────────

export async function createPin(params: {
  boardId?: string;
  title: string;
  description: string; // SEO-rich, with keywords
  link: string; // Product URL
  imageUrl: string;
  altText?: string;
}): Promise<{ id: string } | null> {
  const boardId = params.boardId || process.env.PINTEREST_BOARD_ID;
  if (!boardId) return null;

  try {
    const res = await fetch(`${PINTEREST_API}/pins`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        board_id: boardId,
        title: params.title,
        description: params.description,
        link: params.link,
        alt_text: params.altText || params.title,
        media_source: { source_type: "image_url", url: params.imageUrl },
      }),
    });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

export async function getBoards(): Promise<Array<{ id: string; name: string; pin_count: number }>> {
  try {
    const res = await fetch(`${PINTEREST_API}/boards?page_size=25`, { headers: getHeaders() });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items || []).map((b: Record<string, unknown>) => ({
      id: b.id as string,
      name: b.name as string,
      pin_count: (b.pin_count as number) || 0,
    }));
  } catch { return []; }
}

export async function getPinAnalytics(pinId: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(
      `${PINTEREST_API}/pins/${pinId}/analytics?start_date=${new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0]}&end_date=${new Date().toISOString().split("T")[0]}&metric_types=IMPRESSION,SAVE,PIN_CLICK,OUTBOUND_CLICK`,
      { headers: getHeaders() }
    );
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

// ─── 批量创建产品 Pin ───────────────────────────────────────

export async function bulkCreateProductPins(products: Array<{
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  productUrl: string;
}>): Promise<{ created: number; failed: number }> {
  let created = 0, failed = 0;

  for (const product of products) {
    const pin = await createPin({
      title: product.name,
      description: `${product.description} | $${product.price} | Shop JOJOFEIFEI | Free shipping on orders $75+`,
      link: product.productUrl,
      imageUrl: product.imageUrl,
      altText: `${product.name} - JOJOFEIFEI Activewear`,
    });
    if (pin) created++;
    else failed++;
    await new Promise(r => setTimeout(r, 500)); // Rate limit
  }

  return { created, failed };
}
