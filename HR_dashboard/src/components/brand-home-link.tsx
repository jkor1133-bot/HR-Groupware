"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * ⚠️ CI 고정 — 수정 금지
 *
 * 공식 락업 이미지(public/dh-ci-header.png)만 사용합니다.
 * - 심볼(곰) + 워드마크(대한싸이로)
 * - clear space: 상·좌·우 0.15Y / 하 0.2Y (이미지에 포함)
 * - 헤더에 막대(|) · Human Resources 등 부가 문구 금지
 *
 * 비율/간격이 필요하면 CSS로 분해하지 말고 디자인팀에 락업 재요청.
 */
export function BrandHomeLink({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      title="홈으로"
      aria-label="홈으로 · 대한싸이로 인사 그룹웨어"
      className="inline-flex min-w-0 items-center"
    >
      <Image
        src="/dh-ci-header.png"
        alt="대한싸이로"
        width={801}
        height={261}
        className={cn(
          "w-auto max-w-none shrink-0 object-contain object-left",
          compact ? "h-8" : "h-9 sm:h-10",
        )}
        priority
      />
    </Link>
  );
}
