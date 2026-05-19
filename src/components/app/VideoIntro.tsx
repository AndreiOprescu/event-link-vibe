import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Loader2, Video, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Props = {
  eventId: string;
  userId: string;
  onClose: () => void;
  onSaved: (url: string, durationSec: number) => void;
};

const MAX_SECONDS = 120;

export function VideoIntroRecorder({ eventId, userId, onClose, onSaved }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const tickRef = useRef<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [uploading, setUploading] = useState(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startStream = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 } },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        await videoRef.current.play().catch(() => {});
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't access camera & mic");
    }
  }, []);

  useEffect(() => {
    startStream();
    return () => {
      stopStream();
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopRecording = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
    if (tickRef.current) { window.clearInterval(tickRef.current); tickRef.current = null; }
    setRecording(false);
  }, []);

  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mimeType =
      MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus") ? "video/webm;codecs=vp9,opus" :
      MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus") ? "video/webm;codecs=vp8,opus" :
      "video/webm";
    const rec = new MediaRecorder(streamRef.current, { mimeType });
    rec.ondataavailable = (ev) => { if (ev.data.size > 0) chunksRef.current.push(ev.data); };
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      setPreviewBlob(blob);
      setPreview(URL.createObjectURL(blob));
      stopStream();
    };
    recorderRef.current = rec;
    rec.start();
    setRecording(true);
    setElapsed(0);
    tickRef.current = window.setInterval(() => {
      setElapsed((s) => {
        const next = s + 1;
        if (next >= MAX_SECONDS) stopRecording();
        return next;
      });
    }, 1000);
  };

  const retake = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setPreviewBlob(null);
    setElapsed(0);
    startStream();
  };

  const upload = async () => {
    if (!previewBlob) return;
    setUploading(true);
    try {
      const path = `intros/${eventId}/${userId}/${Date.now()}.webm`;
      const { error: upErr } = await supabase.storage
        .from("event-media")
        .upload(path, previewBlob, { upsert: true, contentType: previewBlob.type || "video/webm" });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("event-media").getPublicUrl(path);
      const url = pub.publicUrl;
      const { error: updErr } = await supabase
        .from("event_members")
        .update({ intro_video_url: url, intro_duration_seconds: elapsed })
        .eq("user_id", userId)
        .eq("event_id", eventId);
      if (updErr) throw updErr;
      toast.success("Intro video saved");
      onSaved(url, elapsed);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    stopRecording();
    stopStream();
    if (preview) URL.revokeObjectURL(preview);
    onClose();
  };

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  const remaining = MAX_SECONDS - elapsed;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/85 p-4 backdrop-blur-md" onClick={handleClose}>
      <div className="w-full max-w-lg rounded-3xl border border-border bg-popover p-6 shadow-card" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 font-display text-base font-semibold">
            <Video className="h-4 w-4 text-lime" /> Record your intro
          </div>
          <button onClick={handleClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        <p className="text-xs text-muted-foreground">
          Introduce yourself, and what were your key takeaways from the event? You have up to 2 minutes.
        </p>

        <div className="relative mt-4 aspect-video w-full overflow-hidden rounded-2xl border border-border bg-background">
          {error ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground">
              <span>{error}</span>
              <button onClick={startStream} className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-surface">Retry</button>
            </div>
          ) : preview ? (
            <video src={preview} controls playsInline className="h-full w-full bg-black object-contain" />
          ) : (
            <video ref={videoRef} playsInline muted className="h-full w-full object-cover" style={{ transform: "scaleX(-1)" }} />
          )}
          {recording && (
            <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-destructive/90 px-3 py-1 text-[11px] font-semibold text-destructive-foreground">
              <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
              REC {mm}:{ss}
              <span className="ml-1 opacity-80">· {remaining}s left</span>
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center justify-center gap-3">
          {preview ? (
            <>
              <button onClick={retake} disabled={uploading} className="flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-xs hover:bg-surface-2 disabled:opacity-60">
                Retake
              </button>
              <button onClick={upload} disabled={uploading} className="flex items-center gap-2 rounded-full bg-lime px-5 py-2 text-xs font-semibold text-primary-foreground shadow-glow disabled:opacity-60">
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {uploading ? "Saving…" : "Save intro"}
              </button>
            </>
          ) : recording ? (
            <button onClick={stopRecording} className="flex items-center gap-2 rounded-full bg-destructive px-6 py-2.5 text-sm font-semibold text-destructive-foreground shadow-glow">
              Stop
            </button>
          ) : (
            <button onClick={startRecording} disabled={!!error} className="flex items-center gap-2 rounded-full bg-lime px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60">
              <Camera className="h-4 w-4" /> Start recording
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function VideoIntroPrompt({ onRecord, onSkip }: { onRecord: () => void; onSkip: () => void }) {
  return (
    <div className="absolute bottom-6 left-1/2 z-40 w-[min(420px,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border border-lime/40 bg-popover/95 p-4 shadow-glow backdrop-blur-md">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-lime/15 p-2 text-lime">
          <Video className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <div className="font-display text-sm font-semibold">Want to introduce yourself on video?</div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Up to 2 minutes — totally optional. Plays when someone taps your bubble.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button onClick={onRecord} className="rounded-full bg-lime px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow">
              Record now
            </button>
            <button onClick={onSkip} className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function VideoIntroModal({ onRecord, onSkip }: { onRecord: () => void; onSkip: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-background/85 p-4 backdrop-blur-md"
      onClick={onSkip}
    >
      <div
        className="w-full max-w-lg rounded-3xl border border-border bg-popover p-8 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-lime">
          <Video className="h-3 w-3" /> One more thing
        </div>
        <h2 className="mt-2 font-display text-2xl font-semibold leading-tight">
          Add a video intro
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Up to 2 minutes. It plays when someone taps your bubble in the room — so they instantly
          know who you are. Pick a prompt or do your own thing:
        </p>

        <div className="mt-5 space-y-2">
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Option 1</div>
            <div className="mt-1 font-display text-sm font-semibold">Introduce yourself</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              Who you are, what you're working on, what you're looking for.
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Option 2</div>
            <div className="mt-1 font-display text-sm font-semibold">What do you think of the event so far?</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              A quick hot-take, favourite moment, or who you've enjoyed meeting.
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={onRecord}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-lime py-3 text-sm font-semibold text-primary-foreground shadow-glow transition hover:scale-[1.01]"
          >
            <Camera className="h-4 w-4" /> Record video
          </button>
          <button
            onClick={onSkip}
            className="w-full rounded-full py-2 text-xs text-muted-foreground hover:text-foreground"
          >
            Skip for now — you can add one later from your own bubble.
          </button>
        </div>
      </div>
    </div>
  );
}
