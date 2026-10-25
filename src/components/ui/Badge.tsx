interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "error" | "warning" | "info" | "accent" | "ink";
  className?: string;
}

const variantClasses: Record<NonNullable<BadgeProps["variant"]>, string> = {
  default: "tag",
  success: "tag tag-ok",
  error: "tag tag-bad",
  warning: "tag tag-warn",
  info: "tag tag-info",
  accent: "tag",
  ink: "tag tag-ink",
};

export function Badge({
  children,
  variant = "default",
  className = "",
}: BadgeProps) {
  return <span className={`${variantClasses[variant]} ${className}`.trim()}>{children}</span>;
}
