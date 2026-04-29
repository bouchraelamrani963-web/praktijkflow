import type { ReactNode } from "react";

interface SectionProps {
  /** Section title — rendered as an h2. Pass null to omit the heading. */
  title?: ReactNode;
  /** Optional supporting subtitle line beneath the title. */
  subtitle?: ReactNode;
  /** Optional right-side action (e.g. a "View all" link). */
  action?: ReactNode;
  /** Heading visual style. "eyebrow" = small uppercase, "default" = h2. */
  variant?: "default" | "eyebrow";
  /** ID for the heading — used with aria-labelledby on the section element. */
  id?: string;
  className?: string;
  children: ReactNode;
}

/**
 * Wraps a labeled content block with a consistent heading + spacing scale.
 * Picks the right heading style based on `variant`:
 *   - "default": h2 (mb-4) — for top-level sections like "Recent activity"
 *   - "eyebrow": small uppercase label (mb-3) — for compact panels like
 *     "Vandaag in je praktijk"
 */
export function Section({
  title,
  subtitle,
  action,
  variant = "default",
  id,
  className = "",
  children,
}: SectionProps) {
  const headingId = id ?? (typeof title === "string" ? `section-${title.toLowerCase().replace(/\s+/g, "-")}` : undefined);

  const heading =
    variant === "eyebrow" ? (
      <h2
        id={headingId}
        className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
      >
        {title}
      </h2>
    ) : (
      <h2
        id={headingId}
        className="text-lg font-semibold text-zinc-900 dark:text-white"
      >
        {title}
      </h2>
    );

  return (
    <section className={`mb-8 ${className}`} aria-labelledby={headingId}>
      {(title || action) && (
        <div className={`flex items-end justify-between gap-4 ${variant === "eyebrow" ? "mb-3" : "mb-4"}`}>
          <div>
            {title && heading}
            {subtitle && (
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{subtitle}</p>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
