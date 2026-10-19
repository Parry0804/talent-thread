import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 font-display text-lg font-bold text-ink-900">
      <span className="grid h-7 w-7 place-items-center rounded-md bg-ink-900 text-[13px] text-marigold-500">tt</span>
      Talent Thread
    </Link>
  );
}
