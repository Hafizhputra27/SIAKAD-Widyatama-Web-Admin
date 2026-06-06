"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import QRCode from "qrcode";

export default function QrFullscreenPage() {
  const searchParams = useSearchParams();
  const pertemuanId = searchParams.get("pertemuanId");
  const [qrImage, setQrImage] = useState("");
  const [courseName, setCourseName] = useState("");
  const [nomorPertemuan, setNomorPertemuan] = useState(0);
  const [countdown, setCountdown] = useState("");
  const [isActive, setIsActive] = useState(false);

  // Listen to Firestore for latest qrToken and auto-regenerate QR
  useEffect(() => {
    if (!pertemuanId) return;

    const unsub = onSnapshot(doc(db, "pertemuan", pertemuanId), (snap) => {
      if (!snap.exists()) {
        setQrImage("");
        setIsActive(false);
        return;
      }

      const data = snap.data();
      setCourseName(data.courseName || "");
      setNomorPertemuan(data.nomorPertemuan || 0);

      if (data.qrToken && data.isQrActive) {
        setIsActive(true);
        const payload = JSON.stringify({
          token: data.qrToken,
          courseId: data.courseId,
          pertemuanId: pertemuanId,
          expiresAt: data.qrExpiresAt?.toDate?.().toISOString() || new Date().toISOString(),
        });

        QRCode.toDataURL(payload, {
          width: 600,
          margin: 2,
          color: { dark: "#1B2E4B", light: "#FFFFFF" },
        }).then((url) => setQrImage(url));
      } else {
        setIsActive(false);
        setQrImage("");
      }
    });

    return () => unsub();
  }, [pertemuanId]);

  // Countdown for visual feedback (counts down 60s for refresh)
  useEffect(() => {
    if (!isActive) {
      setCountdown("");
      return;
    }

    const interval = setInterval(() => {
      const seconds = 60 - new Date().getSeconds();
      setCountdown(`${seconds}d`);
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive]);

  if (!pertemuanId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-2xl text-red-500">Pertemuan tidak ditemukan</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-8">
      {qrImage && isActive ? (
        <div className="text-center space-y-8">
          {/* Course Info */}
          <div>
            <h1 className="text-4xl font-bold text-[#1B2E4B]">{courseName || "Scan QR Code"}</h1>
            <p className="text-2xl text-slate-600 mt-2">
              Pertemuan {nomorPertemuan || "-"}
            </p>
          </div>

          {/* QR Code */}
          <div className="relative inline-block">
            <img
              src={qrImage}
              alt="QR Code"
              className="w-[500px] h-[500px] mx-auto border-4 border-[#1B2E4B] rounded-2xl"
            />
            {/* Scan line animation */}
            <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
              <style>{`
                @keyframes scan {
                  0% { top: 0%; }
                  50% { top: 100%; }
                  100% { top: 0%; }
                }
                .scan-line {
                  animation: scan 4s linear infinite;
                }
              `}</style>
              <div className="absolute left-0 right-0 h-1 bg-green-400 opacity-80 scan-line shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
            </div>
          </div>

          {/* Status & Timer */}
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-2 px-6 py-3 bg-green-50 rounded-full border border-green-200">
              <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              <span className="text-lg font-bold text-green-700">QR AKTIF</span>
            </div>
            <div className="px-6 py-3 bg-[#1B2E4B] rounded-full">
              <span className="text-lg font-bold text-white">SIAKAD</span>
            </div>
          </div>

          <p className="text-lg text-slate-500">
            Scan dengan aplikasi SIAKAD Mobile untuk absensi
          </p>
          <p className="text-sm text-slate-400">
            QR akan refresh otomatis • {countdown || "--"}
          </p>
        </div>
      ) : (
        <div className="text-center space-y-6">
          <div className="w-32 h-32 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <svg className="w-16 h-16 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-red-600">QR TIDAK AKTIF</h1>
          <p className="text-xl text-slate-500">
            Silakan generate QR baru dari portal dosen
          </p>
          <p className="text-lg text-slate-400">
            {courseName} — Pertemuan {nomorPertemuan}
          </p>
        </div>
      )}
    </div>
  );
}
