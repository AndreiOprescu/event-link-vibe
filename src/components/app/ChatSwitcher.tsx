import { useEffect, useRef, useState } from "react";
import { ChevronDown, MessageCircle, Check } from "lucide-react";
import type { Profile } from "@/hooks/useAuth";
import { getInitials } from "@/lib/initials";

export type ChatTarget = { kind: "room" } | { kind: "dm"; peerId: string };

export type SwitcherPeer = {
  profile: Profile;
  unread: number;
};

export type ChatSwitcherItems = {
  roomUnread: number;
  peers: SwitcherPeer[];
};

export function ChatSwitcher({
  items,
  current,
  onSelect,
}: {
  items: ChatSwitcherItems;
  current: ChatTarget;
  onSelect: (t: ChatTarget) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const isRoom = current.kind === "room";
  const activePeerId = current.kind === "dm" ? current.peerId : null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-full border border-border bg-background/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
      >
        Chats
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-64 overflow-hidden rounded-xl border border-border bg-popover shadow-card">
          <button
            onClick={() => {
              onSelect({ kind: "room" });
              setOpen(false);
            }}
            className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-surface"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-lime">
              <MessageCircle className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-sm font-semibold">
                Room chat
                {items.roomUnread > 0 && <span className="h-1.5 w-1.5 rounded-full bg-[var(--coral,_#F26A4F)]" style={{ background: "hsl(var(--lime))" }} />}
              </div>
              <div className="text-[10px] text-muted-foreground">Everyone in this event</div>
            </div>
            {isRoom && <Check className="h-3.5 w-3.5 text-lime" />}
          </button>
          {items.peers.length === 0 ? (
            <div className="border-t border-border px-3 py-3 text-[11px] text-muted-foreground">
              No private chats yet. Tap someone's bubble to start one.
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto border-t border-border">
              {items.peers.map(({ profile: p, unread }) => {
                const active = activePeerId === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      onSelect({ kind: "dm", peerId: p.id });
                      setOpen(false);
                    }}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-surface"
                  >
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt={p.display_name} className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold"
                        style={{ backgroundColor: p.color, color: "#0a0a0a" }}
                      >
                        {getInitials(p.display_name)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 truncate text-sm font-semibold">
                        {p.display_name}
                        {unread > 0 && (
                          <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-lime px-1 text-[9px] font-bold text-primary-foreground">
                            {unread}
                          </span>
                        )}
                      </div>
                      {p.role && <div className="truncate text-[10px] text-muted-foreground">{p.role}</div>}
                    </div>
                    {active && <Check className="h-3.5 w-3.5 text-lime" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
