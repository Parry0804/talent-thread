/** ISO timestamp for `days` days ago. */
export function daysAgoISO(days: number) {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

/** 1-based week number since `iso` (week 1 is the first 7 days). */
export function weekSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (7 * 86_400_000)) + 1;
}
