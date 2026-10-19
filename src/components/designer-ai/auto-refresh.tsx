"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Re-renders the page every few seconds, e.g. while a review is still running. */
export function AutoRefresh({ seconds = 8 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
  return null;
}
