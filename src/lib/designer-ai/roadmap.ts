import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReviewReport } from "@/lib/ai/rubric";

export const ROADMAP_WEEKS = 6;

export const WEEK_THEMES: Record<number, { title: string; sub: string }> = {
  1: { title: "Start", sub: "Get going with one small, real task per skill." },
  2: { title: "Practise", sub: "Short, focused reps that build the muscle." },
  3: { title: "Build", sub: "Start one project you can actually show a client." },
  4: { title: "Get feedback", sub: "Show it to people who will be honest with you." },
  5: { title: "Publish", sub: "Turn the work into a case study clients can read." },
  6: { title: "Add to portfolio", sub: "Put it in front of clients and measure the change." },
};

type Task = { title: string; detail: string };

/** Two practical tasks for a skill in a given week. Week 1 uses the AI's first task. */
function tasksFor(skill: string, firstTask: string, week: number, index: number): Task[] {
  const s = skill.trim();
  switch (week) {
    case 1:
      return [
        { title: firstTask.trim() || `Make one small piece that shows ${s}`, detail: `Your review picked this as the quickest win for ${s}. Keep it small: one evening is enough.` },
        { title: `Collect 5 strong examples of ${s}`, detail: `Find five pieces by Indian studios or brands you admire that do ${s} well. Under each, write one line on what makes it work.` },
      ];
    case 2:
      return [
        { title: `Do three 45-minute ${s} drills`, detail: `Set a timer and do three short exercises focused only on ${s}. Keep every version, even the ones you don't like.` },
        { title: `Redo one old portfolio piece using ${s}`, detail: `Pick the weakest piece in your portfolio and rework it with what you practised. Save the before and after side by side.` },
      ];
    case 3:
      return [
        { title: `Start a self-brief project built around ${s}`, detail: `Write a one-paragraph brief for a realistic Indian client (a D2C brand, a café, a fintech app). Make ${s} the heart of the solution.` },
        { title: `Keep a process log for the ${s} project`, detail: `Save sketches, rejected options and one line per day on what you decided and why. This becomes your case study later.` },
      ];
    case 4:
      return [
        { title: `Get feedback on your ${s} work from 2 designers`, detail: `Share the work-in-progress with two designers you trust or a design community. Ask one specific question about ${s}, not "what do you think?".` },
        { title: `Apply the two most useful pieces of feedback`, detail: `Choose the two comments that would matter most to a client, make the changes, and note what you changed and why.` },
      ];
    case 5:
      return [
        { title: `Write a short case study for the ${s} project`, detail: `Cover four things in plain words: the problem, your role, two options you rejected and why, and the result.` },
        { title: `Publish the ${s} case study`, detail: `Post it on Behance, Dribbble, LinkedIn or your own site. Save the link: you can add it as proof here.` },
      ];
    default:
      return [
        { title: `Add the ${s} project to your Talent Thread portfolio`, detail: `Upload the best images with a clear title, brief, your role and the outcome, so clients see the full story.` },
        index === 0
          ? { title: "Run a fresh AI review", detail: "Include the new project and its context. Compare the new scores with your last review to see what moved." }
          : { title: `Update your profile to show ${s}`, detail: `If ${s} is now a strength, add it to your skills and mention it in your headline or bio.` },
      ];
  }
}

/** The full 6-week plan for a review's 3 roadmap skills, generated in code (no AI call). */
export function buildRoadmapTasks(roadmap: ReviewReport["roadmap"]) {
  const skills = roadmap.slice(0, 3);
  const rows: { week: number; skill: string; title: string; detail: string; sort: number }[] = [];
  for (let week = 1; week <= ROADMAP_WEEKS; week++) {
    let sort = 0;
    skills.forEach((r, i) => {
      for (const t of tasksFor(r.skill, r.first_task, week, i)) {
        rows.push({ week, skill: r.skill, title: t.title.slice(0, 200), detail: t.detail, sort: sort++ });
      }
    });
  }
  return rows;
}

/**
 * Creates a roadmap and its tasks from a finished review. Call with the service
 * client after checking the review belongs to `designerId`.
 */
export async function createRoadmapFromReview(db: SupabaseClient, designerId: string, reviewId: string, report: ReviewReport) {
  if (!report.roadmap?.length) return null;
  const { data: roadmap, error } = await db
    .from("roadmaps")
    .insert({ designer_id: designerId, review_id: reviewId, skills: report.roadmap.slice(0, 3), weeks: ROADMAP_WEEKS })
    .select("id")
    .single();
  if (error || !roadmap) throw new Error(`roadmap insert failed: ${error?.message}`);
  const tasks = buildRoadmapTasks(report.roadmap).map((t) => ({ ...t, roadmap_id: roadmap.id }));
  const { error: e2 } = await db.from("roadmap_tasks").insert(tasks);
  if (e2) throw new Error(`roadmap tasks insert failed: ${e2.message}`);
  return roadmap.id as string;
}
