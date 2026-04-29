import Link from "next/link";
import type { ComponentType, ReactNode } from "react";

/**
 * Visual emphasis levels — drives the icon ring and hover accent color.
 * Maps to brand semantic tone, NOT raw color names, so future palette
 * shifts only edit this one file.
 */
type StatTone = "neutral" | "info" | "success" | "warning" | "danger";

const toneAccents: Record<
  StatTone,
  { iconBg: string; iconText: string; hoverBorder: string }
> = {
  neutral: {
    iconBg:      "bg-zinc-100 dark:bg-zinc-800",
    iconText:    "text-zinc-600 dark:text-zinc-300",
    hoverBorder: "hover:border-zinc-300 dark:hover:border-zinc-700",
  },
  info: {
    iconBg:      "bg-blue-50 dark:bg-blue-900/30",
    iconText:    "text-blue-600 dark:text-blue-400",
    hoverBorder: "hover:border-blue-300 dark:hover:border-blue-700",
  },
  success: {
    iconBg:      "bg-emerald-50 dark:bg-emerald-900/30",
    iconText:    "text-emerald-600 dark:text-emerald-400",
    hoverBorder: "hover:border-emerald-300 dark:hover:border-emerald-700",
  },
  warning: {
    iconBg:      "bg-amber-50 dark:bg-amber-900/30",
    iconText:    "text-amber-600 dark:text-amber-400",
    hoverBorder: "hover:border-amber-300 dark:hover:border-amber-700",
  },
  danger: {
    iconBg:      "bg-red-50 dark:bg-red-900/30",
    iconText:    "text-red-600 dark:text-red-400",
    hoverBorder: "hover:border-red-300 dark:hover:border-red-700",
  },
};

interface StatCardProps {
  /** Short label above the value. Keep under 25 chars. */
  label: string;
  /** Already-formatted display value (e.g. "€1.250,00", "12", "75%"). */
  value: ReactNode;
  /** Lucide icon component (or any React component taking className). */
  icon: ComponentType<{ className?: string }>;
  /** Optional supporting line below the value. */
  hint?: ReactNode;
  /** Make the whole card a link to a deeper view. Adds hover affordance. */
  href?: string;
  tone?: StatTone;
  className?: string;
}

/**
 * Single-metric KPI card. The tone accent is applied to the icon chip and
 * the hover border so the dashboard reads as a coherent grid even when each
 * card carries a different semantic weight (revenue vs. risk vs. throughput).
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  href,
  tone = "neutral",
  className = "",
}: StatCardProps) {
  const accent = toneAccents[tone];

  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          {label}
        </span>
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${accent.iconBg}`}
        >
          <Icon className={`h-4 w-4 ${accent.iconText}`} />
        </span>
      </div>
      <p className="mt-3 text-2xl font-bold tabular-nums text-zinc-900 dark:text-white">
        {value}
      </p>
      {hint && (
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">{hint}</p>
      )}
    </>
  );

  const baseCls =
    "block rounded-xl border border-zinc-200 bg-white p-4 transition dark:border-zinc-800 dark:bg-zinc-900";
  const interactiveCls = href
    ? `cursor-pointer hover:shadow-sm hover:-translate-y-0.5 ${accent.hoverBorder}`
    : "";

  if (href) {
    return (
      <Link href={href} className={`${baseCls} ${interactiveCls} ${className}`}>
        {inner}
      </Link>
    );
  }

  return <div className={`${baseCls} ${className}`}>{inner}</div>;
}
