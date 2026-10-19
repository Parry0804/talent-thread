// Fee rules from the PRD and PM review. All amounts are whole rupees.
export const CLIENT_FEE_RATE = 0.03; // platform fee charged to the client on top of the milestone
export const GST_RATE = 0.18; // GST on the platform fee
export const COMMISSION_RATE = 0.1; // designer commission
export const REPEAT_HIRE_COMMISSION_RATE = 0.05; // same client hires the same designer again
export const TDS_RATE = 0.001; // Section 194-O, 0.1% (to confirm with a CA)
export const AUTO_APPROVE_DAYS = 5;
export const MAX_REVISIONS = 2;

export function clientCharge(amount: number) {
  const fee = Math.round(amount * CLIENT_FEE_RATE);
  const gst = Math.round(fee * GST_RATE);
  return { amount, fee, gst, total: amount + fee + gst };
}

export function designerPayout(amount: number, repeatHire = false) {
  const commission = Math.round(amount * (repeatHire ? REPEAT_HIRE_COMMISSION_RATE : COMMISSION_RATE));
  const tds = Math.round(amount * TDS_RATE);
  return { gross: amount, commission, tds, net: amount - commission - tds };
}

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
export const formatINR = (n: number | null | undefined) => inr.format(n ?? 0);

export function formatBudget(min: number, max: number, type: "fixed" | "hourly") {
  const suffix = type === "hourly" ? "/hr" : "";
  if (!max || min === max) return `${formatINR(min || max)}${suffix}`;
  return `${formatINR(min)}–${formatINR(max)}${suffix}`;
}
