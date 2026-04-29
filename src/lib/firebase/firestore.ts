import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { type User } from "firebase/auth";
import { getFirebaseDb } from "./config";
import type { UserProfile } from "@/types";

export async function createUserProfile(user: User): Promise<void> {
  const ref = doc(getFirebaseDb(), "users", user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      stripeCustomerId: null,
      subscriptionId: null,
      subscriptionStatus: "none",
      plan: "free",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const ref = doc(getFirebaseDb(), "users", uid);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export async function updateUserProfile(
  uid: string,
  data: Partial<UserProfile>
): Promise<void> {
  const ref = doc(getFirebaseDb(), "users", uid);
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
}
