-- CreateTable
CREATE TABLE "appointment_treatments" (
    "id" UUID NOT NULL,
    "appointmentId" UUID NOT NULL,
    "appointmentTypeId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tariffCents" INTEGER NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointment_treatments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "appointment_treatments_appointmentId_idx" ON "appointment_treatments"("appointmentId");

-- CreateIndex
CREATE INDEX "appointment_treatments_appointmentTypeId_idx" ON "appointment_treatments"("appointmentTypeId");

-- AddForeignKey
ALTER TABLE "appointment_treatments" ADD CONSTRAINT "appointment_treatments_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_treatments" ADD CONSTRAINT "appointment_treatments_appointmentTypeId_fkey" FOREIGN KEY ("appointmentTypeId") REFERENCES "appointment_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
