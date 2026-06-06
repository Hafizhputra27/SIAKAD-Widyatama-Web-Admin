"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function FullscreenQrAdminPage() {
  const router = useRouter();

  useEffect(() => {
    router.push("/absensi");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <p className="text-xl text-slate-400">Mengalihkan ke Rekap Absensi...</p>
    </div>
  );
}
