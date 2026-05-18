import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ME } from "@/data/mock";
import { Camera, Check, Linkedin, LogOut, Mail, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_app/app/profile")({
  head: () => ({ meta: [{ title: "Profile — EventLabs" }] }),
  component: Profile,
});

const EMOJIS = ["🚀", "🦊", "🐼", "🦉", "🐯", "🦄", "🐺", "🐧", "🦋", "🐙", "🐸", "🦁"];

function Profile() {
  const [emoji, setEmoji] = useState(ME.emoji);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">— Your profile</div>
      <h1 className="mt-2 font-display text-4xl font-semibold">Settings<span className="text-lime">.</span></h1>

      <div className="mt-10 grid gap-6 md:grid-cols-[300px,1fr]">
        {/* Avatar card */}
        <div className="rounded-3xl border border-border bg-surface p-6 text-center">
          <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full text-6xl shadow-card" style={{ backgroundColor: ME.color }}>
            {emoji}
          </div>
          <div className="mt-4 font-display text-lg font-semibold">{ME.name}</div>
          <div className="text-xs text-muted-foreground">{ME.role} · {ME.company}</div>
          <button className="mt-5 flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background py-2 text-xs hover:bg-surface-2">
            <Camera className="h-3.5 w-3.5" /> Take a new selfie
          </button>
        </div>

        {/* Forms */}
        <div className="space-y-6">
          <Card title="Choose your avatar">
            <div className="grid grid-cols-6 gap-2">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={`flex aspect-square items-center justify-center rounded-xl border text-2xl transition ${
                    emoji === e ? "border-lime bg-lime/10" : "border-border bg-background hover:bg-surface-2"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </Card>

          <Card title="Account">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="First name" defaultValue="You" />
              <Field label="Last name" defaultValue="" />
              <Field label="Email" defaultValue={ME.email} icon={Mail} />
              <Field label="Company / University" defaultValue={ME.company} />
              <Field label="LinkedIn" defaultValue={ME.linkedin} icon={Linkedin} />
              <Field label="Track" defaultValue={ME.track} />
            </div>
          </Card>

          <Card title="Your goal at events">
            <textarea
              rows={3}
              defaultValue={ME.goal}
              className="w-full rounded-xl border border-input bg-background p-3 text-sm outline-none focus:border-lime"
            />
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-lime" />
              We use this to match you in break rooms.
            </div>
          </Card>

          <div className="flex items-center justify-between gap-3">
            <button className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs text-muted-foreground hover:bg-surface">
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
            <button className="flex items-center gap-2 rounded-full bg-lime px-5 py-2.5 text-xs font-semibold text-primary-foreground shadow-glow">
              <Check className="h-3.5 w-3.5" /> Save changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-border bg-surface p-6">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Field({ label, icon: Icon, ...rest }: { label: string; icon?: React.ElementType } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className="mt-1 flex items-center gap-2 rounded-xl border border-input bg-background px-3 py-2.5 focus-within:border-lime">
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
        <input {...rest} className="w-full bg-transparent text-sm outline-none" />
      </div>
    </label>
  );
}
