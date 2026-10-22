"use client";

import Link from "next/link";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";

/**
 * Public-site account action. Authenticated users can sign out even when
 * they've navigated away from the dashboard to the marketing pages.
 * signOut clears the server session and Firebase session.
 */
export function PublicAccountNav() {
  const { user, profile, loading, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isAuthenticated = Boolean(user || profile);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    setError(null);
    try {
      await signOut();
      window.location.replace("/login");
    } catch {
      setError("Uitloggen mislukt. Probeer opnieuw.");
      setSigningOut(false);
    }
  }

  if (loading) {
    return <span className="ns-link-login" aria-hidden="true">Account</span>;
  }

  return (
    <span className="ns-public-account-nav">
      {isAuthenticated ? (
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="ns-link-login ns-public-logout"
        >
          <LogOut size={15} aria-hidden="true" />
          {signingOut ? "Uitloggen…" : "Uitloggen"}
        </button>
      ) : (
        <Link href="/login" className="ns-link-login">Inloggen</Link>
      )}
      {error && <span role="alert" className="ns-public-logout-error">{error}</span>}
    </span>
  );
}
