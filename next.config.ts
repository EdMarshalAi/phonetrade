import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  devIndicators: false,
  poweredByHeader: false, // не светим x-powered-by: Next.js
  // Базовые security-заголовки (без строгого CSP — чтобы не сломать YM/inline JSON-LD).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
        ],
      },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "fastly.picsum.photos" },
      { protocol: "https", hostname: "images.unsplash.com" },
      // Supabase Storage (изображения товаров, баннеров, блога и т.д.)
      { protocol: "https", hostname: "giwehapapi.beget.app" },
      // Превью каталога М.Видео (временные placeholder-картинки импорта)
      { protocol: "https", hostname: "img.mvideo.ru" },
    ],
  },
};

export default nextConfig;
