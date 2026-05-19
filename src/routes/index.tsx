import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles, Mic, Users } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EventLabs — Make IRL events unforgettable" },
      { name: "description", content: "Connect, remember and unlock IRL events with EventLabs. For attendees aged 18–25." },
      { property: "og:title", content: "EventLabs — Make IRL events unforgettable" },
      { property: "og:description", content: "An AI-powered companion that turns conferences and meetups into lasting connections." },
    ],
  }),
  component: Landing,
});

// Stable, hand-tuned bubble positions / sizes / timings — no randomness so SSR matches client.
const BUBBLES = [
  { left: "4%",  size: 120, duration: 38, delay: -2,  opacity: 0.22 },
  { left: "12%", size: 64,  duration: 26, delay: -14, opacity: 0.28 },
  { left: "20%", size: 90,  duration: 44, delay: -8,  opacity: 0.18 },
  { left: "28%", size: 48,  duration: 22, delay: -20, opacity: 0.3  },
  { left: "37%", size: 140, duration: 48, delay: -5,  opacity: 0.16 },
  { left: "46%", size: 56,  duration: 28, delay: -18, opacity: 0.26 },
  { left: "55%", size: 100, duration: 36, delay: -11, opacity: 0.2  },
  { left: "64%", size: 72,  duration: 30, delay: -3,  opacity: 0.24 },
  { left: "73%", size: 130, duration: 46, delay: -16, opacity: 0.18 },
  { left: "82%", size: 54,  duration: 24, delay: -9,  opacity: 0.28 },
  { left: "90%", size: 96,  duration: 40, delay: -6,  opacity: 0.2  },
  { left: "96%", size: 44,  duration: 23, delay: -19, opacity: 0.3  },
];

function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Rising bubbles backdrop */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {BUBBLES.map((b, i) => {
          const variants = ["bubble--coral", "bubble--peach", "bubble--butter", "bubble--blush", "bubble--orchid", "bubble--sky"];
          return (
            <span
              key={i}
              className={`bubble ${variants[i % variants.length]}`}
              style={{
                left: b.left,
                width: `${b.size}px`,
                height: `${b.size}px`,
                opacity: b.opacity,
                animationDuration: `${b.duration}s`,
                animationDelay: `${b.delay}s`,
              }}
            />
          );
        })}
      </div>

      <div className="relative z-10">
        {/* Nav */}
        <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
          <div className="flex items-center gap-2 font-display text-sm font-semibold">
            <span className="h-2 w-2 rounded-full bg-lime pulse-lime" />
            EventLabs<span className="text-muted-foreground">*</span>
          </div>
          <div className="hidden text-xs uppercase tracking-[0.2em] text-muted-foreground sm:block">
            Eurhack.nl · Hackathon Build
          </div>
          <Link
            to="/login"
            className="rounded-full border border-border px-4 py-1.5 text-xs font-medium hover:bg-surface"
          >
            Sign in
          </Link>
        </header>

        {/* Hero */}
        <section className="mx-auto max-w-7xl px-6 pt-16 pb-24 sm:pt-24">
          <div className="mb-6 flex items-center gap-3 text-xs uppercase tracking-[0.25em] text-muted-foreground">
            <span className="h-px w-10 bg-muted-foreground" />
            A new layer for IRL events
          </div>
          <h1 className="font-display text-5xl font-semibold leading-[1.02] tracking-tight sm:text-7xl lg:text-8xl">
            The room keeps buzzing
            <br />
            <span className="text-muted-foreground">after the event ends</span>
            <span className="text-lime">.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg text-muted-foreground">
            Bubbles is a living digital space for events. Every attendee shows up as a{" "}
            <span className="text-lime">glowing bubble</span>. Tap one, hear what they have to say
            and slide into their LinkedIn, if you want.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              to="/login"
              className="group flex items-center gap-2 rounded-full bg-lime px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition hover:scale-[1.02]"
            >
              Join an event
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
            <Link
              to="/login"
              className="rounded-full border border-border px-6 py-3 text-sm font-medium hover:bg-surface"
            >
              Create account
            </Link>
          </div>

          {/* 3 cards */}
          <div className="mt-24 grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: Sparkles,
                title: "Show up as you.",
                body: "Create your bubble with a selfie, name and a headline for your goals to show up to the relevant attendee first.",
                lime: false,
              },
              {
                icon: Mic,
                title: "Record a 60s intro.",
                body: "Share whatever is on your mind. Keep it easy, make a first impression.",
                lime: false,
              },
              {
                icon: Users,
                title: "Your bubble is floating.",
                body: "Look around the plaza and discover exciting attendees by clicking their bubble.",
                lime: true,
              },
            ].map((c) => (
              <div
                key={c.title}
                className={`rounded-2xl border p-6 transition ${
                  c.lime
                    ? "border-lime/40 bg-lime text-primary-foreground"
                    : "border-border bg-surface text-foreground"
                }`}
              >
                <c.icon className="h-7 w-7" strokeWidth={1.5} />
                <h3 className="mt-12 font-display text-2xl font-semibold">{c.title}</h3>
                <p className={`mt-2 text-sm ${c.lime ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                  {c.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        <footer className="border-t border-border/60">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 text-xs text-muted-foreground">
            <div>EventLabs × Eurhack.nl 2026</div>
            <div>raj@eventlabs.ai</div>
          </div>
        </footer>
      </div>
    </div>
  );
}
