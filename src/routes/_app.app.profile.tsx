import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Check, ImageIcon, Linkedin, Loader2, LogOut, Mail, RefreshCw, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getInitials } from "@/lib/initials";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/app/profile")({
  head: () => ({ meta: [{ title: "Profile — EventLabs" }] }),
  component: Profile,
});

function Profile() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [track, setTrack] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [color, setColor] = useState("#A3E635");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name);
    setEmail(profile.email ?? "");
    setCompany(profile.company ?? "");
    setRole(profile.role ?? "");
    setLinkedin(profile.linkedin ?? "");
    setTrack(profile.track ?? "");
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

function CameraModal({ onClose, onCapture }: { onClose: () => void; onCapture: (blob: Blob) => Promise<void> | void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startStream = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't access camera");
    }
  }, []);

  useEffect(() => {
    startStream();
    return () => { stopStream(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const size = Math.min(video.videoWidth, video.videoHeight, 720);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const srcSize = Math.min(video.videoWidth, video.videoHeight);
    const sx = (video.videoWidth - srcSize) / 2;
    const sy = (video.videoHeight - srcSize) / 2;
    ctx.drawImage(video, sx, sy, srcSize, srcSize, 0, 0, size, size);
    canvas.toBlob((blob) => {
      if (!blob) return;
      setPreviewBlob(blob);
      setPreview(URL.createObjectURL(blob));
      stopStream();
    }, "image/jpeg", 0.9);
  };

  const retake = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setPreviewBlob(null);
    startStream();
  };

  const confirm = async () => {
    if (!previewBlob) return;
    setBusy(true);
    try { await onCapture(previewBlob); } finally { setBusy(false); }
  };

  const handleClose = () => {
    stopStream();
    if (preview) URL.revokeObjectURL(preview);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm" onClick={handleClose}>
      <div className="w-full max-w-md rounded-3xl border border-border bg-popover p-5 shadow-card" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <div className="font-display text-base font-semibold">Take a selfie</div>
          <button onClick={handleClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-background">
          {error ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground">
              <span>{error}</span>
              <button onClick={startStream} className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-surface">Retry</button>
            </div>
          ) : preview ? (
            <img src={preview} alt="Captured selfie" className="h-full w-full object-cover" />
          ) : (
            <>
              <video ref={videoRef} playsInline muted className="h-full w-full object-cover" style={{ transform: "scaleX(-1)" }} />
              <div className="pointer-events-none absolute inset-4 rounded-full border-2 border-lime/60" />
            </>
          )}
        </div>

        <div className="mt-5 flex items-center justify-center gap-3">
          {preview ? (
            <>
              <button onClick={retake} disabled={busy} className="flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-xs hover:bg-surface-2 disabled:opacity-60">
                <RefreshCw className="h-3.5 w-3.5" /> Retake
              </button>
              <button onClick={confirm} disabled={busy} className="flex items-center gap-2 rounded-full bg-lime px-5 py-2 text-xs font-semibold text-primary-foreground shadow-glow disabled:opacity-60">
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                {busy ? "Uploading…" : "Use photo"}
              </button>
            </>
          ) : (
            <button onClick={capture} disabled={!!error} className="flex items-center gap-2 rounded-full bg-lime px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60">
              <Camera className="h-4 w-4" /> Capture
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
