"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type RefreshableAnalysisStatus = "queued" | "running" | "completed" | "failed" | "invalidated";

export function shouldRefreshAnalysis(status: RefreshableAnalysisStatus): boolean {
  return status === "queued" || status === "running";
}

export function AnalysisAutoRefresh({ status }: { status: RefreshableAnalysisStatus }) {
  const router = useRouter();

  useEffect(() => {
    if (!shouldRefreshAnalysis(status)) {
      return;
    }

    const refreshInterval = window.setInterval(() => router.refresh(), 2_000);
    return () => window.clearInterval(refreshInterval);
  }, [router, status]);

  return null;
}
