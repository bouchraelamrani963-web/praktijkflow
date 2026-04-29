"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/**
 * Visual variants:
 *   - "primary":  gradient blue → indigo, the marquee CTA
 *   - "secondary": neutral border, on-canvas action
 *   - "ghost":    text-only, sidebar / nav use
 *   - "danger":   destructive intent
 *
 * Sizes: sm (32px), md (40px), lg (44px). All keyboard-accessible with a
 * visible focus ring.
 */
type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-2 " +
  "focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-900 " +
  "disabled:opacity-50 disabled:pointer-events-none";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-500/20 " +
    "hover:from-blue-700 hover:to-indigo-700 hover:shadow-blue-500/30",
  secondary:
    "border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50 " +
    "dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700",
  ghost:
    "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
  danger:
    "bg-red-600 text-white hover:bg-red-700",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  /** Render as <Link href="…"> instead of <button>. */
  href?: string;
  /** Open external link in new tab — only meaningful with `href`. */
  external?: boolean;
  children: ReactNode;
  className?: string;
}

type AnchorProps = CommonProps & Omit<ComponentProps<typeof Link>, keyof CommonProps | "href">;
type ButtonProps = CommonProps & Omit<ComponentProps<"button">, keyof CommonProps>;

export function Button(props: AnchorProps | ButtonProps) {
  const {
    variant = "primary",
    size = "md",
    className = "",
    children,
    href,
    external,
    ...rest
  } = props as CommonProps & Record<string, unknown>;

  const cls = `${base} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

  if (href) {
    if (external) {
      return (
        <a href={href} target="_blank" rel="noreferrer noopener" className={cls} {...(rest as ComponentProps<"a">)}>
          {children}
        </a>
      );
    }
    return (
      <Link href={href} className={cls} {...(rest as Omit<ComponentProps<typeof Link>, "href" | "className">)}>
        {children}
      </Link>
    );
  }

  return (
    <button className={cls} {...(rest as ComponentProps<"button">)}>
      {children}
    </button>
  );
}
