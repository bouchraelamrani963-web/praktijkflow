import { lookupToken } from "@/lib/tokens/service";
import { ActionExecutor } from "@/components/tokens/ActionExecutor";
import { XCircle } from "lucide-react";

function fmt(d: Date) {
  return d.toLocaleString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function ActionPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token: rawToken } = await params;

  const tokenRecord = await lookupToken(rawToken);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        {!tokenRecord ? (
          <div className="text-center">
            <XCircle className="mx-auto h-16 w-16 text-red-400" />
            <h2 className="mt-4 text-xl font-semibold text-zinc-900">
              Ongeldige link
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              Deze link is ongeldig of is al gebruikt.
            </p>
          </div>
        ) : tokenRecord.expiresAt < new Date() ? (
          <div className="text-center">
            <XCircle className="mx-auto h-16 w-16 text-amber-400" />
            <h2 className="mt-4 text-xl font-semibold text-zinc-900">
              Link verlopen
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              Deze link is verlopen. Neem contact op met {tokenRecord.practice.name} voor een nieuwe.
            </p>
          </div>
        ) : tokenRecord.usedAt ? (
          <div className="text-center">
            <XCircle className="mx-auto h-16 w-16 text-zinc-400" />
            <h2 className="mt-4 text-xl font-semibold text-zinc-900">
              Al gebruikt
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              Deze link is al gebruikt.
            </p>
          </div>
        ) : (
          <ActionExecutor
            token={rawToken}
            action={tokenRecord.action}
            practiceName={tokenRecord.practice.name}
            clientName={`${tokenRecord.client.firstName} ${tokenRecord.client.lastName}`}
            appointmentTime={
              tokenRecord.appointment ? fmt(tokenRecord.appointment.startTime) : undefined
            }
          />
        )}
      </div>
    </div>
  );
}
