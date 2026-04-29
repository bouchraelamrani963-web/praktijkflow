import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  /** Add a subtle interactive lift + ring on hover. Use for clickable cards. */
  interactive?: boolean;
  /** Add a soft inner glow — for hero/featured cards. */
  glow?: boolean;
}

/**
 * Base surface container. Replaces the repeated
 *   `rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900`
 * pattern that's inlined dozens of times across the app.
 */
export function Card({ children, className = "", interactive, glow }: CardProps) {
  const interactiveCls = interactive
    ? "transition hover:border-blue-300 hover:shadow-sm dark:hover:border-blue-700"
    : "";
  const glowCls = glow
    ? "shadow-lg shadow-blue-500/5 ring-1 ring-blue-500/10 dark:shadow-blue-500/10"
    : "";

  return (
    <div
      className={`rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 ${interactiveCls} ${glowCls} ${className}`}
    >
      {children}
    </div>
  );
}
