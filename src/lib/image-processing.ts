/**
 * External image processing services.
 * All functions check for API key and throw a descriptive error if missing,
 * so the UI can surface a clear "configure API key" message.
 */

import { supabase } from "./supabase";

// ── Shared helpers ──────────────────────────────────────────────────────────

async function uploadBufferToStorage(
  buffer: ArrayBuffer,
  filename: string,
  contentType: string
): Promise<string> {
  const path = `processed/${Date.now()}-${filename}`;
  const { error } = await supabase.storage
    .from("content-media")
    .upload(path, buffer, { contentType, upsert: false });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  const { data: { publicUrl } } = supabase.storage
    .from("content-media").getPublicUrl(path);
  return publicUrl;
}

async function fetchImageAsBuffer(url: string): Promise<{ buffer: ArrayBuffer; contentType: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  const buffer = await res.arrayBuffer();
  const contentType = res.headers.get("content-type") || "image/png";
  return { buffer, contentType };
}

// ── 1. Background Removal (Photoroom API) ──────────────────────────────────

export interface BgRemoveResult {
  output_url: string;
  provider: "photoroom";
}

export async function removeBackground(imageUrl: string): Promise<BgRemoveResult> {
  const apiKey = process.env.PHOTOROOM_API_KEY;
  if (!apiKey) throw new Error("缺少 PHOTOROOM_API_KEY — 请在环境变量中配置 Photoroom API Key（https://www.photoroom.com/api）");

  const { buffer, contentType } = await fetchImageAsBuffer(imageUrl);

  const form = new FormData();
  form.append(
    "image_file",
    new Blob([buffer], { type: contentType }),
    `input.${contentType.split("/")[1] || "png"}`
  );

  const res = await fetch("https://sdk.photoroom.com/v1/segment", {
    method: "POST",
    headers: { "x-api-key": apiKey },
    body: form,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Photoroom API 失败: ${res.status} — ${err}`);
  }

  const resultBuffer = await res.arrayBuffer();
  const outputUrl = await uploadBufferToStorage(resultBuffer, `bg-removed-${Date.now()}.png`, "image/png");
  return { output_url: outputUrl, provider: "photoroom" };
}

// ── 2. Image Enhancement / Upscaling (Replicate — Real-ESRGAN) ─────────────

export interface EnhanceResult {
  output_url: string;
  scale: number;
  provider: "replicate";
}

export async function enhanceImage(imageUrl: string, scale: 2 | 4 = 4): Promise<EnhanceResult> {
  const apiKey = process.env.REPLICATE_API_KEY;
  if (!apiKey) throw new Error("缺少 REPLICATE_API_KEY — 请在环境变量中配置 Replicate API Key（https://replicate.com/account/api-tokens）");

  // Start prediction
  const startRes = await fetch("https://api.replicate.com/v1/models/nightmareai/real-esrgan/predictions", {
    method: "POST",
    headers: {
      "Authorization": `Token ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: { image: imageUrl, scale, face_enhance: false },
    }),
  });

  if (!startRes.ok) {
    const err = await startRes.text();
    throw new Error(`Replicate 启动失败: ${startRes.status} — ${err}`);
  }

  const prediction = await startRes.json() as { id: string; status: string; output?: string };

  // Poll until complete (max 120s)
  const predictionId = prediction.id;
  const deadline = Date.now() + 120_000;

  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 3000));
    const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: { "Authorization": `Token ${apiKey}` },
    });
    const poll = await pollRes.json() as { status: string; output?: string; error?: string };
    if (poll.status === "succeeded" && poll.output) {
      const { buffer } = await fetchImageAsBuffer(poll.output);
      const outputUrl = await uploadBufferToStorage(buffer, `enhanced-${scale}x-${Date.now()}.png`, "image/png");
      return { output_url: outputUrl, scale, provider: "replicate" };
    }
    if (poll.status === "failed") throw new Error(`Replicate 处理失败: ${poll.error || "unknown"}`);
  }

  throw new Error("Replicate 超时（120s）");
}

// ── 3. Product Video Generation (Shotstack API) ────────────────────────────

