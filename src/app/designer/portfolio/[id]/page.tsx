import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { requireOnboarded } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, PageHeader } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { PortfolioForm } from "@/components/designer-ai/portfolio-form";
import { deletePiece, updatePiece } from "@/app/designer/portfolio/actions";
import type { PortfolioItem } from "@/lib/types";

export const metadata = { title: "Edit portfolio piece" };

export default async function EditPiecePage({ params }: PageProps<"/designer/portfolio/[id]">) {
  const { id } = await params;
  const viewer = await requireOnboarded("designer");
  const supabase = await createClient();
  const { data } = await supabase.from("portfolio_items").select("*").eq("id", id).eq("designer_id", viewer.id).maybeSingle();
  if (!data) notFound();
  const item = data as PortfolioItem;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/designer/portfolio" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900"><ArrowLeft size={14} /> Portfolio</Link>
      <PageHeader title={`Edit “${item.title}”`} />
      <PortfolioForm action={updatePiece} userId={viewer.id} item={item} submitLabel="Save changes" />
      <Card className="mt-10 flex flex-wrap items-center justify-between gap-4 border-danger-50 p-5">
        <div>
          <h2 className="font-semibold text-ink-900">Delete this piece</h2>
          <p className="text-sm text-ink-500">It disappears from your profile straight away. Past AI reviews keep their copies of the images.</p>
        </div>
        <form action={deletePiece}>
          <input type="hidden" name="id" value={item.id} />
          <SubmitButton variant="danger" pending="Deleting…"><Trash2 size={16} /> Delete piece</SubmitButton>
        </form>
      </Card>
    </div>
  );
}
