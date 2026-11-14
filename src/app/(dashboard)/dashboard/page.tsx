"use client";

import { useEffect, useState } from "react";
import { PracticeDashboard } from "@/components/dashboard/PracticeDashboard";
import type { DashboardData } from "@/lib/dashboard/types";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState({ actions: 1, history: 1, refresh: 0 });

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ actions: String(query.actions), history: String(query.history) });
    void fetch(`/api/dashboard?${params}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Dashboard request failed");
        const result: DashboardData = await response.json();
        if (!controller.signal.aborted) setData(result);
      })
      .catch(() => {
        if (!controller.signal.aborted) setData(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [query]);

  return (
    <PracticeDashboard
      data={data}
      loading={loading}
      pages={query}
      onRefresh={() => {
        setLoading(true);
        setQuery((current) => ({ actions: 1, history: 1, refresh: current.refresh + 1 }));
      }}
      onPage={(kind, page) => {
        setLoading(true);
        setQuery((current) => ({ ...current, [kind]: page }));
      }}
    />
  );
}
