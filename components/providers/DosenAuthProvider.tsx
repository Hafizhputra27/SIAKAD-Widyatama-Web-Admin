"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { signInWithCustomToken, signOut } from "firebase/auth";
import { auth } from "@/src/lib/firebase";

export interface DosenUser {
  nidn: string;
  name: string;
  email: string;
  title: string;
  department: string;
  role: string;
}

interface DosenAuthContextType {
  user: DosenUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (nidn: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const DosenAuthContext = createContext<DosenAuthContextType | null>(null);

export function DosenAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DosenUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();



  // Cek session saat mount
  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch("/api/auth/dosen/me", { credentials: "include" });
        const data = await res.json();
        if (data.user) {
          if (data.firebaseToken) {
            try {
              await signInWithCustomToken(auth, data.firebaseToken);
            } catch (fbErr) {
              console.error("[DosenAuth] Firebase client auth failed:", fbErr);
            }
          }
          setUser(data.user);
        } else {
          // Session tidak valid, force sign out dari Firebase client
          await signOut(auth);
        }
      } catch {
        // Session error, force sign out dari Firebase client
        try {
          await signOut(auth);
        } catch {}
      } finally {
        setIsLoading(false);
      }
    }
    checkSession();
  }, []);

  const login = async (nidn: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/dosen/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nidn, password }),
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        try {
          await signOut(auth);
        } catch {}
        throw new Error(data.error || "Login gagal");
      }

      if (data.firebaseToken) {
        try {
          await signInWithCustomToken(auth, data.firebaseToken);
        } catch (fbErr) {
          console.error("[DosenAuth] Firebase client login auth failed:", fbErr);
        }
      }
      setUser(data.user);
    } catch (error) {
      try {
        await signOut(auth);
      } catch {}
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await fetch("/api/auth/dosen/logout", {
        method: "POST",
        credentials: "include",
      });
      try {
        await signOut(auth);
      } catch {}
      setUser(null);
      router.push("/login-dosen");
    } catch {
      // Silent fail
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DosenAuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </DosenAuthContext.Provider>
  );
}

export function useDosenAuth() {
  const context = useContext(DosenAuthContext);
  if (!context) {
    throw new Error("useDosenAuth harus digunakan di dalam DosenAuthProvider");
  }
  return context;
}
