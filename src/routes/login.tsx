import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Mail, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — EventLabs" }] }),
  component: LoginPage,
});

type Mode = "signin" | "signup" | "forgot";

function LoginPage() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nav = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav({ to: "/app" });
    });
  }, [nav]);

  const friendlyError = (e: any): string => {
    const code = e?.code ?? e?.error?.code;
    const msg = e?.message ?? "";
    if (code === "weak_password" || /weak|pwned|breach/i.test(msg)) {
      return "That password has shown up in a known data breach. Pick a longer or more unique one.";
    }
    if (code === "user_already_exists" || code === "email_exists" || /already registered|already exists/i.test(msg)) {
      return "An account with this email already exists. Try signing in.";
    }
    if (code === "invalid_credentials" || /invalid login|invalid credentials/i.test(msg)) {
      return "That email and password don't match.";
    }
    if (code === "email_not_confirmed" || /email not confirmed|confirm your email/i.test(msg)) {
      return "Confirm your email first — check your inbox for the link.";
    }
    if (code === "over_email_send_rate_limit" || /rate limit/i.test(msg)) {
      return "Too many attempts. Wait a moment and try again.";
    }
    return msg || "Something went wrong. Try again.";
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        nav({ to: "/app" });
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/app` },
        });
        if (error) throw error;
        toast.success("Account created — signing you in");
        const { error: e2 } = await supabase.auth.signInWithPassword({ email, password });
        if (e2) {
          toast.message("Check your email to verify your account");
          setMode("signin");
        } else {
          nav({ to: "/onboarding" });
        }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/login`,
        });
        if (error) throw error;
        toast.success("Reset link sent");
        setMode("signin");
      }
    } catch (e: any) {
      const friendly = friendlyError(e);
      setError(friendly);
      toast.error(friendly);
    } finally {
      setBusy(false);
    }
  };

  const title = mode === "signin" ? "Welcome back." : mode === "signup" ? "Join the room." : "Reset password.";
  const sub = mode === "signin" ? "Sign in to drop into your events." : mode === "signup" ? "Create your account in seconds." : "We'll email you a reset link.";
  const cta = mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send link";
  const disabled = busy || (mode === "signup" && password.length < 8);

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-10 flex items-center gap-2 font-display text-sm font-semibold">
          <span className="h-2 w-2 rounded-full bg-lime pulse-lime" />
          EventLabs<span className="text-muted-foreground">*</span>
        </Link>

        <div className="rounded-3xl border border-border bg-surface p-8 shadow-card">
          <h2 className="font-display text-2xl font-semibold">{title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{sub}</p>

          <Field
            icon={Mail}
            type="email"
            placeholder="you@event.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(null); }}
          />
          {mode !== "forgot" && (
            <>
              <Field
                icon={Lock}
                type="password"
                placeholder={mode === "signup" ? "Password (8+ chars, not a common one)" : "Password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
              />
              {mode === "signup" && (
                <p className="mt-2 px-1 text-[11px] leading-relaxed text-muted-foreground">
                  Avoid passwords you've used elsewhere — we block ones found in known breaches.
                </p>
              )}
            </>
          )}

          {error && (
            <div
              role="alert"
              className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs leading-relaxed text-destructive"
            >
              {error}
            </div>
          )}

          <button
            disabled={disabled}
            onClick={submit}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-lime py-3 text-sm font-semibold text-primary-foreground shadow-glow transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "…" : cta} <ArrowRight className="h-4 w-4" />
          </button>

          {mode === "signin" && (
            <div className="mt-6 flex items-center justify-between text-xs">
              <button onClick={() => { setMode("forgot"); setError(null); }} className="text-muted-foreground hover:text-lime">Forgot password?</button>
              <button onClick={() => { setMode("signup"); setError(null); }} className="text-muted-foreground hover:text-lime">Create account →</button>
            </div>
          )}
          {mode === "signup" && (
            <p className="mt-6 text-center text-xs text-muted-foreground">
              Already a member?{" "}
              <button onClick={() => { setMode("signin"); setError(null); }} className="text-lime hover:underline">Sign in</button>
            </p>
          )}
          {mode === "forgot" && (
            <button onClick={() => { setMode("signin"); setError(null); }} className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-foreground">
              ← Back to sign in
            </button>
          )}
        </div>
      </div>
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
