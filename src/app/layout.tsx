import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Talent Thread", template: "%s · Talent Thread" },
  description:
    "Where Indian designers get seen, hired and paid. AI portfolio reviews, skill roadmaps and milestone escrow.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={`${bricolage.variable} ${geist.variable} ${geistMono.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
