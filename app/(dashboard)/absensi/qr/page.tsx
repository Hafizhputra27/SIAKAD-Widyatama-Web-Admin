"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { collection, onSnapshot, doc, getDoc } from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "react-hot-toast";
import {
  Loader2,
  QrCode,
  Clock,
  Maximize2,
  RotateCcw,
  StopCircle,
  Plus,
} from "lucide-react";
import type { MataKuliah } from "@/src/types";

interface Pertemuan {
  id: string;
  courseId: string;
  courseName: string;
  nomorPertemuan: number;
  tanggal: Date;
  jamMulai: string;
  jamSelesai: string;
  qrToken: string;
  qrExpiresAt: Date;
  isQrActive: boolean;
}

export default function QrGeneratorPage() {
  const router = useRouter();
  const [matkulList, setMatkulList] = useState<(MataKuliah & { code: string })[]>([]);
  const [pertemuanList, setPertemuanList] = useState<Pertemuan[]>([]);
  const [selectedMatkul, setSelectedMatkul] = useState("");
  const [selectedPertemuan, setSelectedPertemuan] = useState("");
  const [durasi, setDurasi] = useState("15");
  const [qrImage, setQrImage] = useState("");
  const [qrPayload, setQrPayload] = useState("");
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [isQrActive, setIsQrActive] = useState(false);
  const [countdown, setCountdown] = useState("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Fetch matkul
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "courses"), (snap) => {
      const data = snap.docs
        .map((d) => ({ code: d.id, ...d.data() } as MataKuliah & { code: string }))
        .filter((m) => m.isActive !== false);
      setMatkulList(data);
    });
    return () => unsub();
  }, []);

  // Fetch pertemuan saat matkul dipilih
  useEffect(() => {
    if (!selectedMatkul) {
      setPertemuanList([]);
      return;
    }

    const unsub = onSnapshot(
      collection(db, "pertemuan"),
      (snap) => {
        const data = snap.docs
          .filter((d) => d.data().courseId === selectedMatkul)
          .map((d) => ({ id: d.id, ...d.data() } as unknown as Pertemuan))
          .sort((a, b) => a.nomorPertemuan - b.nomorPertemuan);
        setPertemuanList(data);
      }
    );
    return () => unsub();
  }, [selectedMatkul]);

  // Real-time listener untuk QR status
  useEffect(() => {
    if (!selectedPertemuan) return;

    const unsub = onSnapshot(
      doc(db, "pertemuan", selectedPertemuan),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as Pertemuan;
          setIsQrActive(data.isQrActive);
          if (data.qrExpiresAt) {
            const exp = data.qrExpiresAt as unknown as { toDate?: () => Date };
            setExpiresAt(exp.toDate ? exp.toDate() : new Date(data.qrExpiresAt));
          }
        }
      }
    );
    return () => unsub();
  }, [selectedPertemuan]);

  // Countdown timer
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
        setCountdown("EXPIRED");
        setIsQrActive(false);
        clearInterval(interval);
        return;
      }

      const minutes = Math.floor(diff / 1000 / 60);
      const seconds = Math.floor((diff / 1000) % 60);
      setCountdown(`${minutes}:${String(seconds).padStart(2, "0")}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, isQrActive]);

  const handleGenerate = async () => {
    if (!selectedPertemuan) {
      toast.error("Pilih pertemuan terlebih dahulu");
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch(`/api/pertemuan/${selectedPertemuan}/generate-qr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ durasiMenit: parseInt(durasi) }),
      });

      if (res.ok) {
        const data = await res.json();
        setQrPayload(data.qrPayload);

        // Generate QR image
        const qrDataUrl = await QRCode.toDataURL(data.qrPayload, {
          width: 400,
          margin: 2,
          color: { dark: "#1B2E4B", light: "#FFFFFF" },
        });
        setQrImage(qrDataUrl);
        setExpiresAt(new Date(data.qrExpiresAt));
        setIsQrActive(true);
        toast.success("QR Code berhasil digenerate");
      } else {
        throw new Error("Gagal");
      }
    } catch {
      toast.error("Gagal generate QR");
    } finally {
      setGenerating(false);
    }
  };

  const handleDeactivate = async () => {
    if (!selectedPertemuan) return;
    try {
      const res = await fetch(`/api/pertemuan/${selectedPertemuan}/deactivate-qr`, {
        method: "POST",
      });
      if (res.ok) {
        toast.success("QR berhasil dinonaktifkan");
        setIsQrActive(false);
        setQrImage("");
      }
    } catch {
      toast.error("Gagal menonaktifkan QR");
    }
  };

  const handleExtend = async () => {
    if (!selectedPertemuan) return;
    await handleGenerate(); // Re-generate dengan durasi baru
  };

  const openFullscreen = () => {
    if (!selectedPertemuan || !qrPayload) return;
    const url = `/absensi/qr/fullscreen?pertemuanId=${selectedPertemuan}&payload=${encodeURIComponent(qrPayload)}`;
    window.open(url, "_blank", "width=800,height=800");
  };

  const selectedPertemuanData = pertemuanList.find((p) => p.id === selectedPertemuan);
  const selectedMatkulData = matkulList.find((m) => m.code === selectedMatkul);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1B2E4B]">Generate QR Absensi</h2>
        <p className="text-sm text-slate-500 mt-1">
          Generate QR Code untuk absensi mahasiswa
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel Kiri: Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Setup QR Code</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Pilih Mata Kuliah */}
            <div className="space-y-2">
              <Label>Mata Kuliah *</Label>
              <Select value={selectedMatkul} onValueChange={setSelectedMatkul}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih mata kuliah" />
                </SelectTrigger>
                <SelectContent>
                  {matkulList.map((m) => (
                    <SelectItem key={m.code} value={m.code}>
                      {m.code} - {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Pilih Pertemuan */}
            <div className="space-y-2">
              <Label>Pertemuan *</Label>
              <Select value={selectedPertemuan} onValueChange={setSelectedPertemuan}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih pertemuan" />
                </SelectTrigger>
                <SelectContent>
                  {pertemuanList.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      Pertemuan {p.nomorPertemuan} - {p.jamMulai} s/d {p.jamSelesai}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {pertemuanList.length === 0 && selectedMatkul && (
                <p className="text-xs text-slate-400">
                  Belum ada pertemuan untuk matkul ini
                </p>
              )}
            </div>

            {/* Info Pertemuan */}
            {selectedPertemuanData && (
              <div className="p-3 bg-slate-50 rounded-lg text-sm space-y-1">
                <p>
                  <span className="text-slate-500">Tanggal:</span>{" "}
                  {selectedPertemuanData.tanggal
                    ? new Date(selectedPertemuanData.tanggal).toLocaleDateString("id-ID")
                    : "-"}
                </p>
                <p>
                  <span className="text-slate-500">Jam:</span>{" "}
                  {selectedPertemuanData.jamMulai} - {selectedPertemuanData.jamSelesai}
                </p>
              </div>
            )}

            {/* Durasi */}
            <div className="space-y-2">
              <Label>Durasi QR Valid</Label>
              <Select value={durasi} onValueChange={setDurasi}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 10, 15, 20, 30].map((d) => (
                    <SelectItem key={d} value={d.toString()}>
                      {d} menit
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tombol Generate */}
            <Button
              onClick={handleGenerate}
              disabled={generating || !selectedPertemuan}
              className="w-full bg-[#2563EB] hover:bg-[#1d4ed8] h-12 text-base"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <QrCode className="w-5 h-5 mr-2" />
                  Generate QR Code
                </>
              )}
            </Button>

            {/* Status & Actions */}
            {isQrActive && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-700">
                      QR Aktif — {countdown || "Calculating..."}
                    </span>
                  </div>
                  <Badge className="bg-green-100 text-green-700 animate-pulse">
                    LIVE
                  </Badge>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleExtend} className="flex-1">
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Perpanjang
                  </Button>
                  <Button variant="outline" size="sm" onClick={openFullscreen} className="flex-1">
                    <Maximize2 className="w-4 h-4 mr-1" />
                    Fullscreen
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeactivate}
                    className="flex-1"
                  >
                    <StopCircle className="w-4 h-4 mr-1" />
                    Stop
                  </Button>
                </div>
              </div>
            )}

            {countdown === "EXPIRED" && (
              <div className="p-3 bg-red-50 rounded-lg text-center">
                <p className="text-sm font-medium text-red-700">QR Sudah Expired</p>
                <Button variant="outline" size="sm" onClick={handleGenerate} className="mt-2">
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Generate Ulang
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Panel Kanan: QR Display */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">QR Code</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center min-h-[400px]">
            {qrImage ? (
              <div className="text-center space-y-4">
                <img
                  src={qrImage}
                  alt="QR Code"
                  className="w-64 h-64 mx-auto border-2 border-dashed border-slate-300 rounded-lg p-2"
                />
                <div className="space-y-1">
                  <p className="font-semibold text-lg">{selectedMatkulData?.name}</p>
                  <p className="text-sm text-slate-500">
                    Pertemuan {selectedPertemuanData?.nomorPertemuan} |{" "}
                    {selectedPertemuanData?.tanggal
                      ? new Date(selectedPertemuanData.tanggal).toLocaleDateString("id-ID")
                      : ""}
                  </p>
                  <p className="text-sm text-slate-500">
                    {selectedPertemuanData?.jamMulai} - {selectedPertemuanData?.jamSelesai}
                  </p>
                  {isQrActive ? (
                    <Badge className="bg-green-100 text-green-700 animate-pulse mt-2">
                      QR AKTIF — Scan sebelum {expiresAt?.toLocaleTimeString("id-ID")}
                    </Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-700 mt-2">QR TIDAK AKTIF</Badge>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center text-slate-400">
                <QrCode className="w-16 h-16 mx-auto mb-3 opacity-30" />
                <p>QR Code akan ditampilkan di sini</p>
                <p className="text-xs mt-1">Generate QR untuk memulai</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Simple Label component
function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-medium text-slate-700">{children}</p>;
}
