-- AlterEnum
ALTER TYPE "OpenSlotStatus" ADD VALUE 'OFFERED';

-- AlterTable
ALTER TABLE "open_slots" ADD COLUMN "offeredCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "open_slots" ADD COLUMN "offeredAt" TIMESTAMP(3);
