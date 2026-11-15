const euroFormatter = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });

export function formatEuros(amount: number): string {
  return euroFormatter.format(Number.isFinite(amount) ? amount : 0);
}

export function formatEuroCents(cents: number | null | undefined): string {
  return formatEuros((cents ?? 0) / 100);
}
