"use client";
import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { publicUrl } from "@/lib/storage";
import { ACCEPTED_IMAGE_TYPES, uploadImage } from "@/components/designer-ai/upload";

/** Uploads a profile photo to the avatars bucket and submits its public URL as `avatar_url`. */
export function AvatarField({ userId, name, initial }: { userId: string; name: string; initial: string | null }) {
  const [url, setUrl] = useState(initial ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function onFile(f: File | undefined) {
    if (!f) return;
    setBusy(true);
    setError(null);
    try {
      const path = await uploadImage(f, userId, "avatars");
      setUrl(publicUrl("avatars", path) ?? "");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <input type="hidden" name="avatar_url" value={url} />
      <div className="relative">
        <Avatar name={name} src={url || null} size={72} />
        {busy && <span className="absolute inset-0 grid place-items-center rounded-full bg-ink-900/50 text-paper-0"><Loader2 className="animate-spin" size={20} /></span>}
      </div>
      <div className="flex flex-col items-start gap-1">
        <div className="flex gap-2">
          <button type="button" onClick={() => input.current?.click()} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-paper-200 bg-paper-0 px-3 text-sm font-medium hover:border-ink-300">
            <Camera size={14} /> {url ? "Change photo" : "Upload photo"}
          </button>
          {url && <button type="button" onClick={() => setUrl("")} className="h-8 rounded-full px-3 text-sm text-ink-500 hover:bg-paper-100">Remove</button>}
        </div>
        <span className="text-xs text-ink-500">A clear photo of your face builds trust with clients. Save the form to keep it.</span>
        {error && <span className="text-xs text-danger-600">{error}</span>}
      </div>
      <input ref={input} type="file" accept={ACCEPTED_IMAGE_TYPES.join(",")} className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
    </div>
  );
}
