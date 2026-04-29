"use client";

import { createContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { type User } from "firebase/auth";
import { onAuthChange, signIn, signUp, signOut } from "@/lib/firebase/auth";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import type { Role } from "@/generated/prisma/client";

/**
 * True when running `next dev` with NEXT_PUBLIC_DEV_AUTH_BYPASS=true,
 * or when Firebase client env vars are absent.
 * Evaluated once at bundle time (NEXT_PUBLIC_ vars are inlined by Next.js).
 */
const DEV_AUTH_BYPASS =
  process.env.NODE_ENV === "development" &&
  (process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === "true" || !isFirebaseConfigured());

export interface SessionProfile {
  uid: string;
  firebaseUid: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  avatarUrl: string | null;
  practiceId: string | null;
  practiceName: string | null;
  role: Role | null;
}

interface AuthContextType {
  user: User | null;
  profile: SessionProfile | null;
  loading: boolean;
  devMode: boolean;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (email: string, password: string, displayName: string) => Promise<User>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<SessionProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setProfile(data.user);
      } else {
        setProfile(null);
      }
    } catch {
      setProfile(null);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    // Dev bypass: skip Firebase entirely, use server-side dev user
    if (DEV_AUTH_BYPASS) {
      // Set a mock User object so layout guards don't redirect to /login
      setUser({ email: "dev@localhost", uid: "dev-bypass" } as unknown as User);
      fetchProfile().finally(() => setLoading(false));
      return;
    }

    const unsubscribe = onAuthChange(async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await fetchProfile();
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [fetchProfile]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        devMode: DEV_AUTH_BYPASS,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
