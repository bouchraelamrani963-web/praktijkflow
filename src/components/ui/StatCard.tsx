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
    iconBg:      "bg-practice-muted ",
    iconText:    "text-practice-subtle ",
    hoverBorder: "hover:border-practice-field ",
  },
  info: {
    iconBg:      "bg-practice-muted ",
    iconText:    "text-practice-link ",
    hoverBorder: "hover:border-practice-field ",
  },
  success: {
    iconBg:      "bg-practice-muted ",
    iconText:    "text-emerald-600 dark:text-emerald-400",
    hoverBorder: "hover:border-practice-field ",
  },
  warning: {
    iconBg:      "bg-practice-muted ",
    iconText:    "text-amber-600 dark:text-amber-400",
    hoverBorder: "hover:border-practice-field ",
  },
  danger: {
    iconBg:      "bg-practice-muted ",
    iconText:    "text-red-600 dark:text-red-400",
    hoverBorder: "hover:border-practice-field ",
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
        <span className="text-xs font-medium text-practice-subtle">
          {label}
        </span>
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${accent.iconBg}`}
        >
          <Icon className={`h-4 w-4 ${accent.iconText}`} />
        </span>
      </div>
      <p className="mt-3 text-2xl font-bold tabular-nums text-practice-heading">
        {value}
      </p>
      {hint && (
        <p className="mt-1 text-xs text-practice-subtle">{hint}</p>
      )}
    </>
  );

  const baseCls =
    "block rounded-lg border border-practice-line bg-practice-surface p-4 transition ";
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
