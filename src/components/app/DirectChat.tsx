import { useEffect, useMemo, useRef, useState } from "react";
import { Send, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/hooks/useAuth";
import { getInitials } from "@/lib/initials";
import { ChatSwitcher, type ChatTarget } from "./ChatSwitcher";

export type DM = {
  id: string;
  event_id: string;
  sender_profile_id: string;
  recipient_profile_id: string;
  text: string | null;
  created_at: string;
};

function firstName(name: string) {
  return name.split(" ")[0];
}

export function DirectChat({
  eventId,
  me,
  peer,
  switcherItems,
  onSwitch,
  onClose,
  onMarkRead,
}: {
  eventId: string;
  me: Profile;
  peer: Profile;
  switcherItems: ChatTarget[];
  onSwitch: (t: ChatTarget) => void;
  onClose: () => void;
  onMarkRead: () => void;
}) {
  const [messages, setMessages] = useState<DM[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const pair = useMemo(() => ({ a: me.id, b: peer.id }), [me.id, peer.id]);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("direct_messages")
      .select("*")
      .eq("event_id", eventId)
      .or(
        `and(sender_profile_id.eq.${pair.a},recipient_profile_id.eq.${pair.b}),and(sender_profile_id.eq.${pair.b},recipient_profile_id.eq.${pair.a})`
      )
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("load DMs failed", error);
          return;
        }
        setMessages((data ?? []) as DM[]);
        requestAnimationFrame(() => sentinelRef.current?.scrollIntoView({ behavior: "auto" }));
      });

    const ch = supabase
      .channel(`dm-${eventId}-${pair.a}-${pair.b}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages", filter: `event_id=eq.${eventId}` },
        (payload) => {
          const row = payload.new as DM;
          const between =
            (row.sender_profile_id === pair.a && row.recipient_profile_id === pair.b) ||
            (row.sender_profile_id === pair.b && row.recipient_profile_id === pair.a);
          if (!between) return;
          setMessages((m) => (m.some((x) => x.id === row.id) ? m : [...m, row]));
          requestAnimationFrame(() => sentinelRef.current?.scrollIntoView({ behavior: "smooth" }));
          onMarkRead();
        }
      )
      .subscribe();

    onMarkRead();

    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, pair.a, pair.b]);

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    const { data, error } = await supabase
      .from("direct_messages")
      .insert({
        event_id: eventId,
        sender_profile_id: me.id,
        recipient_profile_id: peer.id,
        text,
      })
      .select()
      .single();
    setSending(false);
    if (error) {
      console.error("send DM failed", error);
      toast.error("Couldn't send message");
      return;
    }
    if (data) {
      setMessages((m) => (m.some((x) => x.id === (data as DM).id) ? m : [...m, data as DM]));
      onMarkRead();
    }
    setDraft("");
    requestAnimationFrame(() => sentinelRef.current?.scrollIntoView({ behavior: "smooth" }));
  };

  return (
    <div className="absolute inset-0 z-50 flex justify-end bg-background/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-md flex-col border-l border-border bg-popover shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 border-b border-border p-4">
          <div className="flex min-w-0 items-center gap-3">
            {peer.avatar_url ? (
              <img src={peer.avatar_url} alt={peer.display_name} className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold"
                style={{ backgroundColor: peer.color, color: "#0a0a0a" }}
              >
                {getInitials(peer.display_name)}
              </div>
            )}
            <div className="min-w-0">
              <div className="truncate font-display text-sm font-semibold">{peer.display_name}</div>
              <div className="text-[10px] text-muted-foreground">Private chat · just the two of you</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ChatSwitcher items={switcherItems} current={{ kind: "dm", peerId: peer.id }} onSelect={onSwitch} />
            <button onClick={onClose}>
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="py-12 text-center text-xs text-muted-foreground">
              Say hi to {firstName(peer.display_name)} 👋
            </div>
          )}
          {messages.map((m) => {
            const mine = m.sender_profile_id === me.id;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                    mine ? "bg-lime text-primary-foreground" : "bg-surface text-foreground"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            );
          })}
          <div ref={sentinelRef} />
        </div>

        <div className="border-t border-border p-3">
          <div className="flex items-center gap-1 rounded-2xl border border-border bg-background/60 p-1.5">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder={`Message ${firstName(peer.display_name)}…`}
              className="flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground"
            />
            <button
              onClick={send}
              disabled={!draft.trim() || sending}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-lime text-primary-foreground disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
