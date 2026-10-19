import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { env } from "@/lib/env";
import {
  DIMENSIONS, RUBRIC_VERSION, TRACKS, bandFor, dimensionScore, overallScore, rateGuide,
  type DimensionKey, type ReviewReport,
} from "@/lib/ai/rubric";

export const REVIEW_MODEL = "claude-opus-5-5";
/** How many times to score each portfolio; the median is kept. 3 is steadier but costs ~3x. */
const SAMPLES = Math.min(3, Math.max(1, Number(process.env.REVIEW_SAMPLES ?? 1) || 1));

const Point = z.object({ image: z.number().int().nullable(), see: z.string(), why: z.string(), fix: z.string() });
const dimSchema = (checks: readonly { key: string }[]) =>
  z.object({
    checks: z.object(Object.fromEntries(checks.map((c) => [c.key, z.number().int()]))),
    working: z.string(),
    points: z.array(Point),
    confidence: z.enum(["low", "medium", "high"]),
  });

const ReviewSchema = z.object({
  is_design_portfolio: z.boolean(),
  track: z.enum(TRACKS),
  segments: z.array(z.string()),
  overview: z.string(),
  dimensions: z.object({
    visual: dimSchema(DIMENSIONS[0].checks),
    range: dimSchema(DIMENSIONS[1].checks),
    depth: dimSchema(DIMENSIONS[2].checks),
    market: dimSchema(DIMENSIONS[3].checks),
  }),
  next_steps: z.array(z.string()),
  justification: z.string(),
  roadmap: z.array(z.object({ skill: z.string(), why: z.string(), first_task: z.string() })),
  rate_note: z.string(),
  share_line: z.string(),
  confidence: z.enum(["low", "medium", "high"]),
  flags: z.array(z.string()),
  limitations: z.array(z.string()),
});
type RawReview = z.infer<typeof ReviewSchema>;

export interface ReviewImage {
  data: Buffer;
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  /** Optional 3-line project context from the designer. */
  title?: string;
  brief?: string;
  role?: string;
  outcome?: string;
}

export interface ReviewInput {
  images: ReviewImage[];
  designerName: string;
  discipline: string;
  experience: string;
  note?: string;
}

const SYSTEM = `You are a senior creative director in India reviewing a freelance designer's portfolio for Talent Thread, a marketplace for Indian graphic and UX/UI designers. Clients are mostly Indian startups, D2C brands, agencies and SMEs. Your review is private feedback that helps the designer get hired: honest, specific and kind.

Step 1. Identify the designer's main track (${TRACKS.join(", ")}) and the Indian client segments the work serves. Judge everything against that track: a packaging designer is not marked down for missing user research.

Step 2. Rate every check from 0 to 4:
0 = absent, 1 = weak, 2 = adequate, 3 = strong, 4 = exceptional.
Anything not visible in the images or the designer's context is "not shown" and rated 0 or 1 for that check, and you say "not shown" rather than calling it weak.
${DIMENSIONS.map(
  (d) =>
    `\n${d.name} (${d.key}):\n` +
    d.checks.map((c) => `- ${c.key}: ${c.desc}`).join("\n") +
    `\nWhat whole-dimension levels look like: ` +
    Object.entries(d.anchors).map(([k, v]) => `${k}: ${v}`).join(" | "),
).join("\n")}

Step 3. For each dimension write one thing that is working, then 2 to 4 critique points. Each point has: "image" (the 1-based image number it is about, or null for the whole portfolio), "see" (what you see), "why" (why it matters to clients or craft), "fix" (the concrete change). Never write vague advice like "improve consistency" without saying where and how.

Fairness: judge Indic scripts, regional aesthetics and Indian visual language on craft and fit for their audience, never against a Western default. Do not reward or punish style choices that are simply different.

Other fields:
- "next_steps": 3 to 5 prioritised actions specific to this portfolio.
- "roadmap": exactly 3 skills, most impactful first, each with one task for this week.
- "rate_note": one sentence on what would move this designer's rate up. Do not give numbers; the platform calculates the rate.
- "confidence" (per dimension and overall): lower it for few images, low resolution, or work types that are hard to judge from images.
- "flags": anything a human moderator should check, such as work that looks AI-generated, looks copied from a well-known brand, or a mismatch with the stated discipline. These never lower the score. Empty if none.
- "limitations": what you could not judge from these images.
- If the images are not design work at all, set is_design_portfolio to false and rate every check 0.`;

