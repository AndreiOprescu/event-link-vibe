import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Check, Loader2, RefreshCw, X } from "lucide-react";

export function CameraModal({ onClose, onCapture }: { onClose: () => void; onCapture: (blob: Blob) => Promise<void> | void }) {
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
