import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AVATARS, ME } from "@/data/mock";
import { ArrowLeft, Linkedin, Mail, Mic, Send, Video, X } from "lucide-react";

export const Route = createFileRoute("/_app/app/event/$eventId/break")({
  head: () => ({ meta: [{ title: "Break room — EventLabs" }] }),
  component: BreakRoom,
});

function BreakRoom() {
  const { eventId } = Route.useParams();
  // 6 matched people + me = 7 around the table
  const matched = useMemo(() => AVATARS.slice(0, 6), []);
  const all = [...matched, ME];

  const [msgs, setMsgs] = useState<{ id: string; userId: string; text: string }[]>([
    { id: "1", userId: "u1", text: "okay let's go around — what's everyone working on?" },
    { id: "2", userId: "u3", text: "matchmaking via embedding similarity" },
    { id: "3", userId: "u2", text: "you'd love what Ria is doing then 👀" },
  ]);
  const [draft, setDraft] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  // floating bubbles over heads
  const [floats, setFloats] = useState<{ id: string; userId: string; text: string }[]>([]);
  useEffect(() => {
    const id = setInterval(() => {
      const s = matched[Math.floor(Math.random() * matched.length)];
      const f = { id: crypto.randomUUID(), userId: s.id, text: ["nice 👌", "say more", "100%", "hmm interesting", "🤝"][Math.floor(Math.random() * 5)] };
      setFloats((m) => [...m, f]);
      setTimeout(() => setFloats((m) => m.filter((x) => x.id !== f.id)), 5000);
    }, 2400);
    return () => clearInterval(id);
  }, [matched]);

  const sel = selected ? all.find((a) => a.id === selected) : null;

  return (
    <div className="relative h-[calc(100vh-3.5rem)] overflow-hidden bg-background">
      <div className="absolute left-0 right-0 top-0 z-30 flex items-center justify-between px-6 py-4">
        <Link
          to="/app/event/$eventId"
          params={{ eventId }}
          className="flex items-center gap-2 rounded-full border border-border bg-background/70 px-4 py-2 text-xs backdrop-blur-md hover:bg-surface"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to the room
        </Link>
        <div className="flex items-center gap-2 rounded-full border border-lime/30 bg-lime/10 px-4 py-2 text-xs font-medium text-lime">
          ☕ Break room · matched by goal
        </div>
        <div className="w-24" />
      </div>

      {/* Round table */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative h-[78vmin] w-[78vmin] max-h-[640px] max-w-[640px]">
          {/* Table */}
          <div className="absolute inset-[18%] rounded-full border border-border bg-surface shadow-card">
            <div className="absolute inset-6 flex flex-col items-center justify-center rounded-full border border-dashed border-border/60 text-center">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Table · 7 seats</div>
              <div className="mt-2 font-display text-2xl font-semibold text-lime">AI × IRL</div>
              <div className="mt-1 max-w-[60%] text-xs text-muted-foreground">
                You and 6 others want to "find collaborators for AI projects."
              </div>
            </div>
          </div>

          {/* Seats */}
          {all.map((u, i) => {
            const angle = (i / all.length) * Math.PI * 2 - Math.PI / 2;
            const r = 46; // % radius
            const cx = 50 + Math.cos(angle) * r;
            const cy = 50 + Math.sin(angle) * r;
            const isMe = u.id === ME.id;
            const float = floats.find((f) => f.userId === u.id);
            return (
              <div
                key={u.id}
                className="absolute"
                style={{ left: `${cx}%`, top: `${cy}%`, transform: "translate(-50%, -50%)" }}
              >
                <div className="relative">
                  {float && (
                    <div className="msg-float absolute -top-12 left-1/2 max-w-[180px] -translate-x-1/2 rounded-2xl border border-border bg-popover px-3 py-1.5 text-xs shadow-card">
                      {float.text}
                    </div>
                  )}
                  <button
                    onClick={() => setSelected(u.id)}
                    onMouseEnter={() => setSelected(u.id)}
                    className={`flex h-16 w-16 items-center justify-center rounded-full text-3xl shadow-card transition hover:scale-110 ${isMe ? "ring-4 ring-lime ring-offset-2 ring-offset-background" : ""}`}
                    style={{ backgroundColor: u.color }}
                  >
                    {u.emoji}
                  </button>
                  <div className="mt-1 text-center text-[10px] font-medium text-muted-foreground">
                    {isMe ? "you" : u.name.split(" ")[0]}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chat panel */}
      <div className="absolute inset-x-0 bottom-0 z-30 px-4 pb-4">
        <div className="mx-auto max-w-2xl rounded-3xl border border-border bg-background/90 p-4 shadow-card backdrop-blur-xl">
          <div className="mb-3 max-h-40 space-y-2 overflow-y-auto">
            {msgs.map((m) => {
              const u = all.find((a) => a.id === m.userId) ?? ME;
              const mine = u.id === ME.id;
              return (
                <div key={m.id} className={`flex items-start gap-2 ${mine ? "justify-end" : ""}`}>
                  {!mine && (
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs" style={{ backgroundColor: u.color }}>{u.emoji}</div>
                  )}
                  <div className={`max-w-[70%] rounded-2xl px-3 py-1.5 text-sm ${mine ? "bg-lime text-primary-foreground" : "bg-surface"}`}>
                    {!mine && <div className="text-[10px] font-semibold opacity-70">{u.name.split(" ")[0]}</div>}
                    {m.text}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <button className="rounded-full p-2 text-muted-foreground hover:text-lime"><Mic className="h-4 w-4" /></button>
            <button className="rounded-full p-2 text-muted-foreground hover:text-lime"><Video className="h-4 w-4" /></button>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && draft.trim()) {
                  setMsgs((m) => [...m, { id: crypto.randomUUID(), userId: ME.id, text: draft }]);
                  setDraft("");
                }
              }}
              placeholder="Say something to the table…"
              className="flex-1 rounded-full bg-surface px-4 py-2 text-sm outline-none"
            />
            <button
              onClick={() => {
                if (!draft.trim()) return;
                setMsgs((m) => [...m, { id: crypto.randomUUID(), userId: ME.id, text: draft }]);
                setDraft("");
              }}
              className="rounded-full bg-lime p-2 text-primary-foreground"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Side profile */}
      {sel && sel.id !== ME.id && (
        <div className="absolute right-4 top-20 z-40 w-72 rounded-2xl border border-border bg-popover p-5 shadow-card">
          <button onClick={() => setSelected(null)} className="absolute right-3 top-3 text-muted-foreground"><X className="h-4 w-4" /></button>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full text-2xl" style={{ backgroundColor: sel.color }}>{sel.emoji}</div>
            <div>
              <div className="font-display text-base font-semibold">{sel.name}</div>
              <div className="text-xs text-muted-foreground">{sel.role} · {sel.company}</div>
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-lime/30 bg-lime/5 p-3 text-xs">
            <div className="font-mono uppercase tracking-widest text-lime">Goal</div>
            <div className="mt-1 text-foreground">{sel.goal}</div>
          </div>
          <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-2"><Linkedin className="h-3 w-3" /> {sel.linkedin}</div>
            <div className="flex items-center gap-2"><Mail className="h-3 w-3" /> {sel.email}</div>
          </div>
          <button className="mt-4 w-full rounded-full bg-lime py-2 text-xs font-semibold text-primary-foreground">
            Connect on LinkedIn
          </button>
        </div>
      )}
    </div>
  );
}
