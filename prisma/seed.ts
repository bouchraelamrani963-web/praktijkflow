/**
 * CLI entrypoint for `npm run db:seed`.
 *
 * Thin wrapper around src/lib/demo-seed.ts so the seed logic can be shared
 * with the runtime API route (POST /api/admin/seed-demo). The CLI uses its
 * own Prisma client (driven by dotenv) — we don't want to import the
 * Next.js-flavoured singleton here because that brings the App Router env
 * loader into a node script.
 */

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { seedDemoData } from "../src/lib/demo-seed";

async function main() {
  console.log("🌱 Seeding NoShow Control demo data...\n");

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  try {
    const result = await seedDemoData(prisma);

    if (result.alreadySeeded) {
      console.log("ℹ️  Demo practice already exists — no changes made.");
      console.log("    Run `npx prisma migrate reset` to wipe and re-seed.\n");
    } else {
      console.log(`✅ Seed complete in ${result.durationMs}ms.\n`);
    }

    console.log("Row counts:");
    for (const [model, count] of Object.entries(result.counts)) {
      console.log(`  ${model.padEnd(20)} ${count}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("❌ Seed failed:", e);
  process.exit(1);
});
