import { cn } from "@/lib/utils";

interface HappyRobotLogoProps {
  className?: string;
  /** Show icon + wordmark (default). Set to "wordmark" for text only. */
  variant?: "full" | "wordmark";
  /** Size preset for icon + text scaling */
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-7",
  md: "h-9",
  lg: "h-12",
};

export function HappyRobotLogo({
  className,
  variant = "full",
  size = "lg",
}: HappyRobotLogoProps) {
  const sizeClass = sizeClasses[size];
  const iconSize = size === "sm" ? 24 : size === "md" ? 32 : 40;

  return (
    <div
      className={cn(
        "flex items-center gap-3 font-semibold tracking-tight text-foreground",
        sizeClass,
        className
      )}
    >
      {variant === "full" && (
        <img
          src="/happyrobot.png"
          alt=""
          width={iconSize}
          height={iconSize}
          style={{ width: iconSize, height: iconSize }}
          className="shrink-0 object-contain invert"
          aria-hidden
        />
      )}
      <span className="text-[1em] leading-none">HappyRobot</span>
    </div>
  );
}
