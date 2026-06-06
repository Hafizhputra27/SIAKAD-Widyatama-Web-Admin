"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDosenAuth } from "@/hooks/useDosenAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";

export default function LoginDosenPage() {
  const [nidn, setNidn] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated, isLoading: authLoading } = useDosenAuth();
  const router = useRouter();

  // Auto-redirect ke portal jika sudah login
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push("/portal-dosen");
    }
  }, [authLoading, isAuthenticated, router]);

  // Tampilkan loading saat cek session
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nidn || !password) {
      toast.error("NIDN dan password wajib diisi");
      return;
    }

    setIsLoading(true);
    try {
      await login(nidn, password);
      toast.success("Login berhasil");
      router.push("/portal-dosen");
    } catch (err: any) {
      toast.error(err.message || "Login gagal");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center">
            <GraduationCap className="w-12 h-12 text-[#2563EB]" />
          </div>
          <CardTitle className="text-2xl font-bold text-[#1B2E4B]">
            Login Dosen
          </CardTitle>
          <p className="text-sm text-slate-500">
            SIAKAD - Portal Dosen
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nidn">NIDN</Label>
              <Input
                id="nidn"
                placeholder="Masukkan NIDN"
                value={nidn}
                onChange={(e) => setNidn(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-slate-400">
                Password default: {"{NIDN}@widyatama"}
              </p>
            </div>
            <Button
              type="submit"
              className="w-full bg-[#2563EB] hover:bg-[#1d4ed8] h-11"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Memuat...
                </>
              ) : (
                "Login"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
