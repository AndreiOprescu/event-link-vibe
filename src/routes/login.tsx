import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Mail, Lock, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
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
  const [confirmSent, setConfirmSent] = useState<string | null>(null);
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

  const continueWithGoogle = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/app`,
      });
      if (result.error) throw result.error;
      if (result.redirected) return;
      nav({ to: "/app" });
    } catch (e: any) {
      const friendly = friendlyError(e);
      setError(friendly);
      toast.error(friendly);
    } finally {
      setBusy(false);
    }
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
          options: { emailRedirectTo: `${window.location.origin}/onboarding` },
        });
        if (error) throw error;
        setConfirmSent(email);
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
  const sub =
    mode === "signin"
      ? "Sign in to find your people."
      : mode === "signup"
      ? "Create your account in seconds."
      : "We'll email you a reset link.";
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

          {confirmSent ? (
            <div className="mt-6 rounded-2xl border border-lime/40 bg-lime/5 p-5 text-sm">
              <div className="flex items-center gap-2 font-display text-base font-semibold text-lime">
                <CheckCircle2 className="h-5 w-5" /> Check your inbox
              </div>
              <p className="mt-2 text-muted-foreground">
                We sent a confirmation link to <span className="text-foreground">{confirmSent}</span>.
                Click it to verify your account, then come back to sign in.
              </p>
              <button
                onClick={() => { setConfirmSent(null); setMode("signin"); setPassword(""); }}
                className="mt-5 w-full rounded-full border border-border bg-background py-2.5 text-xs font-semibold hover:bg-surface-2"
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              {mode !== "forgot" && (
                <>
                  <button
                    onClick={continueWithGoogle}
                    disabled={busy}
                    className="mt-6 flex w-full items-center justify-center gap-3 rounded-full border border-border bg-background py-3 text-sm font-medium hover:bg-surface-2 disabled:opacity-60"
                  >
                    <GoogleIcon /> Continue with Google
                  </button>
                  <div className="my-4 flex items-center gap-3 text-[10px] uppercase tracking-widest text-muted-foreground">
                    <div className="h-px flex-1 bg-border" /> or with email <div className="h-px flex-1 bg-border" />
                  </div>
                </>
              )}

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
            </>
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

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.4-4.5 2.4-7.2 2.4-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.6 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4.1 5.7l6.2 5.2C40.9 35.8 44 30.4 44 24c0-1.3-.1-2.4-.4-3.5z"/>
    </svg>
  );
}
