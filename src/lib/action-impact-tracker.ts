/**
 * Action Impact Tracker
 *
 * Records before/after metrics for AI operations to measure ROI.
 * - At action time: capture before_metrics + create record
 * - 7 days later (via daily cron): capture after_metrics + calculate impact
 */

import { supabase } from "./supabase";

interface BeforeMetrics {
  seo_score?: number;
  price?: number;
  stock?: number;
  daily_revenue?: number;
  daily_orders?: number;
  [key: string]: unknown;
}

/**
 * Record an action's before-state. Called when an AI action is executed.
 * Returns the impact record ID for later measurement.
 */
export async function recordActionBefore(params: {
  auditLogId: string | null;
  actionType: string;
  targetType: string;
  targetId: string;
  beforeMetrics: BeforeMetrics;
}): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("action_impacts")
      .insert({
        audit_log_id: params.auditLogId,
        action_type: params.actionType,
        target_type: params.targetType,
        target_id: params.targetId,
        before_metrics: params.beforeMetrics,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[impact-tracker] Insert error:", error.message);
      return null;
    }
    return data?.id || null;
  } catch {
    return null;
  }
}

/**
 * Capture before-metrics for a product (SEO score, price, stock).
 * Call this before executing an SEO fix or product update.
 */
export async function captureProductBefore(
  productId: string
): Promise<BeforeMetrics> {
  const { data } = await supabase
    .from("products")
    .select("seo_score, price, stock")
    .eq("id", productId)
    .single();

  if (!data) return {};
  return {
    seo_score: data.seo_score || 0,
    price: data.price || 0,
    stock: data.stock || 0,
  };
}

/**
 * Measure after-metrics for unmeasured impacts older than 7 days.
 * Called by the daily cron to close the feedback loop.
 */
export async function measurePendingImpacts(): Promise<{
  measured: number;
  errors: number;
}> {
  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000
  ).toISOString();

  // Find impacts that haven't been measured yet and are at least 7 days old
  const { data: pending } = await supabase
    .from("action_impacts")
    .select("id, action_type, target_type, target_id, before_metrics")
    .is("measured_at", null)
    .lt("created_at", sevenDaysAgo)
    .limit(20);

  if (!pending || pending.length === 0) {
    return { measured: 0, errors: 0 };
  }

  let measured = 0;
  let errors = 0;

  for (const impact of pending) {
    try {
      const afterMetrics = await captureCurrentMetrics(
        impact.target_type,
        impact.target_id
      );

      const impactScore = calculateImpactScore(
        impact.before_metrics as BeforeMetrics,
        afterMetrics
      );

      const revenueImpact = estimateRevenueImpact(
        impact.before_metrics as BeforeMetrics,
        afterMetrics,
        impact.action_type
      );

      await supabase
        .from("action_impacts")
        .update({
          after_metrics: afterMetrics,
          impact_score: impactScore,
          revenue_impact: revenueImpact,
          measured_at: new Date().toISOString(),
        })
        .eq("id", impact.id);

      measured++;
    } catch {
      errors++;
    }
  }

  return { measured, errors };
}

/**
 * Capture current metrics for a target entity.
 */
async function captureCurrentMetrics(
  targetType: string,
  targetId: string
): Promise<BeforeMetrics> {
  switch (targetType) {
    case "product": {
      const { data } = await supabase
        .from("products")
        .select("seo_score, price, stock")
        .eq("id", targetId)
        .single();
      return data
        ? { seo_score: data.seo_score, price: data.price, stock: data.stock }
        : {};
    }
    default:
      return {};
  }
}

/**
 * Calculate normalized impact score (0-100).
 */
function calculateImpactScore(
  before: BeforeMetrics,
  after: BeforeMetrics
): number {
  let score = 50; // neutral baseline

  // SEO improvement
  if (before.seo_score !== undefined && after.seo_score !== undefined) {
    const seoChange = (after.seo_score as number) - (before.seo_score as number);
    score += Math.min(seoChange, 30); // cap at +30 points from SEO
  }

  // Revenue improvement
  if (before.daily_revenue !== undefined && after.daily_revenue !== undefined) {
    const revChange =
      ((after.daily_revenue as number) - (before.daily_revenue as number)) /
      Math.max(before.daily_revenue as number, 1);
    score += Math.min(revChange * 20, 20); // cap at +20 from revenue
  }

  return Math.max(0, Math.min(100, Math.round(score * 100) / 100));
}

/**
 * Estimate revenue impact of an action.
 */
function estimateRevenueImpact(
  before: BeforeMetrics,
  after: BeforeMetrics,
  actionType: string
): number {
  // For SEO fixes: estimate traffic increase → conversion → revenue
  if (actionType.includes("seo") && before.seo_score !== undefined && after.seo_score !== undefined) {
    const scoreDelta = (after.seo_score as number) - (before.seo_score as number);
    if (scoreDelta > 0) {
      // Rough estimate: +10 SEO points ≈ +5% organic traffic ≈ $50/month for avg product
      return Math.round(scoreDelta * 5 * 100) / 100;
    }
  }

  return 0;
}

/**
 * Get recent action impacts for display.
 */
export async function getActionImpacts(
  limit = 20,
  offset = 0
): Promise<{ impacts: unknown[]; total: number }> {
  const { data, error } = await supabase
    .from("action_impacts")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return { impacts: data || [], total: data?.length || 0 };
}
