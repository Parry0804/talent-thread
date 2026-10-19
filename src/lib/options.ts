// Shared pick-lists used by onboarding, profiles, jobs and filters.
export const DISCIPLINES = ["Brand & identity", "UI / UX", "Packaging", "Illustration", "Motion", "Social & marketing", "Web design", "Print"];
export const JOB_CATEGORIES = ["Branding", "UI/UX", "Illustration", "Motion", "Packaging", "Social media", "Web design", "Print"];
export const SKILLS = [
  "Logo design", "Brand identity", "Brand guidelines", "Packaging", "UI design", "UX research", "Wireframing", "Prototyping",
  "Design systems", "Mobile apps", "Web design", "Landing pages", "Illustration", "Iconography", "Motion graphics",
  "Social media creatives", "Ad creatives", "Typography", "Hindi / Indic type", "Print & editorial", "Pitch decks", "3D",
];
export const TOOLS = ["Figma", "Adobe Illustrator", "Adobe Photoshop", "Adobe InDesign", "After Effects", "Framer", "Webflow", "Blender", "Procreate", "Canva", "Spline"];
export const LANGUAGES = ["English", "Hindi", "Marathi", "Tamil", "Telugu", "Kannada", "Bengali", "Gujarati", "Malayalam", "Punjabi"];
export const EXPERIENCE = [
  { value: 0, label: "Student or under 1 year" },
  { value: 2, label: "1–3 years" },
  { value: 4, label: "3–6 years" },
  { value: 7, label: "6+ years" },
];
export const CITIES = ["Bengaluru", "Mumbai", "Delhi NCR", "Pune", "Hyderabad", "Chennai", "Kolkata", "Ahmedabad", "Jaipur", "Kochi", "Remote / other"];
export const COMPANY_SIZES = ["Just me", "2–10", "11–50", "51–200", "200+"];
export const INDUSTRIES = ["D2C / e-commerce", "Fintech", "SaaS", "Edtech", "Food & beverage", "Health & wellness", "Real estate", "Agency", "Media & creators", "Other"];
export const BUDGETS = ["Under ₹25,000", "₹25,000–₹1,00,000", "₹1–5 lakh", "₹5 lakh+"];

export function experienceLabel(years: number) {
  return years >= 6 ? "6+ years" : years >= 3 ? "3–6 years" : years >= 1 ? "1–3 years" : "Student or under 1 year";
}
