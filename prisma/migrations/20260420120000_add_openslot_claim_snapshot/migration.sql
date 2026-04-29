-- ============================================================================
-- 20260420120000_add_openslot_claim_snapshot
--
-- Purpose:
--   OpenSlot becomes the IMMUTABLE source of truth for recovered revenue.
--   Add 5 snapshot fields that are atomically populated when a slot is CLAIMED,
--   and never recomputed from the downstream Appointment afterwards.
--
-- Rules:
--   * claimedAppointmentId is @unique — one slot per filled appointment.
--   * FK onDelete: SET NULL — if the appointment is later deleted, the
--     snapshot (revenue/name/type) survives for historical reporting.
--   * Existing orphan CLAIMED rows remain orphans (fields left null) and are
--     handled gracefully by the UI + a server-side warning in GET /api/open-slots.
--
-- Backfill:
--   Best-effort reconciliation of existing CLAIMED slots via ActionLog →
--   Appointment join. Protected against hypothetical duplicates by a
--   ROW_NUMBER partition so the new unique constraint cannot be violated.
-- ============================================================================

-- 1. Add new nullable columns
ALTER TABLE "open_slots"
  ADD COLUMN "claimedAppointmentId"    UUID,
  ADD COLUMN "claimedAt"                TIMESTAMP(3),
  ADD COLUMN "claimedClientName"        TEXT,
  ADD COLUMN "claimedAppointmentType"   TEXT,
  ADD COLUMN "recoveredRevenueCents"    INTEGER;

-- 2. Best-effort backfill from ActionLog + Appointment join
WITH earliest_claim AS (
  SELECT DISTINCT ON ("appointmentId")
    "appointmentId" AS src_appt_id,
    "clientId"      AS claim_client_id,
    "createdAt"     AS claimed_at
  FROM "action_logs"
  WHERE "action"  = 'claim_open_slot'
    AND "outcome" = 'success'
    AND "appointmentId" IS NOT NULL
  ORDER BY "appointmentId", "createdAt" ASC
),
slot_info AS (
  SELECT
    os.id                                               AS slot_id,
    ec.claimed_at                                       AS claimed_at,
    c."firstName" || ' ' || c."lastName"                AS client_name,
    a.id                                                AS appt_id,
    at.name                                             AS appt_type_name,
    a."revenueEstimateCents"                            AS revenue_cents
  FROM "open_slots"      os
  JOIN earliest_claim    ec ON ec.src_appt_id = os."sourceAppointmentId"
  LEFT JOIN "clients"    c  ON c.id           = ec.claim_client_id
                            AND c."practiceId" = os."practiceId"
  LEFT JOIN "appointments" a ON a."clientId"       = ec.claim_client_id
                            AND a."startTime"      = os."startTime"
                            AND a."practitionerId" = os."practitionerId"
                            AND a."practiceId"     = os."practiceId"
  LEFT JOIN "appointment_types" at ON at.id = a."appointmentTypeId"
  WHERE os.status = 'CLAIMED'
),
ranked AS (
  -- Defensive: guarantee one slot per resolved appointment so the
  -- forthcoming UNIQUE INDEX on claimedAppointmentId cannot be violated.
  SELECT
    si.*,
    CASE
      WHEN si.appt_id IS NULL THEN 1
      ELSE ROW_NUMBER() OVER (PARTITION BY si.appt_id ORDER BY si.slot_id)
    END AS rn
  FROM slot_info si
)
UPDATE "open_slots" os
SET
  "claimedAt"              = ranked.claimed_at,
  "claimedClientName"      = ranked.client_name,
  "claimedAppointmentType" = ranked.appt_type_name,
  "recoveredRevenueCents"  = ranked.revenue_cents,
  "claimedAppointmentId"   = CASE WHEN ranked.rn = 1 THEN ranked.appt_id END
FROM ranked
WHERE os.id = ranked.slot_id;

-- 3. Unique constraint + FK (added AFTER backfill so data is consistent first)
CREATE UNIQUE INDEX "open_slots_claimedAppointmentId_key"
  ON "open_slots"("claimedAppointmentId");

ALTER TABLE "open_slots"
  ADD CONSTRAINT "open_slots_claimedAppointmentId_fkey"
  FOREIGN KEY ("claimedAppointmentId")
  REFERENCES "appointments"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- 4. Compound index powering the monthly-recovered-revenue KPI
CREATE INDEX "open_slots_practiceId_claimedAt_idx"
  ON "open_slots"("practiceId", "claimedAt");
