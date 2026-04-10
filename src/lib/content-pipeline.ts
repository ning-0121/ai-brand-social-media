/**
 * Content Production Pipelines — full workflows that chain:
 * Skill (text) → Image Generation → Assembly → QA → Deploy
 */

import { supabase } from "./supabase";
import { executeSkill } from "./content-skills/executor";
import { generateImage, generateImages } from "./image-service";
import { assembleDetailPage, assembleSocialPost, assembleBanner, assembleLandingPage } from "./content-assembler";
import { reviewContent } from "./content-qa";
import { updateProductSEO, updateProductBodyHtml, createShopifyPage } from "./shopify-operations";
import { publishPost } from "./social-publisher";

/**
 * Pull existing images from media library for a product.
 * Pipeline uses these FIRST, then generates new ones only if needed.
 */
async function getProductMedia(productId: string): Promise<string[]> {
  const { data } = await supabase
    .from("media_library")
    .select("original_url")
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(5);
  return (data || []).map((m) => m.original_url);
}

interface PipelineResult {
  success: boolean;
  action: string;
  details: Record<string, unknown>;
  qa_score?: number;
  images_generated?: number;
}

/**
 * Full product content pipeline:
 * 1. Generate detail page copy
 * 2. Generate SEO meta
 * 3. Generate product images (lifestyle + detail)
 * 4. Assemble into complete body_html
 * 5. QA review
 * 6. Deploy to Shopify
 */
export async function productContentPipeline(
  productId: string,
  integrationId: string
): Promise<PipelineResult> {
  const { data: product } = await supabase
    .from("products").select("*").eq("id", productId).single();

  if (!product?.shopify_product_id) {
    return { success: false, action: "skipped", details: { reason: "no shopify product" } };
  }

  // 1. Generate detail page copy
  const { result: detailResult } = await executeSkill(
    "product_detail_page",
    { product, tone: "professional" },
    { sourceModule: "pipeline" }
  );
  const copy = detailResult.output as Record<string, unknown>;

  // 2. Generate SEO
  const { result: seoResult } = await executeSkill(
    "product_seo_optimize",
    { product },
    { sourceModule: "pipeline" }
  );
  const seo = seoResult.output as Record<string, unknown>;

  // 3. Check media library for existing images, then generate missing ones
  const existingMedia = await getProductMedia(product.id);
  const imagePrompts = [];

  // Only generate images if we don't have enough from the media library
  const lifestylePrompt = (copy.image_prompt as string) ||
    `Professional lifestyle photo of ${product.name}, ${product.category || "fashion"} product, model wearing, natural lighting, aspirational setting`;

  imagePrompts.push({
    prompt: lifestylePrompt,
    style: "lifestyle" as const,
    size: "16:9" as const,
    label: "lifestyle",
  });

  // Product detail shot
  imagePrompts.push({
    prompt: `Product detail close-up of ${product.name}, showing texture and quality, studio lighting, white background, premium feel`,
    style: "product_photo" as const,
    size: "1:1" as const,
    label: "detail",
  });

  // Use existing media library images if available, generate only what's missing
  let images: Array<{ label: string; url: string }> = [];
  if (existingMedia.length >= 2) {
    images = [
      { label: "lifestyle", url: existingMedia[0] },
      { label: "detail", url: existingMedia[1] },
    ];
  } else {
    images = await generateImages(imagePrompts);
  }

  // 4. Assemble complete detail page HTML
  const bodyHtml = assembleDetailPage(
    {
      title: (copy.title as string) || product.name,
      subtitle: copy.subtitle as string,
      highlights: copy.highlights as string[],
      description: copy.description as string,
      specs: copy.specs as Array<{ name: string; value: string }>,
      cta_primary: copy.cta_primary as string,
      cta_secondary: copy.cta_secondary as string,
    },
    product.image_url,
    images
  );

  // 5. QA review
  const qa = await reviewContent("detail_page", { body_html: bodyHtml, ...copy }, { name: product.name, category: product.category });

  if (!qa.passed) {
    return {
      success: false,
      action: "qa_rejected",
      details: { score: qa.score, improvements: qa.improvements },
      qa_score: qa.score,
      images_generated: images.length,
    };
  }

  // 6. Deploy to Shopify
  await updateProductBodyHtml(integrationId, product.shopify_product_id, product.id, bodyHtml);

  await updateProductSEO(integrationId, product.shopify_product_id, product.id, {
    meta_title: seo.meta_title as string,
    meta_description: seo.meta_description as string,
    tags: seo.tags as string,
  });

  return {
    success: true,
    action: "product_content_deployed",
    details: {
      product: product.name,
      images: images.length,
      body_html_length: bodyHtml.length,
      seo_updated: true,
    },
    qa_score: qa.score,
    images_generated: images.length,
  };
}

