"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import { doc, onSnapshot, getDoc as firebaseGetDoc } from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import { Clock, AlertCircle } from "lucide-react";

export default function FullscreenQrPage() {
  const searchParams = useSearchParams();
  const pertemuanId = searchParams.get("pertemuanId") || "";
  const payload = searchParams.get("payload") || "";

  const [qrImage, setQrImage] = useState("");
  const [isQrActive, setIsQrActive] = useState(true);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState("");
  const [matkulName, setMatkulName] = useState("");
  const [pertemuanInfo, setPertemuanInfo] = useState<{
    nomorPertemuan?: number;
    jamMulai?: string;
    jamSelesai?: string;
  }>({});
  const [isExpired, setIsExpired] = useState(false);

  // Generate QR image
  useEffect(() => {
    if (!payload) return;
    QRCode.toDataURL(payload, {
      width: 500,
      margin: 2,
      color: { dark: "#1B2E4B", light: "#FFFFFF" },
    }).then((url) => setQrImage(url));
  }, [payload]);

  // Listen pertemuan data
  useEffect(() => {
    if (!pertemuanId) return;

    const unsub = onSnapshot(doc(db, "pertemuan", pertemuanId), async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setIsQrActive(data.isQrActive);
        if (data.qrExpiresAt) {
          setExpiresAt(data.qrExpiresAt.toDate());
        }
        setPertemuanInfo({
          nomorPertemuan: data.nomorPertemuan,
          jamMulai: data.jamMulai,
          jamSelesai: data.jamSelesai,
        });

        // Fetch course name
        if (data.courseId) {
          const courseDoc = await firebaseGetDoc(doc(db, "courses", data.courseId));
          if (courseDoc.exists()) {
            setMatkulName(courseDoc.data()?.name || "");
          }
        }
      }
    });

    return () => unsub();
  }, [pertemuanId]);

  // Countdown
  useEffect(() => {
    if (!expiresAt || !isQrActive) {
      setCountdown("");
      return;
    }

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const exp = expiresAt.getTime();
      const diff = exp - now;

      if (diff <= 0) {
        setCountdown("00:00");
        setIsExpired(true);
        setIsQrActive(false);
        clearInterval(interval);
        return;
      }

      const minutes = Math.floor(diff / 1000 / 60);
      const seconds = Math.floor((diff / 1000) % 60);
      setCountdown(`${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, isQrActive]);

  // Fullscreen on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  if (!isQrActive || isExpired) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <div className="text-center space-y-6">
          <div className="w-32 h-32 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <AlertCircle className="w-16 h-16 text-red-600" />
          </div>
          <h1 className="text-4xl font-bold text-red-600">QR CODE SUDAH EXPIRED</h1>
          <p className="text-xl text-slate-500">
            Silakan generate QR baru dari dashboard admin
          </p>
          <p className="text-lg text-slate-400">
            {matkulName} — Pertemuan {pertemuanInfo.nomorPertemuan}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8">
      <div className="text-center space-y-6 max-w-2xl w-full">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-[#1B2E4B] mb-2">{matkulName || "Scan QR Code"}</h1>
          <p className="text-2xl text-slate-600">
            Pertemuan {pertemuanInfo.nomorPertemuan || "-"}
          </p>
          <p className="text-xl text-slate-400 mt-1">
            {pertemuanInfo.jamMulai} - {pertemuanInfo.jamSelesai}
          </p>
        </div>

        {/* QR Code */}
        {qrImage ? (
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
        ) : (
          <div className="w-[500px] h-[500px] bg-slate-100 rounded-2xl flex items-center justify-center mx-auto">
            <p className="text-slate-400 text-xl">Loading QR...</p>
          </div>
        )}

        {/* Timer & Status */}
        <div className="flex items-center justify-center gap-4">
          <div className="flex items-center gap-2 px-6 py-3 bg-green-50 rounded-full border border-green-200">
            <Clock className="w-6 h-6 text-green-600" />
            <span className="text-2xl font-mono font-bold text-green-700">
              {countdown || "--:--"}
            </span>
          </div>
          <div className="px-6 py-3 bg-[#1B2E4B] rounded-full">
            <span className="text-xl font-bold text-white">SIAKAD QR</span>
          </div>
        </div>

        <p className="text-lg text-slate-500">
          Scan dengan aplikasi SIAKAD Mobile untuk absensi
        </p>
      </div>
    </div>
  );
}
