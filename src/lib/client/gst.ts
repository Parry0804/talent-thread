// GST helpers for client invoices. Talent Thread is registered in Maharashtra (state code 27).
export const SUPPLIER_STATE_CODE = "27";
export const SUPPLIER_STATE = "Maharashtra";
export const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const STATES: Record<string, string> = {
  "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh", "05": "Uttarakhand",
  "06": "Haryana", "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh", "10": "Bihar", "11": "Sikkim",
  "12": "Arunachal Pradesh", "13": "Nagaland", "14": "Manipur", "15": "Mizoram", "16": "Tripura", "17": "Meghalaya",
  "18": "Assam", "19": "West Bengal", "20": "Jharkhand", "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh",
  "24": "Gujarat", "26": "Dadra & Nagar Haveli and Daman & Diu", "27": "Maharashtra", "29": "Karnataka", "30": "Goa",
  "31": "Lakshadweep", "32": "Kerala", "33": "Tamil Nadu", "34": "Puducherry", "35": "Andaman & Nicobar Islands",
  "36": "Telangana", "37": "Andhra Pradesh", "38": "Ladakh",
};

const CITY_STATE: Record<string, string> = {
  Mumbai: "27", Pune: "27", Bengaluru: "29", "Delhi NCR": "07", Hyderabad: "36", Chennai: "33", Kolkata: "19",
  Ahmedabad: "24", Jaipur: "08", Kochi: "32",
};

/** Place of supply: GSTIN state code if on file, otherwise the client's city. */
export function placeOfSupply(gstin: string | null | undefined, city: string | null | undefined) {
  const fromGstin = gstin && GSTIN_PATTERN.test(gstin) ? gstin.slice(0, 2) : null;
  const code = fromGstin ?? (city ? CITY_STATE[city] : undefined) ?? null;
  return { code, name: code ? (STATES[code] ?? `State ${code}`) : "Not known", fromGstin: Boolean(fromGstin) };
}

/** Split the stored GST into CGST+SGST (intra-state) or IGST (inter-state). Parts always add up to `gst`. */
export function splitGst(gst: number, stateCode: string | null) {
  if (stateCode === SUPPLIER_STATE_CODE) {
    const cgst = Math.floor(gst / 2);
    return { intra: true as const, cgst, sgst: gst - cgst, igst: 0 };
  }
  return { intra: false as const, cgst: 0, sgst: 0, igst: gst };
}

/** Supplier details printed on invoices. Set TT_SUPPLIER_* in the environment; placeholders show until then. */
export const SUPPLIER = {
  name: "Talent Thread",
  legalName: process.env.TT_SUPPLIER_LEGAL_NAME ?? "Talent Thread",
  gstin: process.env.TT_SUPPLIER_GSTIN ?? "",
  address: process.env.TT_SUPPLIER_ADDRESS ?? "Maharashtra, India",
  email: process.env.TT_SUPPLIER_EMAIL ?? "",
  // Platform/intermediary service. Confirm the SAC with your CA before going live.
  sac: process.env.TT_SUPPLIER_SAC ?? "998599",
};