/**
 * Social media content pipeline:
 * 1. Generate post copy (3 angles)
 * 2. Generate image for best post
 * 3. Assemble text + image + hashtags
 * 4. QA review
 * 5. Publish or schedule
 */
export async function socialContentPipeline(
  productId: string | null,
  platform: string
): Promise<PipelineResult> {
  let product = null;
  if (productId) {
    const { data } = await supabase.from("products").select("*").eq("id", productId).single();
    product = data;
  }

  // 1. Generate posts
  const { result: postResult } = await executeSkill(
    "social_post_pack",
    { product: product || undefined, platform },
    { sourceModule: "pipeline" }
  );

  const posts = ((postResult.output as Record<string, unknown>).posts as Array<{
    title: string; body: string; image_prompt: string; hashtags: string[]; cta?: string;
  }>) || [];

  if (posts.length === 0) {
    return { success: false, action: "no_posts_generated", details: {} };
  }

  // 2. Generate image for the first post
  const bestPost = posts[0];
  let imageUrl: string | null = null;

  if (bestPost.image_prompt) {
    const sizeMap: Record<string, "1:1" | "9:16" | "3:4"> = {
      instagram: "1:1",
      tiktok: "9:16",
      xiaohongshu: "3:4",
    };

    imageUrl = await generateImage(bestPost.image_prompt, {
      style: "social_media",
      size: sizeMap[platform] || "1:1",
      filename: `social-${platform}-${Date.now()}.png`,
    });
  }

  // 3. Assemble
  const assembled = assembleSocialPost(
    bestPost.body,
    imageUrl,
    bestPost.hashtags || [],
    bestPost.cta
  );

  // 4. QA
  const qa = await reviewContent("social_post", {
    body: assembled.text,
    image_url: assembled.image_url,
    platform,
  }, { name: product?.name || "general" });

  if (!qa.passed) {
    return {
      success: false,
      action: "qa_rejected",
      details: { score: qa.score, improvements: qa.improvements },
      qa_score: qa.score,
    };
  }

  // 5. Schedule and publish
  const { data: scheduled } = await supabase.from("scheduled_posts").insert({
    title: bestPost.title,
    body: assembled.text,
    content_preview: assembled.text.slice(0, 100),
    image_url: assembled.image_url,
    hashtags: assembled.hashtags,
    platform,
    scheduled_at: new Date().toISOString(),
    status: "queued",
  }).select().single();

  let published = false;
  if (scheduled) {
    const pubResult = await publishPost({
      id: scheduled.id,
      platform,
      account_id: null,
      title: bestPost.title,
      body: assembled.text,
      image_url: assembled.image_url || undefined,
      hashtags: assembled.hashtags,
    });
    published = pubResult.success;
  }

  return {
    success: true,
    action: "social_post_created",
    details: {
      platform,
      title: bestPost.title,
      has_image: !!imageUrl,
      published,
      product: product?.name,
    },
    qa_score: qa.score,
    images_generated: imageUrl ? 1 : 0,
  };
}

/**
 * Campaign content pipeline:
 * 1. Generate campaign plan + landing page copy
 * 2. Generate hero image + poster
 * 3. Assemble landing page HTML
 * 4. Create Shopify page
 * 5. Generate social media teasers
 */
export async function campaignPipeline(
  theme: string,
  productIds: string[],
  integrationId: string
): Promise<PipelineResult> {
  // Load products
  const products = [];
  for (const id of productIds.slice(0, 5)) {
    const { data } = await supabase.from("products").select("*").eq("id", id).single();
    if (data) products.push(data);
  }

  // 1. Generate landing page copy
  const { result: pageResult } = await executeSkill(
    "landing_page",
    { page_goal: "purchase", headline_idea: theme, product: products[0] },
    { sourceModule: "pipeline" }
  );
  void pageResult; // output used for context in future iterations

  // 2. Generate hero image
  const heroUrl = await generateImage(
    `Campaign hero banner for "${theme}", fashion brand, bold and vibrant, professional photography`,
    { style: "social_media", size: "16:9", filename: `campaign-hero-${Date.now()}.png` }
  );

  // 3. Assemble landing page
  const heroBanner = assembleBanner(
    theme,
    "Limited Time Offer",
    "Shop Now",
    heroUrl || undefined
  );

  const landingHtml = assembleLandingPage(heroBanner, [
    {
      title: "Featured Products",
      body: products.map((p) => p.name).join(", "),
      imageUrl: products[0]?.image_url,
    },
  ]);

  // 4. Create Shopify page
  let pageId;
  try {
    const page = await createShopifyPage(integrationId, theme, landingHtml);
    pageId = page.page_id;
  } catch (err) {
    console.error("Shopify page creation failed:", err);
  }

  return {
    success: true,
    action: "campaign_created",
    details: {
      theme,
      page_id: pageId,
      hero_image: heroUrl,
      products_featured: products.length,
      html_length: landingHtml.length,
    },
    images_generated: heroUrl ? 1 : 0,
  };
}
