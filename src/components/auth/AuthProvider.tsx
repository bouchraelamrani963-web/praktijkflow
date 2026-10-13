"use client";

import { createContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { type User } from "firebase/auth";
import { onAuthChange, signIn, signUp, signOut } from "@/lib/firebase/auth";
import type { Role } from "@/generated/prisma/client";

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
  signUp: (email: string, password: string, displayName: string, practiceName: string) => Promise<User>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<SessionProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (): Promise<SessionProfile | null> => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setProfile(data.user);
        return data.user;
      } else {
        setProfile(null);
        return null;
      }
    } catch {
      setProfile(null);
      return null;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    let settled = false;

    const unsubscribe = onAuthChange(async (firebaseUser) => {
      settled = true;
      if (firebaseUser) {
        const serverProfile = await fetchProfile();
        setUser(serverProfile ? firebaseUser : null);
      } else {
        const serverProfile = await fetchProfile();
        if (serverProfile) {
          setUser({
            email: serverProfile.email,
            uid: serverProfile.firebaseUid,
          } as unknown as User);
        } else {
          setProfile(null);
        }
      }
      setLoading(false);
    });

    // Server-session fallback: a valid HttpOnly session cookie should be enough
    // to keep dashboard pages usable, even if Firebase client persistence is
    // slow, blocked, or unavailable in a fresh browser profile.
    const timer = window.setTimeout(() => {
      fetchProfile().then((serverProfile) => {
        if (!serverProfile || settled) return;
        setUser({
          email: serverProfile.email,
          uid: serverProfile.firebaseUid,
        } as unknown as User);
        setLoading(false);
      });
    }, 0);

    return () => {
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, [fetchProfile]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        devMode: false,
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
