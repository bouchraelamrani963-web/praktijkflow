export const DASHBOARD_PAGE_SIZE = 12;

export interface DashboardCounts {
  appointments: number;
  noShows: number;
  cancellations: number;
  released: number;
  available: number;
  filled: number;
}

export interface DashboardSlot {
  id: string;
  startTime: string;
  durationMinutes: number;
  appointmentType: string | null;
  practitioner: string;
  status: "AVAILABLE" | "OFFERED" | "CLAIMED" | "EXPIRED";
  action: "candidates" | "no-candidates" | "failed" | "review-offer" | "waiting" | "history";
  href: string;
  urgent: boolean;
  sent: number;
  simulated: number;
}

export interface DashboardSlotPage {
  items: DashboardSlot[];
  total: number;
}

export interface DashboardData {
  day: string;
  counts: DashboardCounts | null;
  actions: DashboardSlotPage | null;
  history: DashboardSlotPage | null;
}
