// Mock data for the prototype
export type Avatar = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  role: string;
  company: string;
  linkedin: string;
  email: string;
  goal: string;
  track: string;
};

export const AVATARS: Avatar[] = [
  { id: "u1", name: "Maya Okafor", emoji: "🦊", color: "#A3E635", role: "Product Designer", company: "Northwind", linkedin: "maya-okafor", email: "maya@northwind.co", goal: "Find a co-founder", track: "AI × IRL" },
  { id: "u2", name: "Jules Park", emoji: "🐼", color: "#60A5FA", role: "ML Engineer", company: "Kestra", linkedin: "julespark", email: "jules@kestra.io", goal: "Hire two engineers", track: "Infra" },
  { id: "u3", name: "Sana Reyes", emoji: "🐯", color: "#F59E0B", role: "Founder", company: "Loop", linkedin: "sanareyes", email: "sana@loop.so", goal: "Raise seed round", track: "Founders" },
  { id: "u4", name: "Theo Lang", emoji: "🦉", color: "#F472B6", role: "iOS Engineer", company: "Apple", linkedin: "theolang", email: "theo@me.com", goal: "Meet creative coders", track: "Design Eng" },
  { id: "u5", name: "Nia Brooks", emoji: "🐙", color: "#34D399", role: "Researcher", company: "TU Delft", linkedin: "niabrooks", email: "n.brooks@tudelft.nl", goal: "Find PhD collaborators", track: "Research" },
  { id: "u6", name: "Kai Ortiz", emoji: "🦁", color: "#C084FC", role: "Designer", company: "Linear", linkedin: "kaiortiz", email: "kai@linear.app", goal: "Get hired", track: "Design Eng" },
  { id: "u7", name: "Aya Singh", emoji: "🦄", color: "#FB7185", role: "PM", company: "Notion", linkedin: "ayasingh", email: "aya@notion.so", goal: "Learn from founders", track: "Founders" },
  { id: "u8", name: "Ben Cole", emoji: "🐸", color: "#22D3EE", role: "Investor", company: "Index", linkedin: "bencole", email: "ben@indexvc.com", goal: "Meet AI founders", track: "Investors" },
  { id: "u9", name: "Lina Wu", emoji: "🐢", color: "#FCD34D", role: "Marketing", company: "Figma", linkedin: "linawu", email: "lina@figma.com", goal: "Community building", track: "Community" },
  { id: "u10", name: "Owen Vance", emoji: "🐧", color: "#A78BFA", role: "Eng Lead", company: "Vercel", linkedin: "owenvance", email: "owen@vercel.com", goal: "Recruit & learn", track: "Infra" },
  { id: "u11", name: "Ria Patel", emoji: "🦋", color: "#F87171", role: "AI Researcher", company: "Anthropic", linkedin: "riapatel", email: "ria@anthropic.com", goal: "Talk to builders", track: "AI × IRL" },
  { id: "u12", name: "Dax Mori", emoji: "🐺", color: "#4ADE80", role: "Founder", company: "Stealth", linkedin: "daxmori", email: "dax@hey.com", goal: "Find first 10 users", track: "Founders" },
];

export const ME: Avatar = {
  id: "me",
  name: "You",
  emoji: "🚀",
  color: "#D9F99D",
  role: "Builder",
  company: "Eurhack",
  linkedin: "you",
  email: "you@eurhack.nl",
  goal: "Make IRL events unforgettable",
  track: "AI × IRL",
};

export type EventItem = {
  id: string;
  code: string;
  title: string;
  host: string;
  date: string;
  status: "live" | "upcoming" | "past";
  attendees: number;
  color: string;
};

export const EVENTS: EventItem[] = [
  { id: "e1", code: "EURHACK26", title: "Eurhack.nl 2026", host: "EventLabs", date: "Today · Rotterdam", status: "live", attendees: 214, color: "#A3E635" },
  { id: "e2", code: "DESIGNNL", title: "Design Engineering NL", host: "Frame", date: "May 22 · Amsterdam", status: "upcoming", attendees: 84, color: "#60A5FA" },
  { id: "e3", code: "AIDEMO", title: "AI Demo Night", host: "OpenLab", date: "Jun 04 · Utrecht", status: "upcoming", attendees: 132, color: "#F472B6" },
  { id: "e4", code: "STARTSUM", title: "Startup Summit '26", host: "Index", date: "Apr 30 · Berlin", status: "past", attendees: 510, color: "#A78BFA" },
];

export type ChatMsg = {
  id: string;
  userId: string;
  text: string;
  kind: "text" | "voice" | "video";
  at: number;
};
