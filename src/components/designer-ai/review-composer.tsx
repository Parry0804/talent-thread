"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowDown, ArrowUp, Check, ImagePlus, Loader2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormError, Input, Textarea } from "@/components/ui/form";
import { cn } from "@/lib/cn";
import { portfolioImage } from "@/lib/designer-ai/images";
import { ACCEPTED_IMAGE_TYPES, uploadImage } from "@/components/designer-ai/upload";
import type { ActionState } from "@/components/ui/action-form";

export type PickableItem = { id: string; title: string; description: string; image_paths: string[] };
type Chosen = { path: string; title: string; brief: string; role: string; outcome: string };

const STAGES = [
  "Looking at every image closely",
  "Reading your project context",
  "Working out your main track and the clients it suits",
  "Rating hierarchy, type, colour and craft",
  "Checking how well each project tells its story",
  "Comparing your work with what Indian clients hire for",
  "Writing specific fixes for each point",
  "Putting your skill roadmap together",
];

/** Full-panel pending state while the review runs (30–120 seconds). */
function PendingPanel({ count }: { count: number }) {
  const { pending } = useFormStatus();
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!pending) return;
    const start = Date.now();
    const t = setInterval(() => setSeconds(Math.round((Date.now() - start) / 1000)), 1000);
    return () => {
      clearInterval(t);
      setSeconds(0);
    };
  }, [pending]);
  if (!pending) return null;
  const stage = Math.min(STAGES.length - 1, Math.floor(seconds / 11));
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-paper-50/90 px-4 backdrop-blur-sm" role="status" aria-live="polite">
      <div className="w-full max-w-md rounded-xl border border-violet-100 bg-paper-0 p-8 text-center shadow-overlay">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-violet-50 text-violet-600">
          <Sparkles className="animate-pulse" size={26} />
        </div>
        <h2 className="mt-5 font-display text-2xl font-semibold">Claude is studying your work…</h2>
        <p className="mt-2 text-sm text-ink-500">
          It&apos;s reviewing {count} image{count === 1 ? "" : "s"} the way a senior creative director would. This usually takes 1–2 minutes. Please keep this tab open.
        </p>
        <ul className="mt-6 flex flex-col gap-2 text-left text-sm">
          {STAGES.slice(0, stage + 1).map((s, i) => (
            <li key={s} className={cn("flex items-center gap-2", i === stage ? "text-ink-900" : "text-ink-400")}>
              {i === stage ? <Loader2 size={14} className="animate-spin text-violet-600" /> : <Check size={14} className="text-success-600" />}
              {s}
            </li>
          ))}
        </ul>
        <p className="mt-6 font-mono text-xs text-ink-400 tabular">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")} elapsed</p>
      </div>
    </div>
  );
}

function RunButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="brand" size="lg" disabled={disabled || pending}>
      <Sparkles size={16} /> {pending ? "Reviewing…" : "Run my AI review"}
    </Button>
  );
}

