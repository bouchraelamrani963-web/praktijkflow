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
 * True when Firebase should not be touched: explicit opt-in env var, or no
 * Firebase config present. Activates in any NODE_ENV — production deploys
 * without Firebase secrets fall through to the bypass path so the demo
 * dashboard remains reachable.
 */
function skipFirebase(): boolean {
  return process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === "true" || !isFirebaseConfigured();
}

/** Stable error code the login form can detect to switch into demo navigation. */
export const FIREBASE_NOT_CONFIGURED = "auth/firebase-not-configured";

class FirebaseNotConfiguredError extends Error {
  code = FIREBASE_NOT_CONFIGURED;
  constructor() {
    super("Firebase is niet geconfigureerd. Demo-modus actief.");
  }
}

/**
 * Register a new user: create in Firebase, then create Prisma user + session via server.
 */
export async function signUp(email: string, password: string, displayName: string): Promise<User> {
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
    body: JSON.stringify({ idToken, firstName, lastName }),
  });

  if (!res.ok) {
    throw new Error("Registratie mislukt");
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
  if (skipFirebase()) {
    // Bypass mode: nothing to sign out from
    return;
  }

  await fetch("/api/auth/logout", { method: "POST" });
  await firebaseSignOut(getFirebaseAuth());
}

/**
 * Listen for Firebase auth state changes.
 * In bypass mode, fires callback with null once (AuthProvider handles the rest).
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
