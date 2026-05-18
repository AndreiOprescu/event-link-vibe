// 15 purpose-named break rooms + 12 preset goals for smart matching.

export type BreakRoom = {
  id: string;
  emoji: string;
  name: string;
  blurb: string;
};

export const BREAK_ROOMS: BreakRoom[] = [
  { id: "room-01", emoji: "💬", name: "Open Chat", blurb: "Casual room, anything goes" },
  { id: "room-02", emoji: "🧠", name: "Deep Discussion", blurb: "Slow, thoughtful threads" },
  { id: "room-03", emoji: "🚀", name: "Project Showcase", blurb: "Show what you're building" },
  { id: "room-04", emoji: "🤝", name: "Co-founder Match", blurb: "Find a co-founder" },
  { id: "room-05", emoji: "🐛", name: "Debug Together", blurb: "Paste code, get help" },
  { id: "room-06", emoji: "💡", name: "Idea Jam", blurb: "Brainstorm new ideas" },
  { id: "room-07", emoji: "🎨", name: "Design Critique", blurb: "Get feedback on UI/UX" },
  { id: "room-08", emoji: "📣", name: "Pitch Practice", blurb: "Rehearse your pitch" },
  { id: "room-09", emoji: "📚", name: "Learn & Teach", blurb: 'Ask/answer "how do I…"' },
  { id: "room-10", emoji: "🔌", name: "API & Tools Talk", blurb: "LLMs, integrations, stacks" },
  { id: "room-11", emoji: "💸", name: "Funding Chat", blurb: "Investors, grants, runway" },
  { id: "room-12", emoji: "📈", name: "Growth & Users", blurb: "Distribution, marketing" },
  { id: "room-13", emoji: "☕", name: "Coffee Break", blurb: "Pure small talk, no work" },
  { id: "room-14", emoji: "🧘", name: "Quiet Room", blurb: "Low-volume, focus-friendly" },
  { id: "room-15", emoji: "🌐", name: "Hiring & Gigs", blurb: "Who's hiring / looking" },
];

export const BREAK_SEATS_PER_ROOM = 4;

export type BreakGoal = { id: string; emoji: string; label: string };

export const BREAK_GOALS: BreakGoal[] = [
  { id: "ship-mvp", emoji: "🚀", label: "Ship an MVP this weekend" },
  { id: "find-cofounder", emoji: "🧠", label: "Find an AI co-founder" },
  { id: "pair-designer", emoji: "🎨", label: "Pair with a designer" },
  { id: "pair-engineer", emoji: "⚙️", label: "Pair with an engineer" },
  { id: "get-funding", emoji: "💸", label: "Get funding / find investors" },
  { id: "find-users", emoji: "📈", label: "Find early users" },
  { id: "learn-ai-tools", emoji: "🧪", label: "Learn new AI tools" },
  { id: "integrate-llms", emoji: "🔌", label: "Integrate LLM APIs" },
  { id: "build-agents", emoji: "🤖", label: "Build autonomous agents" },
  { id: "practice-demoing", emoji: "🎙️", label: "Practice demoing" },
  { id: "mentor-mentee", emoji: "🧑‍🏫", label: "Mentor / be mentored" },
  { id: "just-vibe", emoji: "🍕", label: "Just vibe & meet people" },
];

export function normalizeGoal(raw: string | null | undefined): string {
  if (!raw) return "just-vibe";
  if (BREAK_GOALS.some((g) => g.id === raw)) return raw;
  return "just-vibe";
}

export function getRoom(roomId: string): BreakRoom | undefined {
  return BREAK_ROOMS.find((r) => r.id === roomId);
}
