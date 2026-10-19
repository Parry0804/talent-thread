import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";

const palette = ["bg-violet-100 text-violet-700", "bg-marigold-100 text-marigold-800", "bg-success-50 text-success-600", "bg-info-50 text-info-600", "bg-danger-50 text-danger-600"];

export function Avatar({ name, src, size = 36, className }: { name: string | null | undefined; src?: string | null; size?: number; className?: string }) {
  const tone = palette[(name ?? "").length % palette.length];
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold", tone, className)}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden={!src}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name ?? ""} className="h-full w-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  );
}
