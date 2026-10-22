"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, ArrowUpRight, FlaskConical, Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { demoNavItems } from "./demo-data";

function DemoNavigation({ close }: { close?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="ns-demo-navigation" aria-label="Demonavigatie">
      <span className="ns-demo-sidebar-label">ONTDEK DE APPLICATIE</span>
      {demoNavItems.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={close}
            aria-current={active ? "page" : undefined}
            className={`ns-demo-nav-item${active ? " ns-demo-nav-item-current" : ""}`}
          >
            <item.icon className="h-4 w-4" aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        );
      })}
      <Link href="/demo" onClick={close} className="ns-demo-nav-start">
        Hoe werkt het? <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </nav>
  );
}

export function DemoShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="ns-demo pf-dark min-h-screen">
      <div className="ns-demo-notice" role="note">
        <FlaskConical className="h-4 w-4" aria-hidden="true" />
        Demonstratie met fictieve gegevens · Geen echte patiëntgegevens, berichten of betalingen
      </div>

      <header className="ns-demo-header">
        <div className="ns-demo-header-inner">
          <Link href="/" aria-label="NoShow Control startpagina" className="ns-demo-home-logo">
            <BrandLogo compact />
          </Link>
          <div className="ns-demo-header-actions">
            <span className="ns-demo-header-label">INTERACTIEVE DEMO</span>
            <Link href="/" className="ns-demo-back-site">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Naar de website
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen((open) => !open)}
              className="ns-demo-mobile-toggle"
              aria-label={mobileOpen ? "Demonavigatie sluiten" : "Demonavigatie openen"}
              aria-expanded={mobileOpen}
              aria-controls="ns-demo-mobile-menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div id="ns-demo-mobile-menu" className="ns-demo-mobile-menu">
          <DemoNavigation close={() => setMobileOpen(false)} />
        </div>
      )}

      <div className="ns-demo-layout">
        <aside className="ns-demo-sidebar">
          <DemoNavigation />
          <div className="ns-demo-sidebar-footer">
            <span className="ns-demo-sidebar-dot" />
            <span>Veilige voorbeeldomgeving</span>
          </div>
        </aside>
        <div className="ns-demo-content">
          {children}
          <footer className="ns-demo-footer">
            <span>Dit is een demonstratie. Wijzigingen worden niet opgeslagen.</span>
            <Link href="/" className="ns-demo-footer-link">Terug naar NoShow Control <ArrowUpRight className="h-4 w-4" /></Link>
          </footer>
        </div>
      </div>
    </div>
  );
}
