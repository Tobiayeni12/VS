type UpstashResponse<T> = {
  result?: T;
  error?: string;
};

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

/** Upstash REST can spike on cold start; allow generous wall time per attempt. */
const UPSTASH_FETCH_TIMEOUT_MS = 15_000;

function isUpstashConfigured(): boolean {
  return Boolean(UPSTASH_URL && UPSTASH_TOKEN);
}

function logKvFailure(context: string, detail: string) {
  console.warn(`[vs roomsKv] ${context}: ${detail}`);
}

async function upstashCommand<T>(command: unknown[]): Promise<T | null> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return null;

  let res: Response;
  try {
    res = await fetch(UPSTASH_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ command }),
      cache: "no-store",
      signal: AbortSignal.timeout(UPSTASH_FETCH_TIMEOUT_MS),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logKvFailure("fetch", msg);
    return null;
  }

  const rawText = await res.text().catch(() => "");
  let data: UpstashResponse<T> = {};
  try {
    data = rawText ? (JSON.parse(rawText) as UpstashResponse<T>) : {};
  } catch {
    logKvFailure("parse", `HTTP ${res.status} body=${rawText.slice(0, 200)}`);
    return null;
  }

  if (!res.ok) {
    logKvFailure(
      "http",
      `status=${res.status} upstash=${data.error ?? "(none)"} body=${rawText.slice(0, 200)}`
    );
    return null;
  }
  if (data.error) {
    logKvFailure("upstash", data.error);
    return null;
  }
  return (data.result ?? null) as T | null;
}

export function kvEnabled(): boolean {
  return isUpstashConfigured();
}

export async function kvGetJson<T>(key: string): Promise<T | null> {
  if (!isUpstashConfigured()) return null;
  const raw = await upstashCommand<string>(["GET", key]);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function kvSetJson(key: string, value: unknown, ttlSeconds: number) {
  if (!isUpstashConfigured()) return false;
  let raw: string;
  try {
    raw = JSON.stringify(value);
  } catch (err) {
    logKvFailure("stringify", err instanceof Error ? err.message : String(err));
    return false;
  }
  const ok = await upstashCommand<"OK">([
    "SET",
    key,
    raw,
    "EX",
    String(Math.max(60, ttlSeconds)),
  ]);
  return ok === "OK";
}

/** More rounds + backoff than GET — SET is the critical path for room persistence. */
const KV_SET_RETRY_DELAYS_MS = [0, 100, 250, 500, 800, 1200, 2000];
const KV_GET_RETRY_DELAYS_MS = [0, 80, 220, 400];

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

/** SET with retries — cold start, 429, and brief Upstash/network errors. */
export async function kvSetJsonReliable(
  key: string,
  value: unknown,
  ttlSeconds: number
): Promise<boolean> {
  for (let i = 0; i < KV_SET_RETRY_DELAYS_MS.length; i++) {
    await sleep(KV_SET_RETRY_DELAYS_MS[i] ?? 0);
    if (await kvSetJson(key, value, ttlSeconds)) return true;
  }
  logKvFailure(
    "kvSetJsonReliable",
    `all ${KV_SET_RETRY_DELAYS_MS.length} attempts failed for key=${key}`
  );
  return false;
}

/** GET with retries for the same transient failure window. */
export async function kvGetJsonReliable<T>(key: string): Promise<T | null> {
  for (let i = 0; i < KV_GET_RETRY_DELAYS_MS.length; i++) {
    await sleep(KV_GET_RETRY_DELAYS_MS[i] ?? 0);
    const v = await kvGetJson<T>(key);
    if (v) return v;
  }
  return null;
}

export async function kvDel(key: string) {
  if (!isUpstashConfigured()) return false;
  const n = await upstashCommand<number>(["DEL", key]);
  return typeof n === "number" && n > 0;
}
