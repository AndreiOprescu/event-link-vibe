import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Check, ImageIcon, Linkedin, Loader2, LogOut, Mail, RefreshCw, Sparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/app/profile")({
  head: () => ({ meta: [{ title: "Profile — EventLabs" }] }),
  component: Profile,
});

const EMOJIS = ["🚀", "🦊", "🐼", "🦉", "🐯", "🦄", "🐺", "🐧", "🦋", "🐙", "🐸", "🦁"];

function Profile() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [emoji, setEmoji] = useState("🚀");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [track, setTrack] = useState("");
  const [goal, setGoal] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [color, setColor] = useState("#A3E635");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setEmoji(profile.emoji);
    setDisplayName(profile.display_name);
    setEmail(profile.email ?? "");
    setCompany(profile.company ?? "");
    setLinkedin(profile.linkedin ?? "");
    setTrack(profile.track ?? "");
    setGoal(profile.goal ?? "");
    setAvatarUrl(profile.avatar_url ?? null);
    setColor(profile.color);
  }, [profile]);

  const [cameraOpen, setCameraOpen] = useState(false);

  const uploadBlob = useCallback(async (blob: Blob, ext: string, contentType: string) => {
    if (!user || !profile) return;
    if (blob.size > 5 * 1024 * 1024) { toast.error("Image must be under 5 MB"); return; }
    setUploading(true);
    try {
      const path = `avatars/${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("event-media")
        .upload(path, blob, { upsert: true, contentType });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("event-media").getPublicUrl(path);
      const url = pub.publicUrl;
      const { error: updErr } = await supabase
        .from("profiles")
        .update({ avatar_url: url })
        .eq("id", profile.id);
      if (updErr) throw updErr;
      setAvatarUrl(url);
      toast.success("Profile photo updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [user, profile]);

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image"); return; }
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    await uploadBlob(file, ext, file.type);
  };

  const onSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName,
          email,
          company,
          linkedin,
          track,
          goal,
          emoji,
        })
        .eq("id", profile.id);
      if (error) throw error;
      toast.success("Saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const onSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  if (loading || !profile) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-20 text-center text-sm text-muted-foreground">
        Loading your profile…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">— Your profile</div>
      <h1 className="mt-2 font-display text-4xl font-semibold">Settings<span className="text-lime">.</span></h1>

      <div className="mt-10 grid gap-6 md:grid-cols-[300px,1fr]">
        {/* Avatar card */}
        <div className="rounded-3xl border border-border bg-surface p-6 text-center">
          <div
            className="mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded-full text-6xl shadow-card"
            style={{
              backgroundColor: color,
              backgroundImage: avatarUrl ? `url(${avatarUrl})` : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            {!avatarUrl && emoji}
          </div>
          <div className="mt-4 font-display text-lg font-semibold">{displayName || "You"}</div>
          <div className="text-xs text-muted-foreground">{company || "—"}</div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onPickFile}
          />
          <div className="mt-5 space-y-2">
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background py-2 text-xs hover:bg-surface-2 disabled:opacity-60"
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
              {uploading ? "Uploading…" : "Upload photo"}
            </button>
            <button
              type="button"
              disabled={uploading}
              onClick={() => setCameraOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-lime py-2 text-xs font-semibold text-primary-foreground shadow-glow hover:scale-[1.01] disabled:opacity-60"
            >
              <Camera className="h-3.5 w-3.5" /> Take a selfie
            </button>
          </div>
        </div>

        {cameraOpen && (
          <CameraModal
            onClose={() => setCameraOpen(false)}
            onCapture={async (blob) => {
              await uploadBlob(blob, "jpg", "image/jpeg");
              setCameraOpen(false);
            }}
          />
        )}

        {/* Forms */}
        <div className="space-y-6">
          <Card title="Choose your emoji (used if no photo)">
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
              <Field label="Display name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              <Field label="Email" value={email} onChange={(e) => setEmail(e.target.value)} icon={Mail} />
              <Field label="Company / University" value={company} onChange={(e) => setCompany(e.target.value)} />
              <Field label="LinkedIn" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} icon={Linkedin} />
              <Field label="Track" value={track} onChange={(e) => setTrack(e.target.value)} />
            </div>
          </Card>

          <Card title="Your goal at events">
            <textarea
              rows={3}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="w-full rounded-xl border border-input bg-background p-3 text-sm outline-none focus:border-lime"
            />
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-lime" />
              We use this to match you in break rooms.
            </div>
          </Card>

          <div className="flex items-center justify-between gap-3">
            <button onClick={onSignOut} className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs text-muted-foreground hover:bg-surface">
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-full bg-lime px-5 py-2.5 text-xs font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              {saving ? "Saving…" : "Save changes"}
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