function client() {
  if (!env.anthropicKey) throw new Error("ANTHROPIC_API_KEY is not set");
  return new Anthropic({ apiKey: env.anthropicKey, timeout: 5 * 60 * 1000 });
}

function buildContent(input: ReviewInput): Anthropic.Beta.BetaContentBlockParam[] {
  const blocks: Anthropic.Beta.BetaContentBlockParam[] = [];
  input.images.forEach((img, i) => {
    const ctx = [img.title && `Project: ${img.title}`, img.brief && `Brief: ${img.brief}`, img.role && `Role: ${img.role}`, img.outcome && `Outcome: ${img.outcome}`]
      .filter(Boolean)
      .join("\n");
    blocks.push({ type: "text", text: `Image ${i + 1}${ctx ? `\n${ctx}` : " (no context given)"}` });
    blocks.push({ type: "image", source: { type: "base64", media_type: img.mediaType, data: img.data.toString("base64") } });
  });
  blocks.push({
    type: "text",
    text: `Review these ${input.images.length} portfolio image(s) from ${input.designerName}.\nStated discipline: ${input.discipline}\nExperience: ${input.experience}\nDesigner's note: ${input.note?.trim() || "none"}`,
  });
  return blocks;
}

async function scoreOnce(anthropic: Anthropic, content: Anthropic.Beta.BetaContentBlockParam[]) {
  const response = await anthropic.beta.messages.parse({
    model: REVIEW_MODEL,
    max_tokens: 16000,
    system: SYSTEM,
    messages: [{ role: "user", content }],
    output_config: { effort: "high", format: betaZodOutputFormat(ReviewSchema) },
    fallbacks: "default",
    betas: ["server-side-fallback-2026-07-01"],
  });
  if (response.stop_reason === "refusal") throw new ReviewError("The AI declined to review these images. Try different work.");
  if (response.stop_reason === "max_tokens" || !response.parsed_output) {
    throw new ReviewError("The AI's answer was cut short. Please run the review again.");
  }
  return { raw: response.parsed_output, model: response.model };
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};
const clampCheck = (n: number) => Math.max(0, Math.min(4, Math.round(n)));

