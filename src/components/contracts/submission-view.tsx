import { ExternalLink, Paperclip } from "lucide-react";
import { formatDateTime } from "@/components/contracts/util";

export interface SubmissionRow {
  id: string;
  milestone_id: string;
  note: string;
  file_paths: string[];
  links: string[];
  feedback: string | null;
  created_at: string;
}
export type FileLink = { path: string; name: string; url: string | null };

function Files({ paths, files }: { paths: string[]; files: Map<string, FileLink> }) {
  if (!paths.length) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {paths.map((p) => {
        const f = files.get(p);
        return (
          <li key={p}>
            {f?.url ? (
              <a href={f.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-paper-200 bg-paper-0 px-3 py-1 text-xs font-medium hover:border-ink-300">
                <Paperclip size={12} /> {f.name}
              </a>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-paper-100 px-3 py-1 text-xs text-ink-500">
                <Paperclip size={12} /> {f?.name ?? p} (unavailable)
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function SubmissionView({ s, files, title = "Submitted work" }: { s: SubmissionRow; files: Map<string, FileLink>; title?: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-paper-200 bg-paper-50 p-4">
      <div className="flex items-center justify-between gap-2 text-xs text-ink-500">
        <span className="font-semibold uppercase tracking-wide">{title}</span>
        <span>{formatDateTime(s.created_at)}</span>
      </div>
      {s.note && <p className="whitespace-pre-wrap text-sm text-ink-800">{s.note}</p>}
      {s.links.length > 0 && (
        <ul className="flex flex-col gap-1">
          {s.links.map((l) => (
            <li key={l}>
              <a href={l} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 break-all text-sm font-medium text-info-600 hover:underline">
                <ExternalLink size={12} /> {l}
              </a>
            </li>
          ))}
        </ul>
      )}
      <Files paths={s.file_paths} files={files} />
      {s.feedback && (
        <div className="rounded-md border border-marigold-300 bg-marigold-50 px-3 py-2 text-sm text-marigold-800">
          <span className="font-semibold">Client feedback: </span>
          {s.feedback}
        </div>
      )}
    </div>
  );
}

