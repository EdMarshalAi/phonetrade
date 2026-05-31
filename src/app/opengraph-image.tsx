import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// Дефолтный og:image для всех страниц — фирменный баннер 1200×630 в палитре ink.
// Генерируется статически на сборке. Шрифт PT Sans (SIL OFL — коммерческое
// использование и встраивание разрешены; статический вес, нужен для Satori).
export const alt = "PhoneTrade — техника Apple в Белгороде";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const font = await readFile(fileURLToPath(new URL("./_og/PTSans.ttf", import.meta.url)));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#1d1d1f",
          color: "#ffffff",
          padding: "80px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: "#ffffff" }} />
          <div style={{ fontSize: 30, letterSpacing: 1, color: "#f5f5f7" }}>PhoneTrade</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 96, lineHeight: 1.05, letterSpacing: -2 }}>Техника Apple</div>
          <div style={{ fontSize: 96, lineHeight: 1.05, letterSpacing: -2, color: "#a1a1a6" }}>в Белгороде</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 30, color: "#f5f5f7" }}>ул. Попова, 36 · самовывоз и доставка по городу</div>
          <div style={{ fontSize: 26, color: "#a1a1a6" }}>Гарантия · Trade-in · рассрочка и кредит</div>
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "PT Sans", data: font, style: "normal", weight: 400 }] }
  );
}