export async function runPortfolioReview(input: ReviewInput) {
  const anthropic = client();
  const content = buildContent(input);
  const settled = await Promise.allSettled(Array.from({ length: SAMPLES }, () => scoreOnce(anthropic, content)));
  const runs = settled.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
  if (!runs.length) {
    const first = settled[0] as PromiseRejectedResult;
    throw first.reason instanceof ReviewError ? first.reason : new ReviewError("The AI review failed. Please try again.");
  }

  // Median rating per check across runs; dimension spread decides confidence.
  const dims = {} as Record<DimensionKey, number>;
  const checks = {} as Record<DimensionKey, Record<string, number>>;
  const spreadLow = {} as Record<DimensionKey, boolean>;
  for (const d of DIMENSIONS) {
    checks[d.key] = {};
    for (const c of d.checks) {
      const vals = runs.map((r) => clampCheck((r.raw.dimensions[d.key].checks as Record<string, number>)[c.key] ?? 0));
      checks[d.key][c.key] = median(vals);
    }
    dims[d.key] = dimensionScore(Object.values(checks[d.key]));
    const perRun = runs.map((r) => dimensionScore(d.checks.map((c) => clampCheck((r.raw.dimensions[d.key].checks as Record<string, number>)[c.key] ?? 0))));
    spreadLow[d.key] = runs.length > 1 && Math.max(...perRun) - Math.min(...perRun) > 8;
  }

  const isPortfolio = runs.filter((r) => r.raw.is_design_portfolio).length * 2 > runs.length;
  const overall = isPortfolio ? overallScore(dims) : 0;
  const band = bandFor(overall);

  // Words come from the run whose own overall is closest to the median result.
  const runOverall = (r: { raw: RawReview }) =>
    overallScore(Object.fromEntries(DIMENSIONS.map((d) => [d.key, dimensionScore(d.checks.map((c) => clampCheck((r.raw.dimensions[d.key].checks as Record<string, number>)[c.key] ?? 0)))])) as Record<DimensionKey, number>);
  const base = runs.reduce((best, r) => (Math.abs(runOverall(r) - overall) < Math.abs(runOverall(best) - overall) ? r : best), runs[0]);
  const raw = base.raw;
  const rate = rateGuide(raw.track, band);
  const anyLow = Object.values(spreadLow).some(Boolean);

  const report: ReviewReport = {
    track: raw.track,
    segments: raw.segments.slice(0, 5),
    overview: raw.overview,
    dimensions: Object.fromEntries(
      DIMENSIONS.map((d) => {
        const r = raw.dimensions[d.key];
        return [
          d.key,
          {
            score: dims[d.key],
            checks: checks[d.key],
            working: r.working,
            points: r.points.slice(0, 4).map((p) => ({ ...p, image: p.image && p.image >= 1 && p.image <= input.images.length ? p.image : null })),
            confidence: spreadLow[d.key] ? "low" : r.confidence,
          },
        ];
      }),
    ) as ReviewReport["dimensions"],
    next_steps: raw.next_steps.slice(0, 5),
    justification: raw.justification,
    roadmap: raw.roadmap.slice(0, 3),
    rate: { ...rate, note: raw.rate_note },
    share_line: raw.share_line,
    confidence: anyLow ? "low" : raw.confidence,
    flags: isPortfolio ? raw.flags : ["Not a design portfolio", ...raw.flags],
    limitations: raw.limitations,
    samples: runs.length,
  };

  return { overall, band, dims, report, model: base.model, rubricVersion: RUBRIC_VERSION };
}

export class ReviewError extends Error {}

/** Short AI-written job brief from a client's plain description (C05 "AI brief builder"). */
const BriefSchema = z.object({
  title: z.string(),
  category: z.string(),
  description: z.string(),
  deliverables: z.array(z.string()),
  skills: z.array(z.string()),
  budget_min: z.number().int(),
  budget_max: z.number().int(),
  timeline_weeks: z.number().int(),
  experience_level: z.enum(["Emerging", "Mid-level", "Senior"]),
  questions_for_designers: z.array(z.string()),
});
export type JobBrief = z.infer<typeof BriefSchema>;

export async function draftJobBrief(plainDescription: string, company: string) {
  const anthropic = client();
  const response = await anthropic.beta.messages.parse({
    model: REVIEW_MODEL,
    max_tokens: 8000,
    system: `You help Indian businesses hire freelance designers on Talent Thread. Turn a client's rough request into a clear job brief that designers can price. Use Indian rupee budgets that are realistic for Indian freelancers in 2026. Category must be one of: Branding, UI/UX, Illustration, Motion, Packaging, Social media, Web design, Print. Keep the description to 4-6 short paragraphs in plain language. Do not invent facts about the company beyond what is given; where something is unknown, make it a question for designers.`,
    messages: [{ role: "user", content: `Company: ${company || "not given"}\n\nWhat they need:\n${plainDescription}` }],
    output_config: { effort: "medium", format: betaZodOutputFormat(BriefSchema) },
    fallbacks: "default",
    betas: ["server-side-fallback-2026-07-01"],
  });
  if (response.stop_reason === "refusal" || !response.parsed_output) {
    throw new ReviewError("The AI couldn't draft this brief. Try describing the project differently.");
  }
  return response.parsed_output;
}
