import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Mail, Lock, Check } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — EventLabs" }] }),
  component: LoginPage,
});

type Mode = "signin" | "signup" | "verify" | "forgot";

function LoginPage() {
  const [mode, setMode] = useState<Mode>("signin");
  const nav = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-10 flex items-center gap-2 font-display text-sm font-semibold">
          <span className="h-2 w-2 rounded-full bg-lime pulse-lime" />
          EventLabs<span className="text-muted-foreground">*</span>
        </Link>

        <div className="rounded-3xl border border-border bg-surface p-8 shadow-card">
          {mode === "signin" && (
            <Form
              title="Welcome back."
              sub="Sign in to drop into your events."
              cta="Sign in"
              onSubmit={() => nav({ to: "/app" })}
              footer={
                <div className="mt-6 flex items-center justify-between text-xs">
                  <button onClick={() => setMode("forgot")} className="text-muted-foreground hover:text-lime">
                    Forgot password?
                  </button>
                  <button onClick={() => setMode("signup")} className="text-muted-foreground hover:text-lime">
                    Create account →
                  </button>
                </div>
              }
            />
          )}

          {mode === "signup" && (
            <Form
              title="Join the room."
              sub="We'll verify your email next."
              cta="Continue"
              onSubmit={() => setMode("verify")}
              footer={
                <p className="mt-6 text-center text-xs text-muted-foreground">
                  Already a member?{" "}
                  <button onClick={() => setMode("signin")} className="text-lime hover:underline">
                    Sign in
                  </button>
                </p>
              }
            />
          )}

          {mode === "verify" && (
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-lime/15 text-lime">
                <Mail className="h-6 w-6" />
              </div>
              <h2 className="mt-6 font-display text-2xl font-semibold">Check your inbox.</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                We sent a 6-digit code to verify it's really you.
              </p>
              <div className="mt-6 flex justify-center gap-2">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <input
                    key={i}
                    maxLength={1}
                    className="h-12 w-10 rounded-lg border border-input bg-background text-center font-mono text-lg outline-none focus:border-lime"
                  />
                ))}
              </div>
              <button
                onClick={() => nav({ to: "/onboarding" })}
                className="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-lime py-3 text-sm font-semibold text-primary-foreground shadow-glow"
              >
                Verify <Check className="h-4 w-4" />
              </button>
              <button onClick={() => setMode("signup")} className="mt-3 text-xs text-muted-foreground hover:text-foreground">
                Use a different email
              </button>
            </div>
          )}

          {mode === "forgot" && (
            <div>
              <h2 className="font-display text-2xl font-semibold">Reset password.</h2>
              <p className="mt-2 text-sm text-muted-foreground">We'll email you a magic link.</p>
              <Field icon={Mail} type="email" placeholder="you@event.com" />
              <button
                onClick={() => setMode("signin")}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-lime py-3 text-sm font-semibold text-primary-foreground shadow-glow"
              >
                Send link <ArrowRight className="h-4 w-4" />
              </button>
              <button onClick={() => setMode("signin")} className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-foreground">
                ← Back to sign in
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Form({
  title, sub, cta, onSubmit, footer,
}: { title: string; sub: string; cta: string; onSubmit: () => void; footer: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-display text-2xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{sub}</p>
      <Field icon={Mail} type="email" placeholder="you@event.com" />
      <Field icon={Lock} type="password" placeholder="Password" />
      <button
        onClick={onSubmit}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-lime py-3 text-sm font-semibold text-primary-foreground shadow-glow transition hover:scale-[1.01]"
      >
        {cta} <ArrowRight className="h-4 w-4" />
      </button>
      {footer}
    </div>
  );
}

function Field({ icon: Icon, ...rest }: { icon: React.ElementType } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="mt-4 flex items-center gap-3 rounded-xl border border-input bg-background px-4 py-3 focus-within:border-lime">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <input {...rest} className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
    </label>
  );
}
