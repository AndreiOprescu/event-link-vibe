import { getInitials } from "@/lib/initials";

type BubbleUser = { id: string; name: string; emoji?: string; color: string; avatar_url?: string | null };

type Props = {
  user: BubbleUser;
  size?: number;
  ringClass?: string;
  label?: boolean;
  onClick?: () => void;
};

export function AvatarBubble({ user, size = 56, ringClass, label, onClick }: Props) {
  const hasPhoto = !!user.avatar_url;
  const initials = getInitials(user.name);
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-center gap-1 outline-none"
    >
      <div
        className={`flex items-center justify-center overflow-hidden rounded-full border-2 border-background font-semibold text-background/90 shadow-card transition-transform group-hover:scale-110 ${ringClass ?? ""}`}
        style={{
          width: size,
          height: size,
          backgroundColor: user.color,
          fontSize: size * 0.38,
          backgroundImage: hasPhoto ? `url(${user.avatar_url})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          color: "#0a0a0a",
        }}
      >
        {!hasPhoto && <span>{initials}</span>}
      </div>
      {label && (
        <span className="max-w-[80px] truncate text-[10px] font-medium text-muted-foreground group-hover:text-foreground">
          {user.name}
        </span>
      )}
    </button>
  );
}
