"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  signInWithEmailAndPassword,
  signInWithCustomToken,
  signOut,
} from "firebase/auth";
import { auth } from "@/src/lib/firebase";
import { useRouter } from "next/navigation";

export interface AdminUser {
  uid: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: AdminUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isFirebaseReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const router = useRouter();

  // Cek session saat mount
  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        const data = await res.json();
        if (data.user) {
          if (data.firebaseToken) {
            try {
              await signInWithCustomToken(auth, data.firebaseToken);
              setIsFirebaseReady(true);
            } catch (fbErr) {
              console.error("[AuthProvider] Firebase client auth failed:", fbErr);
              setIsFirebaseReady(!!auth.currentUser);
            }
          } else {
            setIsFirebaseReady(!!auth.currentUser);
          }
          setUser(data.user);
        } else {
          await signOut(auth);
          setIsFirebaseReady(false);
        }
      } catch {
        try {
          await signOut(auth);
        } catch {}
        setIsFirebaseReady(false);
      } finally {
        setIsLoading(false);
      }
    }
    checkSession();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await userCredential.user.getIdToken();

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      const data = await res.json();

      if (!res.ok) {
        await signOut(auth);
        setIsFirebaseReady(false);
        throw new Error(data.error || "Login gagal");
      }

      if (data.firebaseToken) {
        try {
          await signInWithCustomToken(auth, data.firebaseToken);
        } catch (fbErr) {
          console.error("[AuthProvider] Firebase client login auth failed:", fbErr);
        }
      }

      setUser(data.user);
      setIsFirebaseReady(!!auth.currentUser);
    } catch (error) {
      await signOut(auth);
      setIsFirebaseReady(false);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      await signOut(auth);
      setUser(null);
      setIsFirebaseReady(false);
      router.push("/login");
    } catch {
      // Silent fail
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isFirebaseReady,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth harus digunakan di dalam AuthProvider");
  }
  return context;
}