export interface VideoResult {
  output_url: string;
  duration_seconds: number;
  provider: "shotstack";
}

export async function generateProductVideo(
  imageUrls: string[],
  options: {
    title?: string;
    subtitle?: string;
    brand_color?: string;
    duration_per_image?: number; // seconds per image, default 3
    music_volume?: number;       // 0-1
  } = {}
): Promise<VideoResult> {
  const apiKey = process.env.SHOTSTACK_API_KEY;
  if (!apiKey) throw new Error("缺少 SHOTSTACK_API_KEY — 请在环境变量中配置 Shotstack API Key（https://shotstack.io）");

  const secPerImg = options.duration_per_image || 3;
  const brandColor = options.brand_color || "#000000";
  const totalDuration = imageUrls.length * secPerImg;

  // Build Shotstack edit timeline
  const clips = imageUrls.map((url, i) => ({
    asset: { type: "image", src: url },
    start: i * secPerImg,
    length: secPerImg,
    effect: "zoomIn",
    transition: { in: "fade", out: "fade" },
  }));

  const timeline: Record<string, unknown> = {
    background: "#000000",
    tracks: [
      { clips },
    ],
  };

  // Add title overlay if provided
  if (options.title) {
    timeline.tracks = [
      ...(timeline.tracks as unknown[]),
      {
        clips: [{
          asset: {
            type: "title",
            text: options.title,
            style: "minimal",
            color: "#ffffff",
            background: brandColor,
            size: "medium",
          },
          start: 0,
          length: secPerImg,
          position: "bottom",
        }],
      },
    ];
  }

  const editPayload = {
    timeline,
    output: {
      format: "mp4",
      resolution: "hd",
      fps: 25,
      size: { width: 1080, height: 1080 },
    },
  };

  const startRes = await fetch("https://api.shotstack.io/v1/render", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(editPayload),
  });

  if (!startRes.ok) {
    const err = await startRes.text();
    throw new Error(`Shotstack 启动失败: ${startRes.status} — ${err}`);
  }

  const { response: { id: renderId } } = await startRes.json() as { response: { id: string } };

  // Poll until done (max 3min)
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 5000));
    const pollRes = await fetch(`https://api.shotstack.io/v1/render/${renderId}`, {
      headers: { "x-api-key": apiKey },
    });
    const poll = await pollRes.json() as { response: { status: string; url?: string } };
    const s = poll.response;
    if (s.status === "done" && s.url) {
      return { output_url: s.url, duration_seconds: totalDuration, provider: "shotstack" };
    }
    if (s.status === "failed") throw new Error("Shotstack 渲染失败");
  }

  throw new Error("Shotstack 超时（3min）");
}

// ── 4. Klaviyo — push abandoned cart email sequence ───────────────────────

export interface KlaviyoFlowResult {
  pushed: boolean;
  flow_id?: string;
  message: string;
}

export async function pushToKlaviyo(payload: {
  event: "abandoned_cart" | "win_back";
  email: string;
  properties: Record<string, unknown>;
}): Promise<KlaviyoFlowResult> {
  const apiKey = process.env.KLAVIYO_API_KEY;
  if (!apiKey) {
    return {
      pushed: false,
      message: "未配置 KLAVIYO_API_KEY — 邮件文案已生成，如需自动触发 Klaviyo 流程请配置 API Key（https://klaviyo.com）",
    };
  }

  const res = await fetch("https://a.klaviyo.com/api/events/", {
    method: "POST",
    headers: {
      "Authorization": `Klaviyo-API-Key ${apiKey}`,
      "Content-Type": "application/json",
      "revision": "2024-02-15",
    },
    body: JSON.stringify({
      data: {
        type: "event",
        attributes: {
          profile: { data: { type: "profile", attributes: { email: payload.email } } },
          metric: { data: { type: "metric", attributes: { name: payload.event === "abandoned_cart" ? "Abandoned Cart" : "Win Back" } } },
          properties: payload.properties,
          time: new Date().toISOString(),
        },
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Klaviyo API 失败: ${res.status} — ${err}`);
  }

  return { pushed: true, message: "已成功推送到 Klaviyo 流程" };
}
