type BubbleUser = { id: string; name: string; emoji: string; color: string };

type Props = {
  user: BubbleUser;
  size?: number;
  ringClass?: string;
  label?: boolean;
  onClick?: () => void;
};

export function AvatarBubble({ user, size = 56, ringClass, label, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-center gap-1 outline-none"
    >
      <div
        className={`flex items-center justify-center rounded-full border-2 border-background text-2xl shadow-card transition-transform group-hover:scale-110 ${ringClass ?? ""}`}
        style={{
          width: size,
          height: size,
          backgroundColor: user.color,
          fontSize: size * 0.5,
        }}
      >
        <span>{user.emoji}</span>
      </div>
      {label && (
        <span className="max-w-[80px] truncate text-[10px] font-medium text-muted-foreground group-hover:text-foreground">
          {user.name}
        </span>
      )}
    </button>
  );
}
