import { publicUrl } from "@/lib/storage";

/** Public URL of an image in the portfolio bucket (reviews and portfolio pieces live there). */
export function portfolioImage(path: string | null | undefined) {
  return publicUrl("portfolio", path) ?? "";
}

export type ReviewImageContext = { title?: string; brief?: string; role?: string; outcome?: string };

/** ai_reviews.context shape written by /designer/analysis/new. */
export interface ReviewContext {
  images?: ReviewImageContext[];
  note?: string;
  own_work?: boolean;
}
