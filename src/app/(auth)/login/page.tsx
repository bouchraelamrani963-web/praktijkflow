"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { useAuth } from "@/lib/hooks/useAuth";
import { FIREBASE_NOT_CONFIGURED } from "@/lib/firebase/auth";
import toast from "react-hot-toast";

function redirectAfterAuth(target: string) {
  const safeTarget =
    target.startsWith("/") && !target.startsWith("//") ? target : "/dashboard";

  window.location.assign(safeTarget);
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { signIn, profile, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";

  useEffect(() => {
    if (!authLoading && profile) {
      redirectAfterAuth(redirect);
    }
  }, [authLoading, profile, redirect]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await signIn(email, password);
      toast.success("Welkom terug!");
      redirectAfterAuth(redirect);
    } catch (err) {
      // Distinguish failure modes so the user sees an actionable message
      // instead of a generic "wrong password" toast.
      const code = (err as { code?: string } | null)?.code ?? "";
      if (code === FIREBASE_NOT_CONFIGURED) {
        toast.error("Inloggen is tijdelijk niet beschikbaar: Firebase is niet geconfigureerd.");
        return;
      }
      if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
        toast.error("Ongeldig e-mailadres of wachtwoord.");
      } else if (code === "auth/invalid-email") {
        toast.error("Ongeldig e-mailadres.");
      } else if (code === "auth/too-many-requests") {
        toast.error("Te veel pogingen. Probeer het later opnieuw.");
      } else if (code === "auth/network-request-failed") {
        toast.error("Geen netwerkverbinding. Probeer het opnieuw.");
      } else {
        toast.error(err instanceof Error && err.message ? err.message : "Inloggen mislukt.");
      }
    } finally {
      setSubmitting(false);
    }
  }


  const fieldClass = "mt-2 block w-full rounded-sm border border-[#D7E0D7] bg-white px-4 py-3 text-sm text-[#203F33] outline-none placeholder:text-[#9AA99D] focus:border-[#366F52] focus:ring-2 focus:ring-[#D1E2D2] disabled:opacity-50";
  const labelClass = "block text-xs font-bold text-[#456552]";

  return (
    <div className="w-full rounded-sm border border-[#D7E1D6] bg-white p-6 shadow-[16px_17px_0_#E5ECE3] sm:p-9">
      <div className="mb-8 border-b border-[#E5EBE3] pb-7">
        <p className="text-[10px] font-bold uppercase tracking-[0.19em] text-[#A76949]">
          PRAKTIJKOMGEVING
        </p>
        <h1 className="mt-3 font-[Manrope] text-[30px] font-bold tracking-[-1px] text-[#204839]">
          Welkom terug
        </h1>
        <p className="mt-3 text-[13px] leading-6 text-[#6D8173]">
          Log in met uw bestaande NoShow Control-account.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className={labelClass}>E-mailadres</label>
          <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className={fieldClass} placeholder="naam@praktijk.nl" autoComplete="email" disabled={submitting} />
        </div>
        <div>
          <label htmlFor="password" className={labelClass}>Wachtwoord</label>
          <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            className={fieldClass} placeholder="Uw wachtwoord" autoComplete="current-password" disabled={submitting} />
        </div>
        <button type="submit" disabled={submitting}
          className="flex w-full items-center justify-center gap-3 rounded-sm bg-[#1C493A] px-5 py-3.5 text-sm font-bold text-white transition-colors hover:bg-[#30664E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#34694E] disabled:cursor-not-allowed disabled:opacity-50">
          {submitting ? "Inloggen..." : "Inloggen"}
          {!submitting && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
        </button>
      </form>
      <p className="mt-7 border-t border-[#E5EBE3] pt-5 text-center text-xs text-[#627969]">
        Nog geen account?{" "}
        <Link href="/register" className="font-bold text-[#275D44] underline-offset-4 hover:underline">
          Account aanmaken
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#F8F7F2] text-[#204839]">
      <header className="border-b border-[#DDE5DC]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-6">
          <Link href="/" aria-label="NoShow Control - startpagina"><BrandLogo compact /></Link>
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold text-[#34654B] hover:text-[#A76949]">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Terug naar de website</span>
          </Link>
        </div>
      </header>
      <main className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-12 md:grid-cols-[minmax(0,1fr)_minmax(0,470px)] md:gap-16 md:py-20">
        <section className="max-w-md">
          <p className="text-[10px] font-bold uppercase tracking-[0.19em] text-[#A76949]">
            UW PRAKTIJK, UW OVERZICHT
          </p>
          <h2 className="mt-5 font-[Manrope] text-[clamp(35px,4vw,57px)] font-bold leading-[1.15] tracking-[-1.8px] text-[#1D4537]">
            Een rustige werkdag
            <span className="mt-1 block text-[#AD6D50]">begint met overzicht.</span>
          </h2>
          <p className="mt-6 text-sm leading-7 text-[#667F6F]">
            Bekijk uw agenda, volg vrijgekomen afspraken op en beheer uw wachtlijst vanuit één praktijkomgeving.
          </p>
          <div className="mt-10 space-y-5 border-t border-[#DDE5DC] pt-7">
            <p className="flex items-center gap-3 text-sm text-[#375E49]">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#42785B]" aria-hidden="true" />
              Inzicht in open plekken
            </p>
            <p className="flex items-center gap-3 text-sm text-[#375E49]">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#42785B]" aria-hidden="true" />
              Wachtlijst en aanbiedingen opvolgen
            </p>
            <p className="flex items-center gap-3 text-sm text-[#375E49]">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#42785B]" aria-hidden="true" />
              Alle praktijkgegevens bij elkaar
            </p>
          </div>
          <p className="mt-9 text-xs leading-6 text-[#829487]">
            Liever eerst rondkijken?{" "}
            <Link href="/demo" className="font-bold text-[#2F6149] underline underline-offset-4">
              Bekijk de demo met fictieve gegevens.
            </Link>
          </p>
        </section>
        <Suspense fallback={<div className="min-h-[430px]" />}>
          <LoginForm />
        </Suspense>
      </main>
    </div>
  );
}
