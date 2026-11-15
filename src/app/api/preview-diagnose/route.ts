import { getApps } from "firebase-admin/app";
import { adminAuth } from "@/lib/firebase/admin";
import { prisma } from "@/lib/db";
import { isEmailTestMode } from "@/lib/messaging/service";
import { isSmsTestMode } from "@/lib/twilio";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

const preview = "praktijkflow-git-devel-0b15de-bouchraelamrani963-4055s-projects.vercel.app";
const expiresAt = Date.parse("2026-11-15T14:34:41Z");
const firebaseProject = "noshowcontrol-preview";
const firebaseAccount = "firebase-adminsdk-fbsvc@noshowcontrol-preview.iam.gserviceaccount.com";
const testHost = "ep-silent-feather-b9mwxrby.c-7.eu-central-1.aws.neon.tech";
const headers = { "Cache-Control": "private, no-store" };

type Status = "geslaagd" | "mislukt" | "niet vast te stellen";
const result = (ok: boolean): Status => ok ? "geslaagd" : "mislukt";

async function attempt(check: () => Promise<boolean>): Promise<Status> {
  try {
    return result(await check());
  } catch {
    return "niet vast te stellen";
  }
}

export async function GET(request: Request) {
  if (Date.now() >= expiresAt || process.env.VERCEL_ENV !== "preview" ||
      process.env.VERCEL_GIT_COMMIT_REF !== "develop/practice-security" ||
      request.headers.get("host") !== preview) {
    return new Response(null, { status: 404, headers });
  }

  let databaseConfiguration = false;
  try {
    const url = new URL(process.env.DATABASE_URL ?? "");
    databaseConfiguration = ["postgresql:", "postgres:"].includes(url.protocol) &&
      (url.hostname === testHost || url.hostname === testHost.replace(".", "-pooler.")) &&
      url.pathname === "/neondb" && (!url.port || url.port === "5432") &&
      [...url.searchParams.keys()].every((key) => ["sslmode", "channel_binding", "connect_timeout"].includes(key));
  } catch {
    // Do not expose parsing errors or connection strings.
  }

  const firebaseConfiguration = process.env.FIREBASE_PROJECT_ID?.trim() === firebaseProject &&
    process.env.FIREBASE_CLIENT_EMAIL?.trim() === firebaseAccount && !process.env.FIREBASE_AUTH_EMULATOR_HOST;
  let loadedFirebase: Status = "niet vast te stellen";
  const [databaseConnection, firebaseAuthentication] = await Promise.all([
    databaseConfiguration ? attempt(async () => {
      const rows = await prisma.$queryRaw<{ name: string }[]>`SELECT current_database() AS name`;
      return rows[0]?.name === "neondb";
    }) : "niet vast te stellen",
    firebaseConfiguration ? attempt(async () => {
      const manager = adminAuth.projectConfigManager();
      const credential = getApps()[0]?.options.credential;
      const identity = credential as { projectId?: string; clientEmail?: string } | undefined;
      const matches = identity?.projectId === firebaseProject && identity.clientEmail === firebaseAccount;
      loadedFirebase = result(matches);
      if (!matches) return false;
      // Read authentication configuration only. Do not list or read users.
      await manager.getProjectConfig();
      return true;
    }) : "niet vast te stellen",
  ]);

  return Response.json({
    databaseConfiguratie: result(databaseConfiguration),
    databaseVerbinding: databaseConnection,
    firebaseConfiguratie: result(firebaseConfiguration),
    firebaseAdminIdentiteit: loadedFirebase,
    firebaseAuthenticatie: firebaseAuthentication,
    emailTestmodus: result(process.env.EMAIL_TEST_MODE === "true" && isEmailTestMode()),
    smsTestmodus: result(process.env.SMS_TEST_MODE === "true" && isSmsTestMode()),
    automatischeVerzendingUit: result(process.env.AUTO_OFFER_ENABLED === "false"),
  }, { headers });
}
