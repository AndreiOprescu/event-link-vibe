import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Props = {
  eventId: string;
  eventTitle: string;
  userId: string;
  onComplete: () => void;
};

export function EventIntakeModal({ eventId, eventTitle, userId, onComplete }: Props) {
  const [goal, setGoal] = useState("");
  const [intro, setIntro] = useState("");
  const [busy, setBusy] = useState(false);

  const canSubmit = goal.trim().length >= 3 && intro.trim().length >= 3 && !busy;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("event_members")
        .upsert(
          {
            user_id: userId,
            event_id: eventId,
            goal: goal.trim(),
            intro: intro.trim(),
          },
          { onConflict: "user_id,event_id" },
        );
      if (error) throw error;
      onComplete();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/85 p-4 backdrop-blur-md">
      <div className="w-full max-w-lg rounded-3xl border border-border bg-popover p-8 shadow-card">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-lime">
          <Sparkles className="h-3 w-3" /> Welcome
        </div>
        <h2 className="mt-2 font-display text-2xl font-semibold leading-tight">
          Welcome to {eventTitle}.
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Two quick questions so the room can find you.
        </p>

        <div className="mt-6 space-y-5">
          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              What would you like to get out of this event?
            </label>
            <textarea
              autoFocus
              rows={3}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. Meet two technical co-founders, learn about applied AI…"
              className="mt-2 w-full rounded-xl border border-input bg-background p-3 text-sm outline-none focus:border-lime"
            />
          </div>

          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Introduce yourself
            </label>
            <p className="mt-1 text-[11px] text-muted-foreground">A sentence or two — who you are, what you're working on.</p>
            <textarea
              rows={3}
              value={intro}
              onChange={(e) => setIntro(e.target.value)}
              placeholder="I'm Maya, building infra tools at Northwind…"
              className="mt-2 w-full rounded-xl border border-input bg-background p-3 text-sm outline-none focus:border-lime"
            />
          </div>
        </div>

        <button
          disabled={!canSubmit}
          onClick={submit}
          className="mt-7 flex w-full items-center justify-center gap-2 rounded-full bg-lime py-3 text-sm font-semibold text-primary-foreground shadow-glow transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {busy ? "Saving…" : "Enter the room"}
        </button>
        <p className="mt-3 text-center text-[11px] text-muted-foreground">Required to join — you only answer once per event.</p>
      </div>
    </div>
  );
}
