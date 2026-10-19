"use client";
import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, Loader2, X } from "lucide-react";
import { portfolioImage } from "@/lib/designer-ai/images";
import { ACCEPTED_IMAGE_TYPES, uploadImage } from "@/components/designer-ai/upload";

/** Multi-image picker for portfolio pieces. Submits `name` once per storage path, in order. */
export function ImageField({ name, userId, initial = [], max = 8 }: { name: string; userId: string; initial?: string[]; max?: number }) {
  const [paths, setPaths] = useState<string[]>(initial);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const room = max - paths.length;
    const list = Array.from(files).slice(0, room);
    if (files.length > room) setError(`You can add up to ${max} images per piece. We added the first ${room}.`);
    setBusy(list.length);
    for (const f of list) {
      try {
        const p = await uploadImage(f, userId, "portfolio");
        setPaths((prev) => [...prev, p]);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy((b) => b - 1);
      }
    }
    if (input.current) input.current.value = "";
  }

  const move = (i: number, d: -1 | 1) =>
    setPaths((prev) => {
      const next = [...prev];
      const j = i + d;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  return (
    <div className="flex flex-col gap-3">
      {paths.map((p) => <input key={p} type="hidden" name={name} value={p} />)}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {paths.map((p, i) => (
          <div key={p} className="group relative aspect-[4/3] overflow-hidden rounded-md border border-paper-200 bg-paper-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={portfolioImage(p)} alt="" className="h-full w-full object-cover" />
            {i === 0 && <span className="absolute left-2 top-2 rounded-full bg-ink-900 px-2 py-0.5 text-[11px] font-medium text-paper-50">Cover</span>}
            <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-gradient-to-t from-ink-900/70 to-transparent p-1.5">
              <div className="flex gap-1">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded-full bg-paper-0 p-1 text-ink-900 disabled:opacity-40" aria-label="Move earlier"><ArrowLeft size={14} /></button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === paths.length - 1} className="rounded-full bg-paper-0 p-1 text-ink-900 disabled:opacity-40" aria-label="Move later"><ArrowRight size={14} /></button>
              </div>
              <button type="button" onClick={() => setPaths((prev) => prev.filter((x) => x !== p))} className="rounded-full bg-paper-0 p-1 text-danger-600" aria-label="Remove image"><X size={14} /></button>
            </div>
          </div>
        ))}
        {Array.from({ length: busy }).map((_, i) => (
          <div key={`busy-${i}`} className="grid aspect-[4/3] place-items-center rounded-md border border-dashed border-paper-300 bg-paper-50 text-ink-400">
            <Loader2 className="animate-spin" size={20} />
          </div>
        ))}
        {paths.length + busy < max && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="flex aspect-[4/3] flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-paper-300 bg-paper-50 text-sm text-ink-500 hover:border-ink-300 hover:text-ink-900"
          >
            <ImagePlus size={20} />
            Add images
          </button>
        )}
      </div>
      <input ref={input} type="file" accept={ACCEPTED_IMAGE_TYPES.join(",")} multiple className="sr-only" onChange={(e) => onFiles(e.target.files)} />
      <p className="text-xs text-ink-500">
        {paths.length} of {max} images · JPG, PNG, WebP or GIF. The first image is the cover. Large photos are resized for you.
      </p>
      {error && <p className="text-xs text-danger-600" role="alert">{error}</p>}
    </div>
  );
}
