"use client";
import { useMemo, useState } from "react";
import { FileUp, Loader2, Paperclip, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Item = { key: string; name: string; size: number; status: "uploading" | "done" | "error"; path?: string; error?: string };

/**
 * Uploads files straight to Supabase Storage under "<user id>/<uuid>-<filename>"
 * and puts the storage paths in hidden inputs, so the server action only gets paths.
 */
export function FileUpload({
  userId,
  bucket = "deliverables",
  name = "file_paths",
  label = "Add files",
  hint = "Up to 50 MB each. Only people on this contract can open them.",
  max = 15,
}: {
  userId: string;
  bucket?: "deliverables" | "job-files";
  name?: string;
  label?: string;
  hint?: string;
  max?: number;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<Item[]>([]);
  const uploading = items.some((i) => i.status === "uploading");

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []).slice(0, Math.max(0, max - items.length));
    e.target.value = "";
    for (const file of picked) {
      const key = crypto.randomUUID();
      const safe = file.name.replace(/[^\w.\-]+/g, "_").slice(-80) || "file";
      const path = `${userId}/${key}-${safe}`;
      setItems((prev) => [...prev, { key, name: file.name, size: file.size, status: "uploading" }]);
      const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type || undefined, upsert: false });
      setItems((prev) =>
        prev.map((it) => (it.key === key ? (error ? { ...it, status: "error", error: error.message } : { ...it, status: "done", path }) : it)),
      );
    }
  }

  function remove(it: Item) {
    setItems((prev) => prev.filter((x) => x.key !== it.key));
    if (it.path) void supabase.storage.from(bucket).remove([it.path]);
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-paper-300 bg-paper-50 px-4 py-5 text-sm text-ink-600 hover:border-ink-300">
        <FileUp size={16} />
        <span className="font-medium">{label}</span>
        <input type="file" multiple className="sr-only" onChange={onPick} disabled={items.length >= max} />
      </label>
      <span className="text-xs text-ink-500">{uploading ? "Uploading… wait for every file to finish before you send." : hint}</span>
      {items.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {items.map((it) => (
            <li key={it.key} className="flex items-center gap-2 rounded-md border border-paper-200 bg-paper-0 px-3 py-2 text-sm">
              {it.status === "uploading" ? <Loader2 size={14} className="animate-spin text-ink-400" /> : <Paperclip size={14} className="text-ink-400" />}
              <span className="min-w-0 flex-1 truncate">{it.name}</span>
              <span className="text-xs text-ink-400">{(it.size / 1024 / 1024).toFixed(1)} MB</span>
              {it.status === "error" && <span className="text-xs text-danger-600">Failed: {it.error}</span>}
              <button type="button" onClick={() => remove(it)} className="rounded p-1 text-ink-400 hover:bg-paper-100 hover:text-ink-900" aria-label={`Remove ${it.name}`}>
                <X size={14} />
              </button>
              {it.path && <input type="hidden" name={name} value={it.path} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
