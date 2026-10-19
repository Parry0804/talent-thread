import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireOnboarded } from "@/lib/auth";
import { PageHeader } from "@/components/ui/card";
import { PortfolioForm } from "@/components/designer-ai/portfolio-form";
import { createPiece } from "@/app/designer/portfolio/actions";

export const metadata = { title: "Add a portfolio piece" };

export default async function NewPiecePage() {
  const viewer = await requireOnboarded("designer");
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/designer/portfolio" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900"><ArrowLeft size={14} /> Portfolio</Link>
      <PageHeader title="Add a portfolio piece" sub="One project per piece. Show the final work first, then process images if you have them." />
      <PortfolioForm action={createPiece} userId={viewer.id} submitLabel="Add to portfolio" />
    </div>
  );
}
