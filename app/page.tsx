"use client";
import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Home() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleWaitlist(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    const { error } = await supabase.from("waitlist").insert([{ email }]);
    if (error) {
      if (error.code === "23505") {
        setMessage("You're already on the waitlist!");
      } else {
        setMessage("Something went wrong. Try again.");
      }
      setStatus("error");
    } else {
      setMessage("You're in! We'll be in touch soon. 🎉");
      setStatus("success");
      setEmail("");
    }
  }

  const WaitlistForm = () => (
    <form onSubmit={handleWaitlist} className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
      <input
        type="email"
        placeholder="Enter your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="flex-1 bg-white/5 border border-white/10 rounded-full px-5 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-[#6C63FF] transition"
        required
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="bg-[#6C63FF] hover:bg-[#5a52e0] disabled:opacity-50 text-white text-sm font-semibold px-6 py-3 rounded-full transition"
      >
        {status === "loading" ? "Joining..." : "Get Early Access"}
      </button>
    </form>
  );

  return (
    <main className="min-h-screen bg-[#0F0F1A] text-white font-sans">

      {/* NAV */}
      <nav className="flex justify-between items-center px-8 py-5 border-b border-white/10">
        <span className="text-xl font-bold tracking-tight text-white">
          Talent<span className="text-[#6C63FF]">Thread</span>
        </span>
        <div className="flex gap-4">
          <button className="text-sm text-white/60 hover:text-white transition">For Designers</button>
          <button className="text-sm text-white/60 hover:text-white transition">For Companies</button>
          <button className="bg-[#6C63FF] text-white text-sm px-4 py-2 rounded-full hover:bg-[#5a52e0] transition">
            Join Waitlist
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section className="flex flex-col items-center text-center px-6 pt-24 pb-20">
        <div className="bg-[#6C63FF]/10 border border-[#6C63FF]/30 text-[#6C63FF] text-xs font-semibold px-4 py-1.5 rounded-full mb-6 tracking-widest uppercase">
          AI-Powered Design Hiring Platform
        </div>
        <h1 className="text-5xl md:text-6xl font-bold leading-tight max-w-3xl mb-6">
          Where Great Designers
          <br />
          <span className="text-[#6C63FF]">Get Found.</span>
        </h1>
        <p className="text-white/50 text-lg max-w-xl mb-10 leading-relaxed">
          Talent Thread connects top graphic and UI/UX designers with companies — powered by AI portfolio analysis that shows exactly how good you really are.
        </p>
        <WaitlistForm />
        {message && (
          <p className={`mt-4 text-sm ${status === "success" ? "text-green-400" : "text-red-400"}`}>
            {message}
          </p>
        )}
        <p className="text-white/30 text-xs mt-4">Free forever for designers. No credit card needed.</p>
      </section>

      {/* STATS */}
      <section className="flex flex-col sm:flex-row justify-center gap-12 py-12 border-y border-white/10 px-8">
        {[
          { number: "AI-Powered", label: "Portfolio Analysis" },
          { number: "8%", label: "Commission Only" },
          { number: "₹0", label: "To Join as Designer" },
        ].map((stat) => (
          <div key={stat.label} className="text-center">
            <div className="text-3xl font-bold text-[#6C63FF]">{stat.number}</div>
            <div className="text-white/40 text-sm mt-1">{stat.label}</div>
          </div>
        ))}
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20 px-8 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-4">How It Works</h2>
        <p className="text-white/40 text-center mb-14 text-sm">Two sides. One platform. Zero friction.</p>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
            <div className="text-[#6C63FF] font-bold text-xs uppercase tracking-widest mb-6">For Designers</div>
            {[
              { step: "01", title: "Upload Your Portfolio", desc: "Add your best work — images, Behance, or Dribbble links." },
              { step: "02", title: "Get Your AI Score", desc: "Our AI analyzes your work and gives honest, market-standard feedback." },
              { step: "03", title: "Follow Your Growth Plan", desc: "Get a personalized 3-level skill roadmap to level up your career." },
              { step: "04", title: "Get Hired", desc: "Companies find you. Apply to projects. Earn on your terms." },
            ].map((item) => (
              <div key={item.step} className="flex gap-4 mb-6 last:mb-0">
                <div className="text-[#6C63FF] font-bold text-lg w-8 shrink-0">{item.step}</div>
                <div>
                  <div className="font-semibold text-sm mb-1">{item.title}</div>
                  <div className="text-white/40 text-sm">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
            <div className="text-[#FF6584] font-bold text-xs uppercase tracking-widest mb-6">For Companies</div>
            {[
              { step: "01", title: "Post a Project", desc: "Describe what you need. Our AI helps you write the perfect brief." },
              { step: "02", title: "Browse Verified Designers", desc: "Filter by skills, AI score, availability, and budget." },
              { step: "03", title: "Shortlist & Connect", desc: "Save your favourites. Reach out directly. No middleman." },
              { step: "04", title: "Hire with Confidence", desc: "AI scores tell you exactly what level of talent you're getting." },
            ].map((item) => (
              <div key={item.step} className="flex gap-4 mb-6 last:mb-0">
                <div className="text-[#FF6584] font-bold text-lg w-8 shrink-0">{item.step}</div>
                <div>
                  <div className="font-semibold text-sm mb-1">{item.title}</div>
                  <div className="text-white/40 text-sm">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-20 px-8 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-4">What Makes Us Different</h2>
        <p className="text-white/40 text-center mb-14 text-sm">Not just another freelancing platform.</p>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
          {[
            { icon: "🧠", title: "AI Portfolio Analysis", desc: "Get scored against real market standards. Know exactly where you stand." },
            { icon: "📈", title: "Skill Development Plan", desc: "A personalised 3-level roadmap based on your actual portfolio weaknesses." },
            { icon: "🎯", title: "Designer-First", desc: "Built specifically for graphic and UI/UX designers. Not a generic platform." },
            { icon: "💸", title: "Fair Commission", desc: "Only 8% on completed projects. No hidden fees, no monthly charges for designers." },
            { icon: "⚡", title: "AI Project Briefs", desc: "Companies get AI-assisted project descriptions. Less back and forth for everyone." },
            { icon: "🇮🇳", title: "Built for India", desc: "INR pricing, UPI payments, and designed for the Indian design market." },
          ].map((f) => (
            <div key={f.title} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#6C63FF]/40 transition">
              <div className="text-3xl mb-4">{f.icon}</div>
              <div className="font-semibold mb-2">{f.title}</div>
              <div className="text-white/40 text-sm leading-relaxed">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-8 text-center">
        <div className="bg-[#6C63FF]/10 border border-[#6C63FF]/20 rounded-3xl max-w-2xl mx-auto py-16 px-8">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-white/40 mb-8 text-sm">Join the waitlist. Be among the first designers and companies on Talent Thread.</p>
          <div className="flex justify-center">
            <WaitlistForm />
          </div>
          {message && (
            <p className={`mt-4 text-sm ${status === "success" ? "text-green-400" : "text-red-400"}`}>
              {message}
            </p>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/10 py-8 px-8 text-center text-white/20 text-xs">
        © 2026 TalentThread. Built for designers, by designers.
      </footer>

    </main>
  );
}