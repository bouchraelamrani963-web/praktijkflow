import type { ComponentProps, ReactNode } from "react";

/**
 * Visual semantic levels. Color choices match the existing app palette so this
 * component slots in alongside the inline `bg-emerald-100 text-emerald-700`
 * patterns scattered across the codebase.
 */
type BadgeTone =
  | "neutral"   // zinc — no semantic weight
  | "info"      // blue — scheduled, in-progress
  | "success"   // emerald — completed, healthy
  | "warning"   // amber — needs attention
  | "danger"    // red — no-show, critical risk
  | "muted";    // zinc — cancelled, expired

const toneClasses: Record<BadgeTone, string> = {
  neutral: "bg-zinc-100 text-zinc-700 ring-zinc-200/60 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700/60",
  info:    "bg-blue-50 text-blue-700 ring-blue-200/60 dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-800/60",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200/60 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-800/60",
  warning: "bg-amber-50 text-amber-800 ring-amber-200/60 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-800/60",
  danger:  "bg-red-50 text-red-700 ring-red-200/60 dark:bg-red-900/30 dark:text-red-300 dark:ring-red-800/60",
  muted:   "bg-zinc-100 text-zinc-500 ring-zinc-200/60 line-through dark:bg-zinc-800 dark:text-zinc-400 dark:ring-zinc-700/60",
};

interface BadgeProps extends Omit<ComponentProps<"span">, "children"> {
  tone?: BadgeTone;
  /** Optional leading icon — passes a Lucide-style component or any element. */
  icon?: ReactNode;
  children: ReactNode;
}

/**
 * Pill-shaped status indicator. Use for table cell badges, KPI chips, and
 * inline state markers. Colors are accessible against both light and dark
 * backgrounds; the optional ring adds a subtle 1px outline that reads well
 * on glass/translucent surfaces.
 */
export function Badge({
  tone = "neutral",
  icon,
  className = "",
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${toneClasses[tone]} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </span>
  );
}
