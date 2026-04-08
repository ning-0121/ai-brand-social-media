import { NextResponse } from "next/server";
import { getWhatsappConfig } from "@/lib/whatsapp/types";
import { handleWebhookPayload } from "@/lib/whatsapp/handler";
import { verifyWebhookSignature } from "@/lib/whatsapp/client";

// GET: Webhook verification (Meta sends this when you set up the webhook)
export async function GET(request: Request) {
  const cfg = getWhatsappConfig();
  if (!cfg) {
    return NextResponse.json(
      { error: "WhatsApp not configured. Set WHATSAPP_* env vars in Vercel." },
      { status: 503 }
    );
  }

  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === cfg.webhookVerifyToken && challenge) {
    return new Response(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

// POST: Receive webhook events
export async function POST(request: Request) {
  const cfg = getWhatsappConfig();
  if (!cfg) {
    return NextResponse.json(
      { error: "WhatsApp not configured" },
      { status: 503 }
    );
  }

  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-hub-signature-256");

    // Verify signature
    if (!verifyWebhookSignature(rawBody, signature)) {
      console.warn("WhatsApp webhook signature verification failed");
      // Still return 200 to avoid Meta retries, but log
      return NextResponse.json({ status: "invalid_signature" });
    }

    const payload = JSON.parse(rawBody);

    if (payload.object !== "whatsapp_business_account") {
      return NextResponse.json({ status: "ignored" });
    }

    // Handle async (Meta requires fast 200 response)
    handleWebhookPayload(payload).catch((err) =>
      console.error("WhatsApp handler error:", err)
    );

    return NextResponse.json({ status: "received" });
  } catch (err) {
    console.error("WhatsApp webhook error:", err);
    return NextResponse.json({ status: "error" });
  }
}
