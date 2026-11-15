import { afterEach, expect, it, vi } from "vitest";
import { GET } from "./route";

const mocks = vi.hoisted(() => ({ query: vi.fn(), auth: vi.fn(), apps: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { $queryRaw: mocks.query } }));
vi.mock("@/lib/firebase/admin", () => ({ adminAuth: { projectConfigManager: mocks.auth } }));
vi.mock("firebase-admin/app", () => ({ getApps: mocks.apps }));
vi.mock("@/lib/messaging/service", () => ({ isEmailTestMode: () => true }));
vi.mock("@/lib/twilio", () => ({ isSmsTestMode: () => true }));

const host = "praktijkflow-git-devel-0b15de-bouchraelamrani963-4055s-projects.vercel.app";
const request = (hostname: string) => new Request(`https://${hostname}`, { headers: { host: hostname } });

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});

it("rejects production, other branches and deployment hostnames", async () => {
  vi.stubEnv("VERCEL_ENV", "production");
  vi.stubEnv("VERCEL_GIT_COMMIT_REF", "develop/practice-security");
  expect((await GET(request(host))).status).toBe(404);
  vi.stubEnv("VERCEL_ENV", "preview");
  vi.stubEnv("VERCEL_GIT_COMMIT_REF", "main");
  expect((await GET(request(host))).status).toBe(404);
  vi.stubEnv("VERCEL_GIT_COMMIT_REF", "develop/practice-security");
  expect((await GET(request("unique-preview.vercel.app"))).status).toBe(404);
});

it("does not contact an unexpected database or Firebase project", async () => {
  vi.stubEnv("VERCEL_ENV", "preview");
  vi.stubEnv("VERCEL_GIT_COMMIT_REF", "develop/practice-security");
  vi.stubEnv("DATABASE_URL", "postgresql://other.example/neondb");
  vi.stubEnv("FIREBASE_PROJECT_ID", "wrong-project");
  vi.stubEnv("EMAIL_TEST_MODE", "true");
  vi.stubEnv("SMS_TEST_MODE", "true");
  vi.stubEnv("AUTO_OFFER_ENABLED", "false");
  const response = await GET(request(host));
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(await response.json()).toMatchObject({
    databaseConfiguratie: "mislukt",
    databaseVerbinding: "niet vast te stellen",
    firebaseConfiguratie: "mislukt",
    firebaseAuthenticatie: "niet vast te stellen",
    emailTestmodus: "geslaagd", smsTestmodus: "geslaagd", automatischeVerzendingUit: "geslaagd",
  });
  expect(mocks.query).not.toHaveBeenCalled();
  expect(mocks.auth).not.toHaveBeenCalled();
});

it("reports only statuses after read-only checks against the expected test services", async () => {
  vi.stubEnv("VERCEL_ENV", "preview");
  vi.stubEnv("VERCEL_GIT_COMMIT_REF", "develop/practice-security");
  vi.stubEnv("DATABASE_URL", "postgresql://fixture@ep-silent-feather-b9mwxrby-pooler.c-7.eu-central-1.aws.neon.tech/neondb?sslmode=require");
  vi.stubEnv("FIREBASE_PROJECT_ID", "noshowcontrol-preview");
  const clientEmail = "firebase-adminsdk-fbsvc@noshowcontrol-preview.iam.gserviceaccount.com";
  vi.stubEnv("FIREBASE_CLIENT_EMAIL", clientEmail);
  vi.stubEnv("FIREBASE_AUTH_EMULATOR_HOST", "");
  mocks.query.mockResolvedValue([{ name: "neondb" }]);
  mocks.apps.mockReturnValue([{ options: { credential: { projectId: "noshowcontrol-preview", clientEmail } } }]);
  const config = vi.fn().mockResolvedValue({});
  mocks.auth.mockReturnValue({ getProjectConfig: config });
  const output = await (await GET(request(host))).json();
  expect(output).toMatchObject({
    databaseConfiguratie: "geslaagd", databaseVerbinding: "geslaagd",
    firebaseConfiguratie: "geslaagd", firebaseAdminIdentiteit: "geslaagd", firebaseAuthenticatie: "geslaagd",
  });
  expect(Object.values(output).every((value) => ["geslaagd", "mislukt", "niet vast te stellen"].includes(String(value)))).toBe(true);
  expect(config).toHaveBeenCalledOnce();
});
