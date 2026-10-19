import { ActionForm, type ActionState } from "@/components/ui/action-form";
import { Card } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { ImageField } from "@/components/designer-ai/image-field";
import { JOB_CATEGORIES } from "@/lib/options";
import type { PortfolioItem } from "@/lib/types";

/** Add/edit form for one portfolio piece. */
export function PortfolioForm({
  action,
  userId,
  item,
  submitLabel,
}: {
  action: (state: ActionState, fd: FormData) => Promise<ActionState>;
  userId: string;
  item?: PortfolioItem;
  submitLabel: string;
}) {
  return (
    <ActionForm action={action}>
      {item && <input type="hidden" name="id" value={item.id} />}
      <Card className="flex flex-col gap-5 p-6 sm:p-8">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink-700">Images</span>
          <ImageField name="image_paths" userId={userId} initial={item?.image_paths ?? []} max={8} />
        </div>
        <div className="grid gap-5 sm:grid-cols-[2fr_1fr]">
          <Field label="Title" hint="Say what it is and who it's for, e.g. “Brand identity for a Jaipur café”.">
            <Input name="title" defaultValue={item?.title} maxLength={120} required />
          </Field>
          <Field label="Category">
            <Select name="category" defaultValue={item?.category ?? JOB_CATEGORIES[0]}>
              {JOB_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Description" hint="Clients and the AI review both read this. Cover the brief, your role, and the result in a few lines.">
          <Textarea
            name="description"
            defaultValue={item?.description}
            maxLength={4000}
            className="min-h-32"
            placeholder={"Brief: A Bengaluru D2C skincare brand needed packs that read clearly on quick-commerce apps.\nMy role: Sole designer, from concept to print-ready files.\nResult: Launched on Nykaa; the client reordered within a month."}
          />
        </Field>
        <Field label="Link (optional)" hint="Behance, Dribbble, a live site or a Figma prototype.">
          <Input name="link" defaultValue={item?.link ?? ""} placeholder="behance.net/gallery/…" />
        </Field>
      </Card>
      <SubmitButton size="lg" pending="Saving…" className="self-end">{submitLabel}</SubmitButton>
    </ActionForm>
  );
}
