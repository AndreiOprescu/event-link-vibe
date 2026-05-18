import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Camera, Smile } from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Set up your profile — EventLabs" }] }),
  component: Onboarding,
});

const EMOJIS = ["🚀", "🦊", "🐼", "🦉", "🐯", "🦄", "🐺", "🐧", "🦋", "🐙", "🐸", "🦁"];
const TRACKS = ["AI × IRL", "Founders", "Design Eng", "Infra", "Research", "Community", "Investors"];

function Onboarding() {
  const [step, setStep] = useState(1);
  const [emoji, setEmoji] = useState("🚀");
  const [track, setTrack] = useState("AI × IRL");
  const nav = useNavigate();

  const total = 4;

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col px-6 py-10">
      {/* Progress */}
      <div className="mb-10 flex items-center gap-2">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full ${i < step ? "bg-lime" : "bg-surface-2"}`}
          />
        ))}
        <span className="ml-3 font-mono text-xs text-muted-foreground">
          {step}/{total}
        </span>
      </div>

      <div className="flex-1">
        {step === 1 && (
          <Step title="Tell us about you." sub="The basics — we'll only show what you want.">
            <Grid2>
              <Input label="First name" placeholder="Maya" />
              <Input label="Last name" placeholder="Okafor" />
            </Grid2>
            <Input label="Email" placeholder="maya@event.com" />
            <Input label="Password" type="password" placeholder="••••••••" />
            <Grid2>
              <Input label="Company / University" placeholder="Northwind" />
              <Input label="LinkedIn" placeholder="maya-okafor" />
            </Grid2>
            <Input label="GitHub (optional)" placeholder="github.com/you" />
          </Step>
        )}

        {step === 2 && (
          <Step title="Pick your face." sub="Memoji or a quick selfie — your call.">
            <div className="grid grid-cols-6 gap-3">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={`flex aspect-square items-center justify-center rounded-2xl border text-3xl transition ${
                    emoji === e ? "border-lime bg-lime/10 shadow-glow" : "border-border bg-surface hover:bg-surface-2"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
            <button className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-surface py-4 text-sm text-muted-foreground hover:bg-surface-2">
              <Camera className="h-4 w-4" /> Take a selfie instead
            </button>
          </Step>
        )}

        {step === 3 && (
          <Step title="Pick a track." sub="What lane are you in for this event?">
            <div className="flex flex-wrap gap-2">
              {TRACKS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTrack(t)}
                  className={`rounded-full border px-4 py-2 text-sm transition ${
                    track === t
                      ? "border-lime bg-lime text-primary-foreground"
                      : "border-border bg-surface hover:bg-surface-2"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </Step>
        )}

        {step === 4 && (
          <Step title="What's your goal?" sub="We use this to match you with the right people.">
            <textarea
              rows={5}
              placeholder="e.g. Find a co-founder, hire two engineers, learn from designers…"
              className="w-full rounded-2xl border border-input bg-background p-4 text-sm outline-none focus:border-lime"
            />
            <div className="mt-6 rounded-2xl border border-lime/30 bg-lime/5 p-5">
              <div className="font-mono text-xs text-lime">YOUR CARD</div>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-lime text-2xl">
                  {emoji}
                </div>
                <div>
                  <div className="font-display text-base font-semibold">You</div>
                  <div className="text-xs text-muted-foreground">{track}</div>
                </div>
              </div>
            </div>
          </Step>
        )}
      </div>

      <div className="mt-10 flex items-center justify-between">
        <button
          onClick={() => (step === 1 ? nav({ to: "/login" }) : setStep(step - 1))}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back
        </button>
        <button
          onClick={() => (step === total ? nav({ to: "/app" }) : setStep(step + 1))}
          className="flex items-center gap-2 rounded-full bg-lime px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow"
        >
          {step === total ? "Enter EventLabs" : "Next"} <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function Step({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
          <Smile className="h-3 w-3" /> Onboarding
        </div>
        <h1 className="mt-2 font-display text-3xl font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{sub}</p>
      </div>
      <div className="space-y-3 pt-4">{children}</div>
    </div>
  );
}

function Input({ label, ...rest }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <input
        {...rest}
        className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-lime"
      />
    </label>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}
