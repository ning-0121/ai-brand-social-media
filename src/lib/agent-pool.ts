/**
 * Agent Pool — 并行任务执行器
 * 通过 fanning out 到多个 agent-worker API，突破单函数 60s 限制
 *
 * 传统方式：1 个 cron → 1 个 60s 函数 → 串行执行 3-5 个任务
 * 新方式：1 个 cron → 并行 N 个 60s 函数 → 每个跑 1-4 个任务
 *          相当于 N * 60s = 5x 吞吐量
 */

import { supabase } from "./supabase";

interface PoolResult {
  dispatched: number;
  succeeded: number;
  failed: number;
  skipped: number;
  details: Array<{ batch: number; status: string; processed?: number; error?: string }>;
}

// 每种 task 的耗时预估（秒），用于决定一个 worker 可以塞几个
const TASK_SECONDS: Record<string, number> = {
  seo_fix: 15,
  detail_page: 25,
  post: 30,
  engage: 8,
  hashtag_strategy: 8,
  content_calendar: 10,
  short_video_script: 10,
  landing_page: 30,
  homepage_update: 20,
  new_product_content: 35,
};

function estimateDuration(taskType: string): number {
  return TASK_SECONDS[taskType] || 20;
}

/**
 * 把 tasks 按耗时打包成多个 worker batch（每个 batch 不超过 55 秒）
 */
function packTasksIntoBatches(
  tasks: Array<{ id: string; task_type: string }>,
  maxBatchSeconds = 55,
  maxBatches = 5
): string[][] {
  const batches: string[][] = [];
  let currentBatch: string[] = [];
  let currentSeconds = 0;

  for (const task of tasks) {
    const duration = estimateDuration(task.task_type);
    if (currentSeconds + duration > maxBatchSeconds && currentBatch.length > 0) {
      batches.push(currentBatch);
      if (batches.length >= maxBatches) break;
      currentBatch = [];
      currentSeconds = 0;
    }
    currentBatch.push(task.id);
    currentSeconds += duration;
  }
  if (currentBatch.length > 0 && batches.length < maxBatches) {
    batches.push(currentBatch);
  }

  return batches;
}

function getWorkerBaseUrl(): string {
  // Vercel 生产环境用 VERCEL_URL，本地用 APP_URL
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

/**
 * 并行执行任务池
 * 自动：拉取 pending 任务 → 打包 → 并发调用 workers → 汇总
 */
export async function executeAgentPool(maxTasks = 20): Promise<PoolResult> {
  // 重置卡住的 running 任务
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  await supabase
    .from("ops_daily_tasks")
    .update({ execution_status: "pending", updated_at: new Date().toISOString() })
    .eq("execution_status", "running")
    .lt("updated_at", fiveMinAgo);

  // 拉取 pending 任务
  const { data: tasks } = await supabase
    .from("ops_daily_tasks")
    .select("id, task_type")
    .eq("execution_status", "pending")
    .eq("auto_executable", true)
    .order("task_date", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(maxTasks);

  if (!tasks || tasks.length === 0) {
    return { dispatched: 0, succeeded: 0, failed: 0, skipped: 0, details: [] };
  }

  // 打包成 5 个并行 batch
  const batches = packTasksIntoBatches(tasks, 55, 5);
  const baseUrl = getWorkerBaseUrl();
  const cronSecret = process.env.CRON_SECRET || "";

  // 并行调用所有 workers
  const workerPromises = batches.map(async (batch, idx) => {
    try {
      const res = await fetch(`${baseUrl}/api/agent-worker`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cronSecret}`,
        },
        body: JSON.stringify({ task_ids: batch }),
      });
      if (!res.ok) {
        const text = await res.text();
        return { batch: idx, status: "failed", error: `HTTP ${res.status}: ${text.slice(0, 100)}` };
      }
      const data = await res.json();
      return { batch: idx, status: "success", processed: data.processed, results: data.results };
    } catch (err) {
      return { batch: idx, status: "failed", error: err instanceof Error ? err.message : "fetch 失败" };
    }
  });

  const results = await Promise.allSettled(workerPromises);

  let succeeded = 0, failed = 0, skipped = 0;
  const details: PoolResult["details"] = [];

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "fulfilled") {
      const value = r.value;
      details.push({ batch: value.batch, status: value.status, processed: value.processed, error: value.error });
      if (value.status === "success" && value.results) {
        for (const taskResult of value.results) {
          if (taskResult.status === "success") succeeded++;
          else if (taskResult.status === "failed") failed++;
          else skipped++;
        }
      } else {
        failed += batches[i].length;
      }
    } else {
      details.push({ batch: i, status: "rejected", error: String(r.reason).slice(0, 100) });
      failed += batches[i].length;
    }
  }

  return {
    dispatched: tasks.length,
    succeeded,
    failed,
    skipped,
    details,
  };
}
