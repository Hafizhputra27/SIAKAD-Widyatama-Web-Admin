"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Route guard: jika sudah login, redirect ke dashboard
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push("/");
    }
  }, [authLoading, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Email dan password wajib diisi");
      return;
    }

    if (password.length < 6) {
      setError("Password minimal 6 karakter");
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password);
      // Redirect ke / setelah login sukses
      router.push("/");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Email atau password salah";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Tampilkan loading saat menunggu auth check
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#2563EB]" />
          <p className="text-sm text-slate-500">Memuat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Kiri - Branding (hidden di mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#1B2E4B] flex-col justify-center items-center p-12 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-blue-500/20 blur-3xl" />
        </div>
        <div className="relative z-10 text-center space-y-6">
          <div className="flex items-center justify-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-[#2563EB] flex items-center justify-center">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold tracking-tight">
            Universitas Widyatama
          </h1>
          <p className="text-xl text-slate-300 max-w-md">
            Sistem Informasi Akademik Terintegrasi
          </p>
          <div className="pt-8 text-sm text-slate-400">
            <p>Manage data mahasiswa, jadwal, absensi, dan nilai</p>
            <p>dalam satu platform terpadu.</p>
          </div>
        </div>
      </div>

      {/* Kanan - Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 bg-slate-50">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <div className="lg:hidden flex items-center justify-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-lg bg-[#2563EB] flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <span className="text-lg font-bold text-[#1B2E4B]">
                Universitas Widyatama
              </span>
            </div>
            <h2 className="text-2xl font-bold text-[#1B2E4B]">
              Login Admin
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Masukkan email dan password untuk mengakses dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@widyatama.ac.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11"
                required
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-medium"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memuat...
                </>
              ) : (
                "Login"
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-slate-400">
            SIAKAD Web Admin v0.1.0
          </p>
        </div>
      </div>
    </div>
  );
}
