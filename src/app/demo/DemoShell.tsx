"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { FlaskConical, Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { demoNavItems } from "./demo-data";

function DemoWordMark() {
  return (
    <span className="select-none text-lg leading-none" style={{ fontFamily: "var(--pf-font-display)" }}>
      <span style={{ fontWeight: 700, color: "var(--pf-fg-1)" }}>NoShow</span>
      <span style={{ fontWeight: 400, color: "var(--pf-fg-3)" }}>{" Control"}</span>
    </span>
  );
}

export function DemoShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="pf-dark min-h-screen bg-slate-50">
      <div className="sticky top-0 z-50 border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-semibold uppercase tracking-wide text-amber-900">
        DEMO-OMGEVING - fictieve gegevens, geen database, geen betalingen, geen echte berichten
      </div>
      <header className="pf-nav sticky top-8 z-40 border-b border-slate-200">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link href="/demo" aria-label="NoShow Control demo home" className="shrink-0">
            <DemoWordMark />
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 sm:inline-flex">
              <FlaskConical className="h-4 w-4" />
              Lokale demo
            </span>
            <button
              type="button"
              onClick={() => setMobileOpen((open) => !open)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 md:hidden"
              aria-expanded={mobileOpen}
              aria-controls="demo-mobile-nav"
              aria-label="Demo navigatie openen"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {mobileOpen && (
          <nav id="demo-mobile-nav" className="border-t border-slate-200 bg-white px-4 py-3 md:hidden">
            <div className="grid gap-1">
              {demoNavItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                      active ? "bg-blue-50 text-blue-800" : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </header>

      <div className="mx-auto grid max-w-7xl md:grid-cols-[13rem_1fr]">
        <aside className="sticky top-[6.5rem] hidden h-[calc(100vh-6.5rem)] border-r border-slate-200 bg-white px-3 py-4 md:block">
          <nav className="space-y-1" aria-label="Demo navigatie">
            {demoNavItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                    active ? "bg-blue-50 text-blue-800" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>

      <footer className="border-t border-slate-200 bg-white md:ml-[13rem]">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>Visuele demo, geen productieomgeving</span>
          <Link href="/demo" className="font-medium text-blue-700 hover:text-blue-800">
            Naar demo-homepage
          </Link>
        </div>
      </footer>
    </div>
  );
}
