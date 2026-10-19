// The AI portfolio review rubric (PRD §7.1, refined by
// /mnt/project-files/research/ai-review-output-research.md). Shared by server and UI.
// The model rates small checks 0–4; code turns them into dimension and overall
// scores. Bump RUBRIC_VERSION whenever checks, anchors, weights or the prompt change.
export const RUBRIC_VERSION = "2026-10-v2";

export const TRACKS = ["Brand & identity", "Packaging", "Social & marketing", "Illustration", "UI", "UX & product", "Motion"] as const;
export type Track = (typeof TRACKS)[number];

export const DIMENSIONS = [
  {
    key: "visual",
    name: "Visual quality & aesthetics",
    weight: 0.25,
    checks: [
      { key: "hierarchy", name: "Hierarchy", desc: "a clear focal point and reading order in each piece" },
      { key: "typography", name: "Typography", desc: "type choice, pairing and setting, including Indic scripts on their own terms" },
      { key: "colour", name: "Colour", desc: "intentional palette that serves the brand and audience" },
      { key: "craft", name: "Craft polish", desc: "alignment, spacing, export quality, production-readiness" },
    ],
    anchors: {
      30: "Unclear focal point; clashing type or colour; misaligned elements; low-resolution exports.",
      50: "Readable and tidy but template-like; hierarchy works only in places; little personal style.",
      70: "Consistent grid and type system; clear hierarchy; only minor polish issues.",
      85: "Confident, recognisable style; precise detailing; strong type pairing (Latin and Indic); fits its audience.",
      95: "Agency-leading craft; every piece production-ready; distinctive without imitating.",
    },
  },
  {
    key: "range",
    name: "Skill range & tool diversity",
    weight: 0.2,
    checks: [
      { key: "formats", name: "Range of formats", desc: "how many distinct deliverable types are shown" },
      { key: "track_depth", name: "Depth in main track", desc: "how deep the work goes within the designer's main track" },
      { key: "systems", name: "Systems & tools", desc: "evidence of systems thinking (guidelines, components) and tool/media range" },
    ],
    anchors: {
      30: "One format repeated, such as only social posts.",
      50: "Two or three formats; competent in one.",
      70: "Clear depth in the main track plus one related skill.",
      85: "Several formats at the same high standard; systems thinking visible.",
      95: "Deep specialist with added motion, 3D or prototyping skills.",
    },
  },
  {
    key: "depth",
    name: "Project depth & case studies",
    weight: 0.3,
    checks: [
      { key: "problem", name: "Problem stated", desc: "the brief or problem is visible in the images or the designer's context" },
      { key: "process", name: "Process shown", desc: "sketches, explorations, wireframes or iterations are shown" },
      { key: "decisions", name: "Decisions explained", desc: "why the final direction was chosen" },
      { key: "outcome", name: "Outcome shown", desc: "a result: launch, metric, client quote or real-world use" },
    ],
    anchors: {
      30: "Final images only; no brief, role or reasoning.",
      50: "Brief or role stated for some projects; process mostly missing.",
      70: "Most projects show brief, role, a few explorations and the final; reasoning partial.",
      85: "Clear story per project: constraints, options, why this one, and a result.",
      95: "Case studies a hiring manager would forward: measurable outcomes, trade-offs, learnings.",
    },
  },
  {
    key: "market",
    name: "Market fit & client relevance",
    weight: 0.25,
    checks: [
      { key: "segment", name: "Segment fit", desc: "serves live Indian buyer segments (D2C, fintech, SaaS, edtech, F&B, real estate, creators)" },
      { key: "realism", name: "Real-client realism", desc: "realistic briefs and deliverables rather than concept or fan work" },
      { key: "positioning", name: "Positioning clarity", desc: "a client can tell in seconds what this designer is for" },
    ],
    anchors: {
      30: "Mostly concept or fan work; no clear buyer or focus.",
      50: "Some realistic briefs but no obvious target segment.",
      70: "Clearly serves at least one live segment with realistic deliverables.",
      85: "Sharp positioning; shipped or client work; formats buyers need.",
      95: "Clearly premium for its segment; ready for higher price points.",
    },
  },
] as const;

export type DimensionKey = (typeof DIMENSIONS)[number]["key"];

export const BANDS = [
  { name: "Exceptional", min: 85 },
  { name: "Strong", min: 70 },
  { name: "Developing", min: 50 },
  { name: "Emerging", min: 0 },
] as const;
export type Band = (typeof BANDS)[number]["name"];

export function bandFor(score: number): Band {
  return BANDS.find((b) => score >= b.min)!.name;
}

/** Checks are rated 0–4. A dimension score is the mean rating mapped to 0–100. */
export function dimensionScore(ratings: number[]) {
  if (!ratings.length) return 0;
  const mean = ratings.reduce((a, b) => a + b, 0) / ratings.length;
  return Math.round((mean / 4) * 100);
}

export function overallScore(dims: Record<DimensionKey, number>) {
  return Math.round(DIMENSIONS.reduce((sum, d) => sum + (dims[d.key] ?? 0) * d.weight, 0));
}

// Hourly rate guide for Indian clients, in ₹ (research report §Market context).
// Owned by Talent Thread, not the model. Keys: track group → band.
const RATE_TABLE: Record<"graphic" | "product", Record<Band, [number, number]>> = {
  graphic: { Emerging: [300, 700], Developing: [600, 1200], Strong: [1000, 1800], Exceptional: [1500, 2500] },
  product: { Emerging: [250, 500], Developing: [450, 900], Strong: [800, 1600], Exceptional: [1400, 2800] },
};
export function rateGuide(track: Track, band: Band) {
  const group = track === "UI" || track === "UX & product" ? "product" : "graphic";
  const [min, max] = RATE_TABLE[group][band];
  return { min, max };
}

export interface CritiquePoint {
  image: number | null; // 1-based image index, null when it applies to the whole portfolio
  see: string;
  why: string;
  fix: string;
}

export interface ReviewReport {
  track: Track;
  segments: string[];
  overview: string;
  dimensions: Record<
    DimensionKey,
    {
      score: number;
      checks: Record<string, number>; // 0–4 per check
      working: string;
      points: CritiquePoint[];
      confidence: "low" | "medium" | "high";
    }
  >;
  next_steps: string[];
  justification: string;
  roadmap: { skill: string; why: string; first_task: string }[];
  rate: { min: number; max: number; note: string };
  share_line: string;
  confidence: "low" | "medium" | "high";
  flags: string[];
  limitations: string[];
  samples: number;
}

export const FREE_REVIEWS_PER_MONTH = 3;
export const MAX_REVIEW_IMAGES = 10;
