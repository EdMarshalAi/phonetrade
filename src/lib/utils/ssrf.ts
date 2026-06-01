import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/** Приватный/служебный IPv4/IPv6 (loopback, private, link-local incl. 169.254.169.254, ULA, CGNAT). */
function isPrivateIp(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) {
    const p = ip.split(".").map(Number);
    if (p.length !== 4 || p.some((n) => Number.isNaN(n))) return true;
    const [a, b] = p;
    if (a === 10) return true;                       // 10/8
    if (a === 127) return true;                      // loopback
    if (a === 0) return true;                        // 0/8
    if (a === 169 && b === 254) return true;         // link-local (метаданные облака)
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16/12
    if (a === 192 && b === 168) return true;         // 192.168/16
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64/10
    if (a >= 224) return true;                       // multicast/reserved
    return false;
  }
  if (v === 6) {
    const l = ip.toLowerCase();
    if (l === "::1" || l === "::") return true;       // loopback
    if (l.startsWith("fe80")) return true;            // link-local
    if (l.startsWith("fc") || l.startsWith("fd")) return true; // ULA fc00::/7
    const m = l.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/); // IPv4-mapped
    if (m) return isPrivateIp(m[1]);
    return false;
  }
  return true; // не IP — на всякий случай считаем небезопасным
}

/**
 * Защита от SSRF: резолвит хост и запрещает приватные/служебные адреса.
 * Возвращает текст ошибки или null, если адрес безопасен (публичный).
 */
export async function assertPublicHost(hostname: string): Promise<string | null> {
  const h = (hostname || "").toLowerCase().replace(/^\[|\]$/g, "");
  if (!h || h === "localhost" || h.endsWith(".local") || h.endsWith(".internal") || h.endsWith(".localhost")) {
    return "Ссылка на внутренний адрес запрещена";
  }
  if (isIP(h) && isPrivateIp(h)) return "Ссылка на внутренний адрес запрещена";
  try {
    const records = await lookup(h, { all: true });
    if (records.some((r) => isPrivateIp(r.address))) return "Ссылка ведёт на внутренний адрес";
  } catch {
    return "Не удалось разрешить адрес ссылки";
  }
  return null;
}
