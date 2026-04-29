import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  type User,
} from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "./config";

/** True when Firebase should not be touched (explicit env var OR missing config). */
function skipFirebase(): boolean {
  return process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === "true" || !isFirebaseConfigured();
}

/**
 * Register a new user: create in Firebase, then create Prisma user + session via server.
 */
export async function signUp(email: string, password: string, displayName: string) {
  if (skipFirebase()) {
    throw new Error("Firebase is not configured. In dev mode, navigate directly to /dashboard.");
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
    throw new Error("Failed to register");
  }

  return user;
}

/**
 * Sign in and create a server-side session.
 */
export async function signIn(email: string, password: string) {
  if (skipFirebase()) {
    throw new Error("Firebase is not configured. In dev mode, navigate directly to /dashboard.");
  }

  const { user } = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
  await createServerSession(user);
  return user;
}

/**
 * Sign out: clear server session, then sign out of Firebase.
 */
export async function signOut() {
  if (skipFirebase()) {
    // Dev mode: nothing to sign out from
    return;
  }

  await fetch("/api/auth/logout", { method: "POST" });
  await firebaseSignOut(getFirebaseAuth());
}

/**
 * Listen for Firebase auth state changes.
 * In dev mode without Firebase, fires callback with null once (AuthProvider handles the rest).
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
    throw new Error("Failed to create session");
  }
}
