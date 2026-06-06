"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Info, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function QrGeneratorAdminPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/absensi");
    }, 5000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Card className="max-w-lg w-full">
        <CardContent className="p-8 text-center space-y-4">
          <div className="flex justify-center">
            <Info className="w-12 h-12 text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-[#1B2E4B]">
            Generate QR Dipindahkan
          </h2>
          <p className="text-slate-500">
            Fitur generate QR Code untuk presensi kini sepenuhnya dikelola oleh
            dosen melalui Portal Dosen.
          </p>
          <p className="text-sm text-slate-400">
            Anda akan diarahkan ke Rekap Absensi dalam 5 detik...
          </p>
          <Link href="/absensi">
            <Button className="mt-2">
              Ke Rekap Absensi
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
