/**
 * Rule-based appointment risk engine.
 *
 * Returns a numeric riskScore and a categorical riskLevel.
 * Pure function — no DB access; caller passes the context.
 */

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface RiskContext {
  /** How many past appointments this client had with status NO_SHOW */
  priorNoShows: number;
  /** How many past appointments this client had with status CANCELLED */
  priorCancellations: number;
  /** How many past appointments this client had with status COMPLETED */
  priorCompletedVisits: number;
  /** Whether this is the client's first appointment ever (no prior appointments at all) */
  isNewClient: boolean;
  /** The appointment's start time */
  startTime: Date;
  /** The current appointment's status */
  status: string;
  /** Current time (injectable for testing) */
  now?: Date;
}

export interface RiskResult {
  riskScore: number;
  riskLevel: RiskLevel;
  factors: string[];
}

export function calculateRisk(ctx: RiskContext): RiskResult {
  const now = ctx.now ?? new Date();
  let score = 0;
  const factors: string[] = [];

  // ── Prior no-shows (+20 each, strong signal) ──
  if (ctx.priorNoShows > 0) {
    const pts = ctx.priorNoShows * 20;
    score += pts;
    factors.push(`${ctx.priorNoShows} prior no-show(s) (+${pts})`);
  }

  // ── Prior cancellations (+8 each) ──
  if (ctx.priorCancellations > 0) {
    const pts = ctx.priorCancellations * 8;
    score += pts;
    factors.push(`${ctx.priorCancellations} prior cancellation(s) (+${pts})`);
  }

  // ── Far-future appointment: >30 days out (+15) ──
  const daysUntil = (ctx.startTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (daysUntil > 30) {
    score += 15;
    factors.push(`Appointment >30 days out (+15)`);
  }

  // ── New client (+10) ──
  if (ctx.isNewClient) {
    score += 10;
    factors.push(`New client (+10)`);
  }

  // ── Monday (+5) ──
  const dayOfWeek = ctx.startTime.getDay(); // 0=Sun, 1=Mon, ... 5=Fri
  if (dayOfWeek === 1) {
    score += 5;
    factors.push(`Monday appointment (+5)`);
  }

  // ── Friday after 15:00 (+10) ──
  if (dayOfWeek === 5 && ctx.startTime.getHours() >= 15) {
    score += 10;
    factors.push(`Friday after 15:00 (+10)`);
  }

  // ── Confirmed status reduces risk (-15) ──
  if (ctx.status === "CONFIRMED") {
    score -= 15;
    factors.push(`Confirmed status (-15)`);
  }

  // ── Many successful visits reduce risk (-3 per completed, max -30) ──
  if (ctx.priorCompletedVisits > 0) {
    const pts = Math.min(ctx.priorCompletedVisits * 3, 30);
    score -= pts;
    factors.push(`${ctx.priorCompletedVisits} completed visit(s) (-${pts})`);
  }

  // Clamp to 0–100
  score = Math.max(0, Math.min(100, score));

  return {
    riskScore: score,
    riskLevel: scoreToLevel(score),
    factors,
  };
}

export function scoreToLevel(score: number): RiskLevel {
  if (score >= 60) return "CRITICAL";
  if (score >= 40) return "HIGH";
  if (score >= 20) return "MEDIUM";
  return "LOW";
}