export function ReviewComposer({
  action,
  userId,
  items,
  max,
}: {
  action: (state: ActionState, fd: FormData) => Promise<ActionState>;
  userId: string;
  items: PickableItem[];
  max: number;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const [chosen, setChosen] = useState<Chosen[]>([]);
  const [uploading, setUploading] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [own, setOwn] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const full = chosen.length + uploading >= max;

  const has = (p: string) => chosen.some((c) => c.path === p);
  const update = (i: number, patch: Partial<Chosen>) => setChosen((prev) => prev.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const move = (i: number, d: -1 | 1) =>
    setChosen((prev) => {
      const j = i + d;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  function togglePortfolio(item: PickableItem, path: string) {
    if (has(path)) return setChosen((prev) => prev.filter((c) => c.path !== path));
    if (full) return;
    setChosen((prev) => [...prev, { path, title: item.title, brief: item.description.slice(0, 300), role: "", outcome: "" }]);
  }

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploadError(null);
    const room = max - chosen.length - uploading;
    const list = Array.from(files).slice(0, room);
    if (files.length > room) setUploadError(`A review can include up to ${max} images. We added the first ${room}.`);
    setUploading((u) => u + list.length);
    for (const f of list) {
      try {
        const path = await uploadImage(f, userId, "portfolio");
        setChosen((prev) => [...prev, { path, title: "", brief: "", role: "", outcome: "" }]);
      } catch (e) {
        setUploadError((e as Error).message);
      } finally {
        setUploading((u) => u - 1);
      }
    }
    if (fileInput.current) fileInput.current.value = "";
  }

  const withContext = chosen.filter((c) => c.brief.trim() || c.role.trim() || c.outcome.trim()).length;
  const pickable = items.filter((i) => i.image_paths.length);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <PendingPanel count={chosen.length} />
      <input type="hidden" name="images" value={JSON.stringify(chosen)} />
      <FormError message={state?.error} />

      {/* Step 1: pick images */}
      <section className="rounded-lg border border-paper-200 bg-paper-0 p-6 shadow-card">
        <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-violet-600">Step 1</p>
        <h2 className="mt-1 font-display text-xl font-semibold">Choose the work to review</h2>
        <p className="mt-1 text-sm text-ink-500">
          Pick 1 to {max} images. Choose the pieces you most want clients to hire you for: 5 to 8 strong images give the most reliable score.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button type="button" variant="secondary" onClick={() => fileInput.current?.click()} disabled={full}>
            <ImagePlus size={16} /> Upload images
          </Button>
          <span className="text-sm text-ink-500 tabular">{chosen.length} of {max} selected</span>
          {uploading > 0 && <span className="inline-flex items-center gap-1.5 text-sm text-ink-500"><Loader2 size={14} className="animate-spin" /> Uploading {uploading}…</span>}
          <input ref={fileInput} type="file" multiple accept={ACCEPTED_IMAGE_TYPES.join(",")} className="sr-only" onChange={(e) => onFiles(e.target.files)} />
        </div>
        {uploadError && <p className="mt-2 text-sm text-danger-600" role="alert">{uploadError}</p>}

        {pickable.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-ink-800">Or pick from your portfolio</h3>
            <div className="mt-3 flex flex-col gap-4">
              {pickable.map((item) => (
                <div key={item.id}>
                  <div className="mb-2 text-xs font-medium text-ink-500">{item.title}</div>
                  <div className="flex flex-wrap gap-2">
                    {item.image_paths.map((p) => {
                      const on = has(p);
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => togglePortfolio(item, p)}
                          disabled={!on && full}
                          aria-pressed={on}
                          className={cn(
                            "relative h-20 w-28 overflow-hidden rounded-md border-2 bg-paper-100 transition disabled:opacity-40",
                            on ? "border-violet-500" : "border-transparent hover:border-paper-300",
                          )}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={portfolioImage(p)} alt="" className="h-full w-full object-cover" />
                          {on && <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-violet-500 text-white"><Check size={12} /></span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Step 2: context */}
      {chosen.length > 0 && (
        <section className="rounded-lg border border-paper-200 bg-paper-0 p-6 shadow-card">
          <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-violet-600">Step 2</p>
          <h2 className="mt-1 font-display text-xl font-semibold">Tell the story behind each image</h2>
          <div className="mt-3 rounded-md bg-violet-50 p-4 text-sm text-ink-700">
            <strong className="font-semibold text-ink-900">This matters more than anything else you do here.</strong> A single image can&apos;t show the brief, your role or the result.
            Without them, Project depth (30% of your score) is marked &quot;not shown&quot;. Three short lines per project usually lift that score noticeably.
            <div className="mt-2 text-xs text-ink-500 tabular">{withContext} of {chosen.length} images have context</div>
          </div>

          <ol className="mt-5 flex flex-col gap-4">
            {chosen.map((c, i) => (
              <li key={c.path} className="grid gap-4 rounded-md border border-paper-200 p-4 sm:grid-cols-[160px_1fr]">
                <div className="flex flex-col gap-2">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-paper-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={portfolioImage(c.path)} alt="" className="h-full w-full object-cover" />
                    <span className="absolute left-1.5 top-1.5 rounded-full bg-ink-900 px-2 py-0.5 text-[11px] font-semibold text-paper-50">Image {i + 1}</span>
                  </div>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded-full p-1.5 text-ink-500 hover:bg-paper-100 disabled:opacity-30" aria-label="Move up"><ArrowUp size={14} /></button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === chosen.length - 1} className="rounded-full p-1.5 text-ink-500 hover:bg-paper-100 disabled:opacity-30" aria-label="Move down"><ArrowDown size={14} /></button>
                    <button type="button" onClick={() => setChosen((prev) => prev.filter((_, j) => j !== i))} className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-ink-500 hover:bg-danger-50 hover:text-danger-600"><X size={12} /> Remove</button>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 sm:col-span-2">
                    <span className="text-xs font-medium text-ink-700">Project title</span>
                    <Input value={c.title} maxLength={100} onChange={(e) => update(i, { title: e.target.value })} placeholder="Chai Point packaging refresh" />
                  </label>
                  <label className="flex flex-col gap-1 sm:col-span-2">
                    <span className="text-xs font-medium text-ink-700">The brief: what was the problem?</span>
                    <Textarea className="min-h-16" value={c.brief} maxLength={400} onChange={(e) => update(i, { brief: e.target.value })} placeholder="A Pune tea brand wanted packs that stand out on quick-commerce apps at thumbnail size." />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-ink-700">Your role</span>
                    <Input value={c.role} maxLength={200} onChange={(e) => update(i, { role: e.target.value })} placeholder="Sole designer, from concept to print files" />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-ink-700">Outcome</span>
                    <Input value={c.outcome} maxLength={200} onChange={(e) => update(i, { outcome: e.target.value })} placeholder="Launched on Blinkit; repeat orders up 18%" />
                  </label>
                  <p className="text-xs text-ink-400 sm:col-span-2">Concept or practice work? Say so in the brief. Honest labels are never marked down.</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Step 3: confirm */}
      <section className="rounded-lg border border-paper-200 bg-paper-0 p-6 shadow-card">
        <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-violet-600">Step 3</p>
        <h2 className="mt-1 font-display text-xl font-semibold">Anything else Claude should know?</h2>
        <Textarea
          name="note"
          maxLength={600}
          className="mt-4"
          placeholder="Optional. For example: I want to move from social media posts into brand identity work for D2C food brands."
        />
        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-md border border-paper-200 p-4 has-[:checked]:border-ink-900">
          <input type="checkbox" name="own_work" checked={own} onChange={(e) => setOwn(e.target.checked)} className="mt-0.5 h-4 w-4 accent-ink-900" />
          <span className="text-sm">
            <span className="font-medium text-ink-900">This is my own work.</span>{" "}
            <span className="text-ink-500">I made these designs, or I&apos;ve clearly said where I worked as part of a team.</span>
          </span>
        </label>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <p className="max-w-md text-xs text-ink-500">Your review is private. Only you can see it, unless you choose to show your score on your profile.</p>
          <RunButton disabled={!chosen.length || !own || uploading > 0} />
        </div>
      </section>
    </form>
  );
}
