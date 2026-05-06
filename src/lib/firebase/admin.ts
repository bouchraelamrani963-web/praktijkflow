import {
  initializeApp,
  getApps,
  cert,
  type App,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/**
 * Returns true when the three required Firebase Admin env vars are present
 * (existence-only check — does NOT validate format). Used by session.ts to
 * decide whether bypass mode is active.
 *
 * If env vars exist but are malformed (e.g. private key with no newlines),
 * `getAdminApp()` will throw with a specific error message at first use —
 * intentionally a loud failure so misconfigured deploys surface fast
 * instead of silently degrading to bypass.
 */
export function isFirebaseAdminConfigured(): boolean {
  return !!(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  );
}

// ─── Service-account parsing ────────────────────────────────────────────────
// All quirks around how operators paste FIREBASE_PRIVATE_KEY into Vercel are
// handled here in ONE place. The most common paste-time failure modes:
//
//   1. Real PEM with `\n` escape sequences (single-line):
//        "-----BEGIN PRIVATE KEY-----\nMIIE…\n-----END PRIVATE KEY-----\n"
//      → must convert literal `\n` chars to actual newlines.
//
//   2. PEM wrapped in surrounding quote chars (`"…"` or `'…'`) because the
//      operator copied a JSON value verbatim:
//        '"-----BEGIN PRIVATE KEY-----\n…-----END PRIVATE KEY-----\n"'
//      → strip a single matched pair of surrounding quotes.
//
//   3. PEM with literal newlines (rare; Vercel's UI usually preserves these
//      when you paste a multi-line value into the secret-input). Already
//      valid as-is — the `\n` replace is a no-op.
//
//   4. Missing newlines entirely (operator pasted from a UI that stripped
//      them) — caught by the "starts with -----BEGIN" check below.
//
// We never log the key contents — only a few booleans about its shape.

interface ParsedServiceAccount {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

let _diagLogged = false;

function parseServiceAccount(): ParsedServiceAccount {
  const projectId = (process.env.FIREBASE_PROJECT_ID ?? "").trim();
  const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL ?? "").trim();
  const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY ?? "";

  // Trim whitespace, then strip a single matched pair of surrounding quotes
  // (handles both " and ') if and only if both ends match. Don't strip
  // unbalanced quotes — that would corrupt a key with a quote inside.
  let privateKey = rawPrivateKey.trim();
  if (
    (privateKey.startsWith('"') && privateKey.endsWith('"')) ||
    (privateKey.startsWith("'") && privateKey.endsWith("'"))
  ) {
    privateKey = privateKey.slice(1, -1);
  }

  // Replace `\n` escape sequences with real newlines. Idempotent — if the
  // value already contains real newlines, this is a no-op (the regex matches
  // the literal two-char sequence backslash-n only, not real newline chars).
  privateKey = privateKey.replace(/\\n/g, "\n");

  // ─── Diagnostic log (boolean only — never the secret content) ───────────
  // Fires once per cold-start so operators can grep Vercel logs to confirm
  // the env vars were picked up and that the key was reshaped successfully.
  if (!_diagLogged) {
    _diagLogged = true;
    console.log(
      `[firebase.admin] env-check — projectId:${!!projectId} clientEmail:${!!clientEmail} ` +
        `privateKey:${!!privateKey} privateKeyLen:${privateKey.length} ` +
        `beginsWithPemHeader:${privateKey.startsWith("-----BEGIN")}`,
    );
  }

  // ─── Validate, with specific named errors ─────────────────────────────
  // Each branch names exactly which env var is wrong so operators don't
  // have to guess. None of these messages include the secret content.
  if (!projectId) {
    throw new Error("Firebase Admin: FIREBASE_PROJECT_ID is missing or empty.");
  }
  if (!clientEmail) {
    throw new Error("Firebase Admin: FIREBASE_CLIENT_EMAIL is missing or empty.");
  }
  if (!privateKey) {
    throw new Error("Firebase Admin: FIREBASE_PRIVATE_KEY is missing or empty.");
  }
  if (!privateKey.startsWith("-----BEGIN")) {
    throw new Error(
      "Firebase Admin: FIREBASE_PRIVATE_KEY does not look like a PEM block " +
        "(must start with '-----BEGIN'). Common cause: newlines were stripped " +
        "during paste — re-paste the key with `\\n` escape sequences preserved.",
    );
  }
  if (!privateKey.includes("-----END")) {
    throw new Error(
      "Firebase Admin: FIREBASE_PRIVATE_KEY is missing the PEM end marker " +
        "(`-----END PRIVATE KEY-----`). The value was likely truncated.",
    );
  }

  return { projectId, clientEmail, privateKey };
}

// ─── App initialization (singleton) ─────────────────────────────────────────

let _app: App | null = null;

function getAdminApp(): App {
  if (_app) return _app;

  // Reuse an existing app if firebase-admin was initialized elsewhere
  // (e.g. by HMR in development).
  const existing = getApps();
  if (existing.length > 0) {
    _app = existing[0];
    return _app;
  }

  const sa = parseServiceAccount();
  _app = initializeApp({
    credential: cert({
      projectId: sa.projectId,
      clientEmail: sa.clientEmail,
      privateKey: sa.privateKey,
    }),
  });
  return _app;
}

// ─── Public proxies (lazy-init) ─────────────────────────────────────────────
// Proxies defer getAdminApp() until a property is actually accessed, so just
// importing this file doesn't trigger initialization.

export const adminAuth: Auth = new Proxy({} as Auth, {
  get(_, prop) {
    return (getAuth(getAdminApp()) as never)[prop];
  },
});

export const adminDb: Firestore = new Proxy({} as Firestore, {
  get(_, prop) {
    return (getFirestore(getAdminApp()) as never)[prop];
  },
});
