"use client";

import { Suspense, useState } from "react";
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

/**
 * Register page accepts an optional `?plan=` query param so the pricing
 * page CTAs can carry the chosen plan through registration. The plan is
 * preserved in the post-register redirect URL so a future Stripe checkout
 * step (Phase 3+) can pick it up.
 *
 * Registration:
 *   - Requires Firebase env vars (NEXT_PUBLIC_FIREBASE_* + FIREBASE_*) to
 *     be set on Vercel. Without them, registration fails closed with a clear
 *     error instead of creating a local or demo user.
 *   - On submit, signUp() creates a Firebase user → /api/auth/register
 *     creates the Prisma User + Practice + OWNER membership in one
 *     transaction → mints session cookie. Multi-tenancy is bootstrapped
 *     here, not lazily.
 */
function RegisterForm() {
  const [name, setName] = useState("");
  const [practiceName, setPracticeName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan");

  const planLabel =
    plan === "starter" ? "Starter" :
    plan === "pro"     ? "Pro" :
    plan === "enterprise" || plan === "growth" ? "Growth" :
    null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Wachtwoord moet minimaal 8 tekens zijn.");
      return;
    }
    if (!practiceName.trim()) {
      toast.error("Vul een praktijknaam in.");
      return;
    }
    setLoading(true);
    try {
      await signUp(email, password, name, practiceName.trim());
      toast.success("Account aangemaakt!");
      const dest = plan
        ? `/dashboard?plan=${encodeURIComponent(plan)}`
        : "/dashboard";
      redirectAfterAuth(dest);
    } catch (err) {
      // Distinguish between common failure modes so the user knows what
      // to do next, rather than the prior misleading "email mogelijk al
      // in gebruik" blanket message.
      const code = (err as { code?: string } | null)?.code ?? "";
      const message = err instanceof Error ? err.message : "";

      if (code === FIREBASE_NOT_CONFIGURED) {
        toast.error("Registratie is op deze omgeving niet beschikbaar (auth nog niet geconfigureerd).");
      } else if (code === "auth/email-already-in-use") {
        toast.error("Dit e-mailadres is al in gebruik. Probeer in te loggen.");
      } else if (code === "auth/invalid-email") {
        toast.error("Ongeldig e-mailadres.");
      } else if (code === "auth/weak-password") {
        toast.error("Wachtwoord is te zwak. Kies een sterker wachtwoord.");
      } else if (message) {
        toast.error(message);
      } else {
        toast.error("Account aanmaken mislukt. Probeer het later opnieuw.");
      }
    } finally {
      setLoading(false);
    }
  }


  const fieldClass = "mt-2 block w-full rounded-sm border border-[#D7E0D7] bg-white px-4 py-3 text-sm text-[#203F33] outline-none placeholder:text-[#9AA99D] focus:border-[#366F52] focus:ring-2 focus:ring-[#D1E2D2] disabled:opacity-50";
  const labelClass = "block text-xs font-bold text-[#456552]";

  return (
    <div className="w-full rounded-sm border border-[#D7E1D6] bg-white p-6 shadow-[16px_17px_0_#E5ECE3] sm:p-9">
      <div className="mb-8 border-b border-[#E5EBE3] pb-7">
        <p className="text-[10px] font-bold uppercase tracking-[0.19em] text-[#A76949]">PRAKTIJKACCOUNT</p>
        <h1 className="mt-3 font-[Manrope] text-[30px] font-bold tracking-[-1px] text-[#204839]">
          Account aanmaken
        </h1>
        <p className="mt-3 text-[13px] leading-6 text-[#6D8173]">
          Vul uw gegevens in om een eigen praktijkomgeving in te richten.
        </p>
        {planLabel && (
          <div className="mt-5 border-l-[3px] border-[#B77856] bg-[#F0F4EE] px-4 py-3" role="note">
            <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#758779]">UW PAKKETKEUZE</p>
            <p className="mt-1 text-sm font-bold text-[#234B3B]">{planLabel}</p>
            <p className="mt-1 text-xs leading-5 text-[#667E6D]">
              Deze keuze is voorlopig. Er wordt nu geen betaald abonnement afgesloten.
            </p>
          </div>
        )}
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="name" className={labelClass}>Volledige naam</label>
          <input id="name" type="text" required value={name} onChange={(e) => setName(e.target.value)}
            className={fieldClass} placeholder="Jan Jansen" autoComplete="name" disabled={loading} />
        </div>
        <div>
          <label htmlFor="practiceName" className={labelClass}>Praktijknaam</label>
          <input id="practiceName" type="text" required value={practiceName} onChange={(e) => setPracticeName(e.target.value)}
            className={fieldClass} placeholder="Tandartspraktijk Centrum" autoComplete="organization" disabled={loading} />
          <p className="mt-1.5 text-[11px] text-[#7F9183]">Dit kunt u later aanpassen onder Instellingen.</p>
        </div>
        <div>
          <label htmlFor="email" className={labelClass}>E-mailadres</label>
          <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className={fieldClass} placeholder="naam@praktijk.nl" autoComplete="email" disabled={loading} />
        </div>
        <div>
          <label htmlFor="password" className={labelClass}>Wachtwoord</label>
          <input id="password" type="password" required minLength={8} value={password}
            onChange={(e) => setPassword(e.target.value)} className={fieldClass}
            placeholder="Minimaal 8 tekens" autoComplete="new-password" disabled={loading} />
        </div>
        <button type="submit" disabled={loading}
          className="flex w-full items-center justify-center gap-3 rounded-sm bg-[#1C493A] px-5 py-3.5 text-sm font-bold text-white transition-colors hover:bg-[#30664E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#34694E] disabled:cursor-not-allowed disabled:opacity-50">
          {loading ? "Account aanmaken..." : "Account aanmaken"}
          {!loading && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
        </button>
        <p className="text-center text-[11px] leading-5 text-[#738679]">
          Hiermee maakt u een praktijkaccount aan. Er wordt geen betaling uitgevoerd.
        </p>
      </form>
      <p className="mt-7 border-t border-[#E5EBE3] pt-5 text-center text-xs text-[#627969]">
        Heeft u al een account?{" "}
        <Link href={plan ? "/login?plan=" + encodeURIComponent(plan) : "/login"}
          className="font-bold text-[#275D44] underline-offset-4 hover:underline">Inloggen</Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-[#F8F7F2] text-[#204839]">
      <header className="border-b border-[#DDE5DC]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-6">
          <Link href="/" aria-label="NoShow Control - startpagina"><BrandLogo compact /></Link>
          <Link href="/pricing" className="inline-flex items-center gap-2 text-xs font-bold text-[#34654B] hover:text-[#A76949]">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /><span>Terug naar tarieven</span>
          </Link>
        </div>
      </header>
      <main className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-12 md:grid-cols-[minmax(0,1fr)_minmax(0,470px)] md:gap-16 md:py-20">
        <section className="max-w-md">
          <p className="text-[10px] font-bold uppercase tracking-[0.19em] text-[#A76949]">WELKOM BIJ NOSHOW CONTROL</p>
          <h2 className="mt-5 font-[Manrope] text-[clamp(35px,4vw,57px)] font-bold leading-[1.15] tracking-[-1.8px] text-[#1D4537]">
            Meer ruimte in de agenda.
            <span className="mt-1 block text-[#AD6D50]">Meer rust in de praktijk.</span>
          </h2>
          <p className="mt-6 text-sm leading-7 text-[#667F6F]">
            Maak uw praktijkomgeving aan om uw agenda, open plekken en wachtlijst overzichtelijk te beheren.
          </p>
          <div className="mt-10 space-y-5 border-t border-[#DDE5DC] pt-7">
            <p className="flex items-center gap-3 text-sm text-[#375E49]">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#42785B]" aria-hidden="true" />
              Overzicht van vrijgekomen afspraken
            </p>
            <p className="flex items-center gap-3 text-sm text-[#375E49]">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#42785B]" aria-hidden="true" />
              Een wachtlijst met patiëntvoorkeuren
            </p>
            <p className="flex items-center gap-3 text-sm text-[#375E49]">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#42785B]" aria-hidden="true" />
              Duidelijke opvolging van aanbiedingen
            </p>
          </div>
          <p className="mt-9 text-xs leading-6 text-[#829487]">
            Wilt u eerst rondkijken?{" "}
            <Link href="/demo" className="font-bold text-[#2F6149] underline underline-offset-4">
              Open de demo met fictieve gegevens.
            </Link>
          </p>
        </section>
        <Suspense fallback={<div className="min-h-[500px]" />}>
          <RegisterForm />
        </Suspense>
      </main>
    </div>
  );
}
