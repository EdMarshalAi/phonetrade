import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  devIndicators: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "fastly.picsum.photos" },
      { protocol: "https", hostname: "images.unsplash.com" },
      // Supabase Storage (изображения товаров, баннеров, блога и т.д.)
      { protocol: "https", hostname: "giwehapapi.beget.app" },
    ],
  },
};

export default nextConfig;
