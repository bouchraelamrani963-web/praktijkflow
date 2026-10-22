import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { loadAppointmentFormOptions } from "@/lib/appointments/formOptions";
import { OpenSlotForm } from "@/components/open-slots/OpenSlotForm";

export default async function NewOpenSlotPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.practiceId) redirect("/dashboard");

  const { practitioners, types } = await loadAppointmentFormOptions(user.practiceId);

  return (
    <div className="ns-app-new-slot">
      <div className="ns-app-new-slot-heading">
        <Link
          href="/open-slots"
          className="ns-app-new-slot-back inline-flex items-center gap-2 text-sm"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Terug naar open plekken
        </Link>
        <p className="ns-app-eyebrow">AGENDA &amp; BESCHIKBAARHEID</p>
        <h1>Nieuwe open plek</h1>
        <p className="ns-app-new-slot-intro">
          Voeg beschikbare behandeltijd toe aan uw overzicht. Zo kunt u daarna
          passende patiënten uit de wachtlijst vinden.
        </p>
      </div>

      <section className="ns-app-new-slot-section" aria-labelledby="new-slot-section-title">
        <div className="ns-app-new-slot-section-heading">
          <div>
            <p className="ns-app-new-slot-section-overline">HANDMATIGE INVOER</p>
            <h2 id="new-slot-section-title">Gegevens van de open plek</h2>
          </div>
          <span className="ns-app-new-slot-required">* Verplicht</span>
        </div>
        <OpenSlotForm practitioners={practitioners} types={types} />
      </section>
    </div>
  );
}
