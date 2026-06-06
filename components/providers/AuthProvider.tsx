"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
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
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Cek session saat mount
  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        const data = await res.json();
        if (data.user) {
          // Tunggu sampai Firebase Auth selesai memproses state login-nya
          await new Promise<void>((resolve) => {
            const unsubscribe = auth.onAuthStateChanged(() => {
              unsubscribe();
              resolve();
            });
          });
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

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // Step 1: Login dengan Firebase Auth client
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await userCredential.user.getIdToken();

      // Step 2: Kirim ID token ke API untuk verifikasi dan set session cookie
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Sign out dari Firebase client jika API menolak
        await signOut(auth);
        throw new Error(data.error || "Login gagal");
      }

      setUser(data.user);
      // Redirect handled by caller
    } catch (error) {
      await signOut(auth);
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
