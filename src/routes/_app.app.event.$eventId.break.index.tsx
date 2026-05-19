import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { useBreakRoomIndex } from "@/hooks/useBreakRoomIndex";
import { BREAK_ROOMS, BREAK_SEATS_PER_ROOM, normalizeGoal } from "@/data/break";

export const Route = createFileRoute("/_app/app/event/$eventId/break/")({
  head: () => ({ meta: [{ title: "Break rooms — EventLabs" }] }),
  component: BreakRedirect,
});

function BreakRedirect() {
  const { eventId } = Route.useParams();
  const { profile } = useAuth();
  const index = useBreakRoomIndex(eventId, true);
  const myGoal = normalizeGoal(profile?.goal);

  const candidates = BREAK_ROOMS.map((r) => {
    const e = index[r.id];
    return {
      id: r.id,
      count: e?.count ?? 0,
      sameGoal: e?.goalCounts[myGoal] ?? 0,
      order: BREAK_ROOMS.indexOf(r),
    };
  }).filter((r) => r.count < BREAK_SEATS_PER_ROOM);

  candidates.sort((a, b) => {
    if (b.sameGoal !== a.sameGoal) return b.sameGoal - a.sameGoal;
    if (b.count !== a.count) return b.count - a.count;
    return a.order - b.order;
  });

  const target = candidates[0]?.id ?? "room-01";

  return <Navigate to="/app/event/$eventId/break/$roomId" params={{ eventId, roomId: target }} replace />;
}
