import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  type User,
} from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "./config";

/**
 * True when Firebase client SDK cannot be used. This never enables an auth
 * bypass; it only lets UI show a clear failure instead of crashing.
 */
function skipFirebase(): boolean {
  return !isFirebaseConfigured();
}

/** Stable error code the login form can detect to switch into demo navigation. */
export const FIREBASE_NOT_CONFIGURED = "auth/firebase-not-configured";

class FirebaseNotConfiguredError extends Error {
  code = FIREBASE_NOT_CONFIGURED;
  constructor() {
    super("Firebase is niet geconfigureerd. Inloggen is tijdelijk niet beschikbaar.");
  }
}

/**
 * Register a new user: create in Firebase, then create Prisma User + Practice
 * + PracticeMember via /api/auth/register. The server route does the tenant
 * bootstrap atomically — without it the user would have no practiceId and
 * the multi-tenant dashboard would 403 on every query.
 */
export async function signUp(
  email: string,
  password: string,
  displayName: string,
  practiceName: string,
): Promise<User> {
  if (skipFirebase()) {
    throw new FirebaseNotConfiguredError();
  }

  const { user } = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
  await updateProfile(user, { displayName });

  const idToken = await user.getIdToken();
  const [firstName, ...rest] = displayName.split(" ");
  const lastName = rest.join(" ") || firstName;

  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken, firstName, lastName, practiceName }),
  });

  if (!res.ok) {
    // Surface the server's actual reason if available — much more useful
    // than the generic "Registratie mislukt" the prior version produced.
    const body = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
    throw new Error(body?.message ?? body?.error ?? "Registratie mislukt");
  }

  return user;
}

/**
 * Sign in and create a server-side session.
 */
export async function signIn(email: string, password: string): Promise<User> {
  if (skipFirebase()) {
    throw new FirebaseNotConfiguredError();
  }

  const { user } = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
  await createServerSession(user);
  return user;
}

/**
 * Sign out: clear server session, then sign out of Firebase.
 */
export async function signOut(): Promise<void> {
  let logoutError: Error | null = null;

  try {
    const res = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
    });

    if (!res.ok) {
      logoutError = new Error("Uitloggen mislukt: sessie kon niet worden gewist.");
    }
  } catch {
    logoutError = new Error("Uitloggen mislukt: sessie kon niet worden gewist.");
  }

  if (!skipFirebase()) {
    try {
      await firebaseSignOut(getFirebaseAuth());
    } catch {
      logoutError ??= new Error("Uitloggen mislukt: Firebase sessie kon niet worden gewist.");
    }
  }

  if (logoutError) {
    throw logoutError;
  }
}

/**
 * Listen for Firebase auth state changes.
 */
export function onAuthChange(callback: (user: User | null) => void) {
  if (skipFirebase()) {
    setTimeout(() => callback(null), 0);
    return () => {};
  }

  return onAuthStateChanged(getFirebaseAuth(), callback);
}

/**
 * Send the Firebase ID token to the server to mint an HttpOnly session cookie.
 */
async function createServerSession(user: User) {
  const idToken = await user.getIdToken();
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) {
    throw new Error("Sessie aanmaken mislukt");
  }
}
