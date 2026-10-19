"use client";
import { useRef, useState } from "react";
import { Paperclip, Upload, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { fileLabel } from "@/lib/client/files";

const MAX_FILES = 8;
const MAX_MB = 20;

/** Uploads brief attachments to the private job-files bucket and keeps their paths in hidden inputs. */
export function AttachmentsField({ userId, initial, name = "attachments" }: { userId: string; initial: string[]; name?: string }) {
  const [paths, setPaths] = useState<string[]>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const list = Array.from(files);
    if (paths.length + list.length > MAX_FILES) return setError(`You can attach up to ${MAX_FILES} files.`);
    const tooBig = list.find((f) => f.size > MAX_MB * 1024 * 1024);
    if (tooBig) return setError(`${tooBig.name} is over ${MAX_MB} MB.`);
    setBusy(true);
    const supabase = createClient();
    const added: string[] = [];
    for (const f of list) {
      const safe = f.name.replace(/[^\w.\-]+/g, "_").slice(-80);
      const path = `${userId}/${crypto.randomUUID()}-${safe}`;
      const { error: e } = await supabase.storage.from("job-files").upload(path, f, { contentType: f.type || undefined });
      if (e) {
        setError(`Couldn't upload ${f.name}. Please try again.`);
        break;
      }
      added.push(path);
    }
    setPaths((p) => [...p, ...added]);
    setBusy(false);
    if (input.current) input.current.value = "";
  }

  return (
    <div className="flex flex-col gap-2">
      {paths.map((p) => <input key={p} type="hidden" name={name} value={p} />)}
      {paths.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {paths.map((p) => (
            <li key={p} className="flex items-center gap-2 rounded-md border border-paper-200 bg-paper-50 px-3 py-2 text-sm">
              <Paperclip size={14} className="text-ink-400" />
              <span className="min-w-0 flex-1 truncate">{fileLabel(p)}</span>
              <button type="button" onClick={() => setPaths((x) => x.filter((y) => y !== p))} className="rounded p-1 text-ink-500 hover:bg-paper-100 hover:text-ink-900" aria-label={`Remove ${fileLabel(p)}`}>
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-paper-300 bg-paper-0 px-4 py-5 text-sm text-ink-600 hover:border-ink-300">
        <Upload size={16} />
        {busy ? "Uploading…" : "Add reference files (brand guide, sketches, examples)"}
        <input ref={input} type="file" multiple className="sr-only" disabled={busy} onChange={(e) => onFiles(e.target.files)} />
      </label>
      <p className="text-xs text-ink-500">Up to {MAX_FILES} files, {MAX_MB} MB each. Stored privately and shared only with designers looking at this job.</p>
      {error && <p className="text-xs text-danger-600">{error}</p>}
    </div>
  );
}
