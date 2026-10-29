import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* 개발 중 좌하단 Next.js "N" 배지 — 설정 톱니와 헷갈려서 끔 */
  devIndicators: false,
  /* 초안 배포: Cache Components 엄격 검증으로 build가 막혀 일시 비활성 */
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
