import "dotenv/config";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function parseDatabaseUrl(url: string) {
  try {
    const parsed = new URL(url);
    return {
      username: parsed.username || "(empty)",
      hasPassword: !!parsed.password,
      host: parsed.hostname,
      port: parsed.port || "5432",
      database: parsed.pathname.replace("/", "") || "(empty)",
      params: parsed.search,
      isPooler: parsed.hostname.includes("-pooler"),
    };
  } catch {
    return { error: "Malformed URL — cannot parse" };
  }
}

async function testConnection() {
  const url = process.env.DATABASE_URL;

  console.log("\n=== Prisma ↔ Neon Connection Test ===\n");

  if (!url) {
    console.error("DATABASE_URL is not set. Check .env file.");
    process.exit(1);
  }

  const parsed = parseDatabaseUrl(url);
  console.log("Parsed DATABASE_URL:", JSON.stringify(parsed, null, 2));

  if ("error" in parsed) {
    console.error("\nURL is malformed. Expected format:");
    console.error("  postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require");
    process.exit(1);
  }

  if (!parsed.hasPassword) {
    console.error("\nPassword is MISSING from DATABASE_URL.");
    console.error("Get it from: Neon Dashboard → Connection Details");
    process.exit(1);
  }

  if (parsed.isPooler) {
    console.warn("\nWARNING: URL contains '-pooler'. Prisma migrate needs a direct connection.");
    console.warn("Replace '-pooler' with direct endpoint in DATABASE_URL for migrations.");
  }

  if (parsed.host === "localhost" || parsed.host === "127.0.0.1") {
    console.error("\nDATABASE_URL still points to localhost, not Neon.");
    process.exit(1);
  }

  console.log("\nConnecting...");

  try {
    const adapter = new PrismaPg({ connectionString: url });
    const prisma = new PrismaClient({ adapter });

    const result = await prisma.$queryRawUnsafe("SELECT 1 AS ok");
    console.log("SELECT 1 result:", result);
    console.log("\nSUCCESS: Connected to Neon PostgreSQL.\n");

    await prisma.$disconnect();
    process.exit(0);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("\nFAILED:", msg);

    if (msg.includes("P1000") || msg.includes("authentication")) {
      console.error("\nAuthentication failed. Check:");
      console.error("  1. Password is correct (copy fresh from Neon Dashboard)");
      console.error("  2. Username matches (usually: neondb_owner)");
      console.error("  3. Endpoint host matches your Neon project");
    } else if (msg.includes("ENOTFOUND") || msg.includes("getaddrinfo")) {
      console.error("\nDNS resolution failed. The host does not exist.");
      console.error("  Check the endpoint name in your Neon Dashboard.");
    } else if (msg.includes("ECONNREFUSED")) {
      console.error("\nConnection refused. Are you pointing to the right host?");
    } else if (msg.includes("timeout")) {
      console.error("\nConnection timed out. Check network / firewall.");
    }

    process.exit(1);
  }
}

testConnection();
