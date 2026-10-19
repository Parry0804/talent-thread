"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          /* clipboard blocked; the text is still selectable */
        }
      }}
      className="inline-flex h-8 items-center gap-1.5 rounded-full border border-paper-200 bg-paper-0 px-3 text-sm font-medium text-ink-900 hover:border-ink-300"
    >
      {copied ? <Check size={14} className="text-success-600" /> : <Copy size={14} />}
      {copied ? "Copied" : label}
    </button>
  );
}
