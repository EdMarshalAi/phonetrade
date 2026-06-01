import { headers } from "next/headers";

/**
 * Простой in-memory rate-limit по ключу (IP). Достаточен для одноинстансного
 * PM2-деплоя (порт 3000). Защищает публичные формы от спама/перебора.
 */
const hits = new Map<string, number[]>();

export async function clientIp(): Promise<string> {
  try {
    const h = await headers();
    return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  } catch {
    return "unknown";
  }
}

/** true → лимит превышен. limit запросов за windowMs на ключ. */
export function rateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(key, arr);
  // лёгкая уборка, чтобы Map не рос бесконечно
  if (hits.size > 5000) for (const [k, v] of hits) if (v.every((t) => now - t > windowMs)) hits.delete(k);
  return arr.length > limit;
}
