import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles, Users, MessageCircle } from "lucide-react";

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

function Landing() {
  return (
    <div className="min-h-screen bg-background">
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
          Make IRL events
          <br />
          <span className="text-muted-foreground">unforgettable</span>
          <span className="text-lime">.</span>
        </h1>
        <p className="mt-8 max-w-2xl text-lg text-muted-foreground">
          You were just in a room with <span className="text-lime">200 brilliant people</span>.
          EventLabs makes sure you actually take something home — the conversations, the connections, the insights.
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

        {/* 3 lanes */}
        <div className="mt-24 grid gap-4 sm:grid-cols-3">
          {[
            { tag: "Lane 01", icon: Sparkles, title: "Learn more.", body: "Surface insights from sessions you didn't attend.", lime: false },
            { tag: "Lane 02", icon: Users, title: "Connect better.", body: "Match people by intent, not job title.", lime: false },
            { tag: "Lane 03", icon: MessageCircle, title: "Have more fun.", body: "Gamify the experience in real time.", lime: true },
          ].map((c) => (
            <div
              key={c.tag}
              className={`rounded-2xl border p-6 transition ${
                c.lime
                  ? "border-lime/40 bg-lime text-primary-foreground"
                  : "border-border bg-surface text-foreground"
              }`}
            >
              <div className={`font-mono text-xs ${c.lime ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                {c.tag}
              </div>
              <c.icon className="mt-12 h-7 w-7" strokeWidth={1.5} />
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
  );
}
