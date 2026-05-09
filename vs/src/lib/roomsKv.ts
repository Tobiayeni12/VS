type UpstashResponse<T> = {
  result?: T;
  error?: string;
};

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

function isUpstashConfigured(): boolean {
  return Boolean(UPSTASH_URL && UPSTASH_TOKEN);
}

async function upstashCommand<T>(command: unknown[]): Promise<T | null> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return null;
  const res = await fetch(UPSTASH_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ command }),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as UpstashResponse<T>;
  if (!res.ok) return null;
  if (data.error) return null;
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
  const raw = JSON.stringify(value);
  const ok = await upstashCommand<"OK">([
    "SET",
    key,
    raw,
    "EX",
    String(Math.max(60, ttlSeconds)),
  ]);
  return ok === "OK";
}

const KV_RETRY_DELAYS_MS = [0, 80, 220];

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

/** SET with retries — first request after cold start occasionally fails transiently on Upstash/network. */
export async function kvSetJsonReliable(
  key: string,
  value: unknown,
  ttlSeconds: number
): Promise<boolean> {
  for (let i = 0; i < KV_RETRY_DELAYS_MS.length; i++) {
    await sleep(KV_RETRY_DELAYS_MS[i] ?? 0);
    if (await kvSetJson(key, value, ttlSeconds)) return true;
  }
  return false;
}

/** GET with retries for the same transient failure window. */
export async function kvGetJsonReliable<T>(key: string): Promise<T | null> {
  for (let i = 0; i < KV_RETRY_DELAYS_MS.length; i++) {
    await sleep(KV_RETRY_DELAYS_MS[i] ?? 0);
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

