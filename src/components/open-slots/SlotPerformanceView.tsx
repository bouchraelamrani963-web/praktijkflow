import Link from "next/link";
import { ArrowLeft, Clock3, CheckCheck, TrendingUp, Zap } from "lucide-react";

interface PerformanceMetrics {
  avgMinutesToFill: number | null;
  slotsFilled: number;
  conversionRate: number;
  fastFills: number;
  totalSlots: number;
}

export function SlotPerformanceView({ metrics }: { metrics: PerformanceMetrics }) {
  const cards = [
    {
      label: "Gemiddelde invultijd",
      value: metrics.avgMinutesToFill !== null ? `${metrics.avgMinutesToFill} min` : "—",
      icon: Clock3,
      color: "text-purple-500",
    },
    {
      label: "Aantal ingevulde plekken",
      value: metrics.slotsFilled,
      icon: CheckCheck,
      color: "text-emerald-500",
    },
    {
      label: "Conversie percentage",
      value: `${metrics.conversionRate}%`,
      icon: TrendingUp,
      color: "text-blue-500",
    },
    {
      label: "Snelle invullers (≤ 5 min)",
      value: metrics.fastFills,
      icon: Zap,
      color: "text-amber-500",
    },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-practice-heading">
            Omzet-herstel prestatie
          </h1>
          <p className="mt-1 text-sm text-practice-subtle">
            Hoe snel en hoe vaak vrijgekomen plekken opnieuw worden ingevuld — en hoeveel omzet u daarmee terugwint.
          </p>
        </div>
        <Link
          href="/open-slots"
          className="inline-flex items-center gap-2 rounded-lg border border-practice-field bg-practice-surface px-3 py-1.5 text-sm font-medium text-practice-ink hover:bg-practice-hover"
        >
          <ArrowLeft className="h-4 w-4" />
          Terug naar lijst
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-practice-line bg-practice-surface p-5"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-practice-subtle">{card.label}</span>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </div>
            <p className="mt-2 text-2xl font-bold text-practice-heading">{card.value}</p>
          </div>
        ))}
      </div>

      {metrics.totalSlots === 0 && (
        <p className="mt-6 text-sm text-practice-subtle">
          Er zijn nog geen vrijgekomen plekken — goed teken, er gaat momenteel geen omzet verloren.
        </p>
      )}
    </div>
  );
}
