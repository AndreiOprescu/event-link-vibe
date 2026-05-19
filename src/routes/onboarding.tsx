import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Camera, ImageIcon, Loader2, Smile } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CameraModal } from "@/components/app/CameraModal";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Set up your profile — EventLabs" }] }),
  component: Onboarding,
});

const TRACKS = ["AI x Business", "AI x Finance", "AI x Live Events", "Startup"];

function Onboarding() {
  const nav = useNavigate();
  const { user, profile, loading } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [track, setTrack] = useState("AI x Business");
  const [emoji, setEmoji] = useState("🚀");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);

  const total = 2;

  // Gate: must be signed in; if already done, skip to /app
  useEffect(() => {
    if (loading) return;
    if (!user) { nav({ to: "/login" }); return; }
    if (profile?.profile_completed) { nav({ to: "/app" }); }
  }, [loading, user, profile, nav]);

  // Prefill from existing profile
  useEffect(() => {
    if (!profile) return;
    setDisplayName((prev) => prev || profile.display_name || "");
    setCompany((prev) => prev || profile.company || "");
    setRole((prev) => prev || profile.role || "");
    setLinkedin((prev) => prev || profile.linkedin || "");
    setTrack((prev) => profile.track || prev);
    setEmoji((prev) => profile.emoji || prev);
    setAvatarUrl(profile.avatar_url ?? null);
  }, [profile]);

  const uploadFile = useCallback(async (file: File) => {
    if (!user || !profile) return;
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5 MB"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `avatars/${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("event-media")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("event-media").getPublicUrl(path);
      setAvatarUrl(pub.publicUrl);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [user, profile]);

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) await uploadFile(file);
  };

  const finish = async () => {
    if (!profile) return;
    if (displayName.trim().length < 2) { toast.error("Please add your name"); setStep(1); return; }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName.trim(),
          company: company.trim() || null,
          role: role.trim() || null,
          linkedin: linkedin.trim() || null,
          track,
          emoji,
          avatar_url: avatarUrl,
          profile_completed: true,
        })
        .eq("id", profile.id);
      if (error) throw error;
      nav({ to: "/app" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        <span className="mr-2 h-2 w-2 rounded-full bg-lime pulse-lime" /> loading…
      </div>
    );
  }

  const canNext = step === 1 ? displayName.trim().length >= 2 : true;

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col px-6 py-10">
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
          <Step title="Tell us about you." sub="A few basics so people in the room can place you.">
            <Input label="Full name" placeholder="Maya Okafor" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            <Grid2>
              <Input label="Company / University" placeholder="Northwind" value={company} onChange={(e) => setCompany(e.target.value)} />
              <Input label="Role" placeholder="Founding engineer" value={role} onChange={(e) => setRole(e.target.value)} />
            </Grid2>
            <Input label="LinkedIn (optional)" placeholder="maya-okafor" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} />
            <div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Track</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {TRACKS.map((t) => (
                  <button
                    key={t}
                    type="button"
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
            </div>
          </Step>
        )}

        {step === 2 && (
          <Step title="Add a profile photo." sub="Optional — upload an image so people in the room can recognize you.">
            <div className="flex flex-col items-center gap-4">
              <div
                className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full font-semibold shadow-card"
                style={{
                  backgroundColor: profile.color,
                  backgroundImage: avatarUrl ? `url(${avatarUrl})` : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  fontSize: 36,
                  color: "#0a0a0a",
                }}
              >
                {!avatarUrl && (displayName.trim()[0]?.toUpperCase() ?? "•")}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-xs hover:bg-surface-2 disabled:opacity-60"
                >
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
                  {uploading ? "Uploading…" : "Upload photo"}
                </button>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setAvatarUrl(null)}
                    className="rounded-full border border-border bg-background px-4 py-2 text-xs hover:bg-surface-2"
                  >
                    Remove photo
                  </button>
                )}
              </div>
            </div>
          </Step>
        )}
      </div>

      <div className="mt-10 flex items-center justify-between">
        <button
          onClick={() => (step === 1 ? null : setStep(step - 1))}
          disabled={step === 1}
          className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-30"
        >
          ← Back
        </button>
        <button
          onClick={() => (step === total ? finish() : setStep(step + 1))}
          disabled={!canNext || saving}
          className="flex items-center gap-2 rounded-full bg-lime px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {step === total ? (saving ? "Saving…" : "Enter EventLabs") : "Next"}
          {!saving && <ArrowRight className="h-4 w-4" />}
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
          <Smile className="h-3 w-3" /> Profile setup
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
