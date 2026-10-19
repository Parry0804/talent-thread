import { Bookmark, BookmarkCheck } from "lucide-react";
import { toggleSaveJob } from "@/app/designer/jobs/actions";
import { cn } from "@/lib/cn";

export function SaveJobButton({ jobId, saved, withLabel = false }: { jobId: string; saved: boolean; withLabel?: boolean }) {
  return (
    <form action={toggleSaveJob}>
      <input type="hidden" name="job_id" value={jobId} />
      <input type="hidden" name="saved" value={saved ? "1" : "0"} />
      <button
        type="submit"
        aria-label={saved ? "Remove from saved jobs" : "Save this job"}
        title={saved ? "Remove from saved jobs" : "Save this job"}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-sm transition-colors",
          saved ? "border-ink-900 bg-ink-900 text-paper-50" : "border-paper-200 bg-paper-0 text-ink-600 hover:border-ink-300",
        )}
      >
        {saved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
        {withLabel && <span>{saved ? "Saved" : "Save job"}</span>}
      </button>
    </form>
  );
}
