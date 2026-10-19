import Link from "next/link";
import { ArrowDown, ArrowUp, ExternalLink, ImageIcon, Pencil, Plus, Sparkles } from "lucide-react";
import { requireOnboarded } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { portfolioImage } from "@/lib/designer-ai/images";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FormNotice } from "@/components/ui/form";
import { movePiece } from "@/app/designer/portfolio/actions";
import type { PortfolioItem } from "@/lib/types";

export const metadata = { title: "Portfolio" };

export default async function PortfolioPage({ searchParams }: PageProps<"/designer/portfolio">) {
  const viewer = await requireOnboarded("designer");
  const sp = await searchParams;
  const supabase = await createClient();
  const [{ data }, { data: dp }] = await Promise.all([
    supabase.from("portfolio_items").select("*").eq("designer_id", viewer.id).order("sort").order("created_at"),
    supabase.from("designer_profiles").select("slug").eq("id", viewer.id).single(),
  ]);
  const items = (data ?? []) as PortfolioItem[];

  return (
    <div>
      <PageHeader
        title="Portfolio"
        sub="Clients see these pieces on your public profile, in this order. Put the work you most want to be hired for first."
        action={
          <div className="flex flex-wrap gap-2">
            {dp?.slug && <LinkButton href={`/d/${dp.slug}`} variant="secondary"><ExternalLink size={16} /> View public profile</LinkButton>}
            <LinkButton href="/designer/portfolio/new"><Plus size={16} /> Add a piece</LinkButton>
          </div>
        }
      />
      {sp.saved && <div className="mb-6"><FormNotice message="Saved. Your portfolio is up to date." /></div>}

      {items.length === 0 ? (
        <EmptyState
          icon={<ImageIcon size={28} />}
          title="Your portfolio is empty"
          body="Your projects will appear here as cards with a cover image. Add your first piece: up to 8 images, a short brief, your role and the result."
          action={<LinkButton href="/designer/portfolio/new"><Plus size={16} /> Add your first piece</LinkButton>}
        />
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item, i) => (
              <Card key={item.id} className="group flex flex-col overflow-hidden">
                <Link href={`/designer/portfolio/${item.id}`} className="relative block aspect-[4/3] bg-paper-100">
                  {item.image_paths[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={portfolioImage(item.image_paths[0])} alt={item.title} className="h-full w-full object-cover" />
                  ) : (
                    <span className="grid h-full place-items-center text-ink-400"><ImageIcon size={28} /></span>
                  )}
                  <span className="absolute right-2 top-2 rounded-full bg-ink-900/80 px-2 py-0.5 text-[11px] font-medium text-paper-50">
                    {item.image_paths.length} image{item.image_paths.length === 1 ? "" : "s"}
                  </span>
                </Link>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-semibold text-ink-900">{item.title}</h2>
                    <Badge>{item.category}</Badge>
                  </div>
                  {item.description ? <p className="line-clamp-2 text-sm text-ink-500">{item.description}</p> : <p className="text-sm text-marigold-800">Add a short brief, role and result: it helps clients and your AI score.</p>}
                  <div className="mt-auto flex items-center justify-between pt-2">
                    <div className="flex gap-1">
                      <form action={movePiece}>
                        <input type="hidden" name="id" value={item.id} />
                        <input type="hidden" name="dir" value="up" />
                        <button disabled={i === 0} className="rounded-full p-1.5 text-ink-500 hover:bg-paper-100 hover:text-ink-900 disabled:opacity-30" aria-label={`Move ${item.title} up`}><ArrowUp size={16} /></button>
                      </form>
                      <form action={movePiece}>
                        <input type="hidden" name="id" value={item.id} />
                        <input type="hidden" name="dir" value="down" />
                        <button disabled={i === items.length - 1} className="rounded-full p-1.5 text-ink-500 hover:bg-paper-100 hover:text-ink-900 disabled:opacity-30" aria-label={`Move ${item.title} down`}><ArrowDown size={16} /></button>
                      </form>
                    </div>
                    <LinkButton href={`/designer/portfolio/${item.id}`} variant="ghost" size="sm"><Pencil size={14} /> Edit</LinkButton>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <Card className="mt-6 flex flex-wrap items-center justify-between gap-4 p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-violet-50 text-violet-600"><Sparkles size={16} /></span>
              <p className="text-sm text-ink-700">Updated your work? Get a fresh score and see what moved.</p>
            </div>
            <LinkButton href="/designer/analysis/new" variant="brand"><Sparkles size={16} /> Review my portfolio</LinkButton>
          </Card>
        </>
      )}
    </div>
  );
}
