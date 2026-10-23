import type { PropsWithChildren } from "react";

interface GlassCardProps extends PropsWithChildren {
  className?: string;
  as?: "div" | "section" | "article";
}

export function GlassCard({ children, className = "", as = "div" }: GlassCardProps) {
  const Component = as;

  return <Component className={`glass-card ${className}`}>{children}</Component>;
}
