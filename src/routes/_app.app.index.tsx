import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Hash, Plus, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_app/app/")({
  head: () => ({ meta: [{ title: "Your events — EventLabs" }] }),
  component: MainScreen,
});

type Tab = "live" | "upcoming" | "past";
type Event = {
  id: string;
  code: string;
  title: string;
  host: string;
  date_label: string;
  status: Tab;
  color: string;
  attendees: number;
};

function MainScreen() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("live");
  const [code, setCode] = useState("");
  const [events, setEvents] = useState<Event[]>([]);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    supabase.from("events").select("*").order("created_at", { ascending: true }).then(({ data }) => {
      setEvents((data ?? []) as Event[]);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("event_members")
      .select("event_id")
      .eq("user_id", user.id)
      .then(({ data }) => {
        setJoinedIds(new Set((data ?? []).map((r: { event_id: string }) => r.event_id)));
      });
  }, [user?.id]);

  const hasJoined = joinedIds.size > 0;
  const filtered = events.filter((e) => e.status === tab);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">— Your rooms</div>
          <h1 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">
            Drop into an event<span className="text-lime">.</span>
          </h1>
          <p className="mt-2 max-w-lg text-sm text-muted-foreground">
            Events stay open from the moment they're created until 48 hours after they end.
          </p>
        </div>

        <div className="flex w-full max-w-sm items-center gap-2 rounded-2xl border border-border bg-surface p-2">
          <Hash className="ml-2 h-4 w-4 text-muted-foreground" />
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ENTER EVENT CODE"
            className="flex-1 bg-transparent font-mono text-sm tracking-widest outline-none placeholder:text-muted-foreground"
          />
          <Link
            to="/app/event/$eventId"
            params={{ eventId: events.find((e) => e.code === code)?.id ?? "e1" }}
            className="flex items-center gap-1 rounded-xl bg-lime px-4 py-2 text-xs font-semibold text-primary-foreground"
          >
            Join <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      <div className="mt-12 flex items-center gap-1 rounded-full border border-border bg-surface p-1 sm:w-fit">
        {(["live", "upcoming", "past"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-full px-5 py-2 text-xs font-medium capitalize transition sm:flex-none ${
              tab === t ? "bg-lime text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "live" && "● "}{t}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((e) => (
          <Link
            key={e.id}
            to="/app/event/$eventId"
            params={{ eventId: e.id }}
            className="group relative overflow-hidden rounded-3xl border border-border bg-surface p-6 transition hover:border-lime/40 hover:shadow-glow"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{e.code}</span>
              {e.status === "live" && (
                <span className="flex items-center gap-1.5 rounded-full bg-lime/15 px-2 py-0.5 text-[10px] font-medium text-lime">
                  <span className="h-1.5 w-1.5 rounded-full bg-lime pulse-lime" />
                  LIVE
                </span>
              )}
            </div>
            <h3 className="mt-12 font-display text-2xl font-semibold leading-tight">{e.title}</h3>
            <div className="mt-2 text-xs text-muted-foreground">{e.host} · {e.date_label}</div>
            <div className="mt-6 flex items-end justify-between">
              <div>
                <div className="font-display text-3xl font-semibold" style={{ color: e.color }}>{e.attendees}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">in the room</div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-lime" />
            </div>
          </Link>
        ))}

        {tab === "upcoming" && (
          <button className="flex min-h-[200px] flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-surface/40 p-6 text-muted-foreground hover:bg-surface">
            <Plus className="h-6 w-6" />
            <span className="mt-2 text-xs">Add an event</span>
          </button>
        )}
      </div>

      {tab === "past" && filtered.length > 0 && (
        <div className="mt-10 rounded-3xl border border-lime/30 bg-lime/5 p-6">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 text-lime" />
            <div>
              <div className="font-display text-lg font-semibold">Reflect on {filtered[0].title}</div>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Did you attend? Share an insight, a takeaway, or a person you'd like to remember.
              </p>
              <button className="mt-4 rounded-full bg-lime px-4 py-2 text-xs font-semibold text-primary-foreground">
                Share reflection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
