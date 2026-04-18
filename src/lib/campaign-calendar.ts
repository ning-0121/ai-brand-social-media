/**
 * 营销日历 — 节日/时令自动识别 + 一键批量规划
 */

import { supabase } from "./supabase";
import { composeCampaign, type CampaignSpec } from "./campaign-composer";

// 2026 年关键节日/电商大促（中国 + 国际）
const HOLIDAYS_2026: Array<{ date: string; tag: string; angle: string; offer_hint?: string; urgency_hint?: string }> = [
  { date: "2026-02-14", tag: "情人节", angle: "送礼 / 自我奖励", offer_hint: "情侣套装 8 折", urgency_hint: "2 月 14 日前" },
  { date: "2026-03-08", tag: "妇女节", angle: "赋权女性", offer_hint: "全场 9 折", urgency_hint: "3 月 8-10 日" },
  { date: "2026-03-21", tag: "春分", angle: "春季焕新" },
  { date: "2026-05-10", tag: "母亲节", angle: "感恩 / 送礼", offer_hint: "送妈妈礼品卡", urgency_hint: "5 月 10 日前" },
  { date: "2026-06-18", tag: "618 年中大促", angle: "半年巅峰特惠", offer_hint: "最高 5 折", urgency_hint: "6.18 当天" },
  { date: "2026-06-21", tag: "父亲节", angle: "爸爸送礼" },
  { date: "2026-07-04", tag: "夏季购", angle: "夏季上新" },
  { date: "2026-08-20", tag: "返校季", angle: "秋季衣橱更新" },
  { date: "2026-10-31", tag: "万圣节", angle: "节日限定" },
  { date: "2026-11-11", tag: "双11", angle: "年度最大促销", offer_hint: "全场 5 折起", urgency_hint: "11.11 当天" },
  { date: "2026-11-27", tag: "黑色星期五", angle: "年度清仓", offer_hint: "最高 7 折", urgency_hint: "11.27-30" },
  { date: "2026-11-30", tag: "网络星期一", angle: "线上专享" },
  { date: "2026-12-12", tag: "双12", angle: "年终福利" },
  { date: "2026-12-24", tag: "平安夜/圣诞", angle: "节日礼品", offer_hint: "圣诞礼包", urgency_hint: "12 月 24 日前" },
];

export interface CalendarEntry {
  id: string;
  scheduled_date: string;
  campaign_name: string;
  status: string;
  spec?: Record<string, unknown>;
  holiday_tag?: string;
  notes?: string;
  variant_id?: string;
  created_at: string;
}

export function getHolidaysInRange(startDate: string, endDate: string): typeof HOLIDAYS_2026 {
  return HOLIDAYS_2026.filter(h => h.date >= startDate && h.date <= endDate);
}

export async function listCalendar(startDate: string, endDate: string): Promise<CalendarEntry[]> {
  const { data } = await supabase.from("campaign_calendar")
    .select("*")
    .gte("scheduled_date", startDate)
    .lte("scheduled_date", endDate)
    .order("scheduled_date", { ascending: true });
  return (data || []) as CalendarEntry[];
}

export async function createCalendarEntry(entry: {
  scheduled_date: string;
  campaign_name: string;
  spec?: Partial<CampaignSpec>;
  notes?: string;
  holiday_tag?: string;
}): Promise<CalendarEntry | null> {
  const { data } = await supabase.from("campaign_calendar").insert({
    scheduled_date: entry.scheduled_date,
    campaign_name: entry.campaign_name,
    spec: entry.spec || {},
    notes: entry.notes,
    holiday_tag: entry.holiday_tag,
    status: "planned",
  }).select().single();
  return data as CalendarEntry;
}

/**
 * 批量规划：扫描未来 N 天的节日，每个节日自动建一条 planned 记录
 */
export async function autoPlanMonth(days = 60): Promise<{ created: number; skipped: number }> {
  const today = new Date().toISOString().split("T")[0];
  const end = new Date(Date.now() + days * 86400000).toISOString().split("T")[0];
  const holidays = getHolidaysInRange(today, end);

  let created = 0, skipped = 0;
  for (const h of holidays) {
    // 去重
    const { data: existing } = await supabase.from("campaign_calendar")
      .select("id").eq("scheduled_date", h.date).eq("holiday_tag", h.tag).maybeSingle();
    if (existing) { skipped++; continue; }

    await supabase.from("campaign_calendar").insert({
      scheduled_date: h.date,
      campaign_name: h.tag,
      spec: {
        name: h.tag,
        goal: "purchase",
        headline_idea: h.angle,
        offer: h.offer_hint || "",
        urgency: h.urgency_hint || "",
      },
      notes: h.angle,
      holiday_tag: h.tag,
      status: "planned",
    });
    created++;
  }

  return { created, skipped };
}

/**
 * Daily cron：扫描「今天及以前」的 planned 条目，自动 compose。
 * 限流避免耗尽 60s 预算：每次 cron 最多跑 2 条。
 */
export async function runDueCalendar(): Promise<{
  due: number;
  composed: number;
  failed: number;
  skipped: number;
  details: Array<{ id: string; name: string; status: string; error?: string }>;
}> {
  const today = new Date().toISOString().split("T")[0];
  const { data: due } = await supabase
    .from("campaign_calendar")
    .select("id, campaign_name, scheduled_date, spec")
    .eq("status", "planned")
    .lte("scheduled_date", today)
    .order("scheduled_date", { ascending: true })
    .limit(2);

  const details: Array<{ id: string; name: string; status: string; error?: string }> = [];
  let composed = 0, failed = 0, skipped = 0;

  for (const entry of due || []) {
    // 没有 spec 或没 goal 时跳过
    const spec = entry.spec as Partial<CampaignSpec>;
    if (!spec?.name || !spec?.goal) {
      skipped++;
      details.push({ id: entry.id, name: entry.campaign_name, status: "skipped", error: "spec 不完整" });
      continue;
    }

    try {
      const r = await runCalendarEntry(entry.id);
      if (r.success) {
        composed++;
        details.push({ id: entry.id, name: entry.campaign_name, status: "composed" });
      } else {
        failed++;
        details.push({ id: entry.id, name: entry.campaign_name, status: "failed", error: r.error });
      }
    } catch (err) {
      failed++;
      details.push({ id: entry.id, name: entry.campaign_name, status: "failed", error: err instanceof Error ? err.message : "unknown" });
    }
  }

  return { due: due?.length || 0, composed, failed, skipped, details };
}

/**
 * 运行日历某条：调用 composeCampaign + 回写状态
 */
export async function runCalendarEntry(entryId: string): Promise<{ success: boolean; campaign_result?: Record<string, unknown>; error?: string }> {
  const { data: entry } = await supabase.from("campaign_calendar").select("*").eq("id", entryId).single();
  if (!entry) return { success: false, error: "entry not found" };

  await supabase.from("campaign_calendar").update({ status: "composing", updated_at: new Date().toISOString() }).eq("id", entryId);

  try {
    const spec = entry.spec as CampaignSpec;
    const result = await composeCampaign(spec);
    await supabase.from("campaign_calendar").update({
      status: "ready",
      spec: { ...spec, last_result: result } as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    }).eq("id", entryId);
    return { success: true, campaign_result: result as unknown as Record<string, unknown> };
  } catch (err) {
    await supabase.from("campaign_calendar").update({
      status: "planned",
      updated_at: new Date().toISOString(),
    }).eq("id", entryId);
    return { success: false, error: err instanceof Error ? err.message : "compose failed" };
  }
}
