import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronDown, Coffee } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { BREAK_ROOMS, BREAK_SEATS_PER_ROOM, normalizeGoal } from "@/data/break";
import { useBreakRoomIndex, type BreakIndex } from "@/hooks/useBreakRoomIndex";

function pickBestRoom(index: BreakIndex, myGoal: string): string | null {
  const candidates = BREAK_ROOMS.map((r) => {
    const e = index[r.id];
    const count = e?.count ?? 0;
    const sameGoal = e?.goalCounts[myGoal] ?? 0;
    return { id: r.id, count, sameGoal, order: BREAK_ROOMS.indexOf(r) };
  }).filter((r) => r.count < BREAK_SEATS_PER_ROOM);

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => {
    if (b.sameGoal !== a.sameGoal) return b.sameGoal - a.sameGoal;
    if (b.count !== a.count) return b.count - a.count;
    return a.order - b.order;
  });
  return candidates[0].id;
}

export function BreakRoomPicker({ eventId, goal }: { eventId: string; goal: string | null | undefined }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const myGoal = normalizeGoal(goal);
  const index = useBreakRoomIndex(eventId, true);

  const sortedRooms = useMemo(() => BREAK_ROOMS, []);

  const handleQuickJoin = () => {
    const best = pickBestRoom(index, myGoal);
    if (!best) {
      toast.error("All break rooms are full — try again in a moment.");
      return;
    }
    navigate({ to: "/app/event/$eventId/break/$roomId", params: { eventId, roomId: best } });
  };

  return (
    <div className="flex items-stretch">
      <button
        onClick={handleQuickJoin}
        className="flex items-center gap-2 rounded-l-full bg-lime px-4 py-2 text-xs font-semibold text-primary-foreground shadow-glow hover:scale-[1.02] transition"
      >
        <Coffee className="h-3.5 w-3.5" />
        Too crowded
      </button>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            aria-label="Pick a break room"
            className="flex items-center justify-center rounded-r-full bg-lime/90 pr-3 pl-2 text-primary-foreground hover:bg-lime border-l border-primary-foreground/20"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-2">
          <div className="px-2 py-1.5 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            Break rooms · 4 seats each
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {sortedRooms.map((r) => {
              const e = index[r.id];
              const count = e?.count ?? 0;
              const sameGoal = (e?.goalCounts[myGoal] ?? 0) > 0;
              const full = count >= BREAK_SEATS_PER_ROOM;
              return (
                <button
                  key={r.id}
                  disabled={full}
                  onClick={() => {
                    setOpen(false);
                    navigate({ to: "/app/event/$eventId/break/$roomId", params: { eventId, roomId: r.id } });
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm transition ${
                    full ? "opacity-40 cursor-not-allowed" : "hover:bg-surface"
                  }`}
                >
                  <span className="text-xl">{r.emoji}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block truncate font-medium">{r.name}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">{r.blurb}</span>
                  </span>
                  <span className="flex flex-col items-end gap-0.5">
                    <span
                      className={`font-mono text-[11px] ${
                        full ? "text-destructive" : count > 0 ? "text-lime" : "text-muted-foreground"
                      }`}
                    >
                      {count}/{BREAK_SEATS_PER_ROOM}
                    </span>
                    {sameGoal && !full && (
                      <span className="rounded-full bg-lime/15 px-1.5 py-0.5 text-[9px] font-medium text-lime">
                        same goal
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
