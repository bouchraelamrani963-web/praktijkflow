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
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            Omzet-herstel prestatie
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Hoe snel en hoe vaak vrijgekomen plekken opnieuw worden ingevuld — en hoeveel omzet u daarmee terugwint.
          </p>
        </div>
        <Link
          href="/open-slots"
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Terug naar lijst
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-800"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">{card.label}</span>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </div>
            <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">{card.value}</p>
          </div>
        ))}
      </div>

      {metrics.totalSlots === 0 && (
        <p className="mt-6 text-sm text-zinc-500">
          Er zijn nog geen vrijgekomen plekken — goed teken, er gaat momenteel geen omzet verloren.
        </p>
      )}
    </div>
  );
}
