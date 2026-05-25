"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { collection, onSnapshot, doc, getDoc } from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Calendar as CalendarIcon,
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
  const [pertemuanMap, setPertemuanMap] = useState<Map<number, Pertemuan>>(new Map());
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
  const [creatingPertemuan, setCreatingPertemuan] = useState(false);

  // Form untuk buat pertemuan baru
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPertemuanNum, setNewPertemuanNum] = useState<number | null>(null);
  const [newTanggal, setNewTanggal] = useState("");
  const [newJamMulai, setNewJamMulai] = useState("");
  const [newJamSelesai, setNewJamSelesai] = useState("");

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

  // Fetch pertemuan saat matkul dipilih, lalu map ke 16 slot
  useEffect(() => {
    if (!selectedMatkul) {
      setPertemuanMap(new Map());
      setSelectedPertemuan("");
      return;
    }

    const unsub = onSnapshot(
      collection(db, "pertemuan"),
      (snap) => {
        const existing = snap.docs
          .filter((d) => d.data().courseId === selectedMatkul)
          .map((d) => ({ id: d.id, ...d.data() } as unknown as Pertemuan));

        const map = new Map<number, Pertemuan>();
        existing.forEach((p) => {
          map.set(p.nomorPertemuan, p);
        });
        setPertemuanMap(map);
      }
    );
    return () => unsub();
  }, [selectedMatkul]);

  // Saat matkul dipilih, set default jam dari jadwal matkul
  useEffect(() => {
    if (selectedMatkul) {
      const matkul = matkulList.find((m) => m.code === selectedMatkul);
      if (matkul) {
        setNewJamMulai(matkul.jamMulai || "");
        setNewJamSelesai(matkul.jamSelesai || "");
        // Set default tanggal ke hari ini
        setNewTanggal(new Date().toISOString().split("T")[0]);
      }
    }
  }, [selectedMatkul, matkulList]);

  // Real-time listener untuk QR status
  useEffect(() => {
    if (!selectedPertemuan || selectedPertemuan.startsWith("NEW_")) return;

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

  const handleSelectPertemuan = (value: string) => {
    setSelectedPertemuan(value);
    setQrImage("");
    setIsQrActive(false);

    if (value.startsWith("NEW_")) {
      const nomor = parseInt(value.replace("NEW_", ""));
      setNewPertemuanNum(nomor);
      setShowCreateForm(true);
    } else {
      setShowCreateForm(false);
      setNewPertemuanNum(null);
    }
  };

  const handleCreatePertemuan = async () => {
    if (!selectedMatkul || !newPertemuanNum) return;
    if (!newTanggal || !newJamMulai || !newJamSelesai) {
      toast.error("Tanggal, jam mulai, dan jam selesai wajib diisi");
      return;
    }

    setCreatingPertemuan(true);
    try {
      const matkul = matkulList.find((m) => m.code === selectedMatkul);
      const res = await fetch("/api/pertemuan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: selectedMatkul,
          courseName: matkul?.name || "",
          nomorPertemuan: newPertemuanNum,
          tanggal: newTanggal,
          jamMulai: newJamMulai,
          jamSelesai: newJamSelesai,
          enrolledNpms: [],
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Pertemuan ${newPertemuanNum} berhasil dibuat`);
        setShowCreateForm(false);
        // Tunggu onSnapshot update, lalu auto-select pertemuan baru
        // (listener akan update pertemuanMap dan dropdown akan refresh)
      } else {
        throw new Error(data.error || "Gagal membuat pertemuan");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat pertemuan");
    } finally {
      setCreatingPertemuan(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedPertemuan) {
      toast.error("Pilih pertemuan terlebih dahulu");
      return;
    }

    if (selectedPertemuan.startsWith("NEW_")) {
      toast.error("Pertemuan belum dibuat. Isi form dan klik 'Buat Pertemuan' dulu.");
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
    if (!selectedPertemuan || selectedPertemuan.startsWith("NEW_")) return;
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
    if (!selectedPertemuan || selectedPertemuan.startsWith("NEW_")) return;
    await handleGenerate(); // Re-generate dengan durasi baru
  };

  const openFullscreen = () => {
    if (!selectedPertemuan || !qrPayload || selectedPertemuan.startsWith("NEW_")) return;
    const url = `/absensi/qr/fullscreen?pertemuanId=${selectedPertemuan}&payload=${encodeURIComponent(qrPayload)}`;
    window.open(url, "_blank", "width=800,height=800");
  };

  const selectedPertemuanData = pertemuanMap.get(
    selectedPertemuan && !selectedPertemuan.startsWith("NEW_")
      ? parseInt(selectedPertemuan) || 0
      : 0
  );
  const selectedMatkulData = matkulList.find((m) => m.code === selectedMatkul);

  // Derive nomor pertemuan dari selected value
  const selectedNomor = selectedPertemuan.startsWith("NEW_")
    ? parseInt(selectedPertemuan.replace("NEW_", ""))
    : selectedPertemuanData?.nomorPertemuan || 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1B2E4B]">Generate QR Absensi</h2>
        <p className="text-sm text-slate-500 mt-1">
          Generate QR Code untuk absensi mahasiswa (16 pertemuan per mata kuliah)
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
              <Label htmlFor="matkul">Mata Kuliah *</Label>
              <Select value={selectedMatkul} onValueChange={setSelectedMatkul}>
                <SelectTrigger id="matkul">
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

            {/* Pilih Pertemuan (16 Slot) */}
            <div className="space-y-2">
              <Label htmlFor="pertemuan">Pertemuan *</Label>
              <Select
                value={selectedPertemuan}
                onValueChange={handleSelectPertemuan}
                disabled={!selectedMatkul}
              >
                <SelectTrigger id="pertemuan">
                  <SelectValue placeholder={selectedMatkul ? "Pilih pertemuan 1-16" : "Pilih matkul dulu"} />
                </SelectTrigger>
                <SelectContent>
                  {selectedMatkul ? (
                    Array.from({ length: 16 }, (_, i) => {
                      const nomor = i + 1;
                      const existing = pertemuanMap.get(nomor);

                      return (
                        <SelectItem
                          key={existing?.id || `NEW_${nomor}`}
                          value={existing?.id || `NEW_${nomor}`}
                        >
                          {existing ? (
                            <span>
                              Pertemuan {nomor} — {existing.jamMulai} s/d {existing.jamSelesai}
                              {" "}
                              <span className="text-xs text-green-600 font-medium">
                                (Sudah dibuat)
                              </span>
                            </span>
                          ) : (
                            <span className="text-slate-400">
                              Pertemuan {nomor} — Belum dibuat
                            </span>
                          )}
                        </SelectItem>
                      );
                    })
                  ) : (
                    <SelectItem value="__placeholder__" disabled>
                      Pilih mata kuliah terlebih dahulu
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {selectedMatkul && pertemuanMap.size === 0 && (
                <p className="text-xs text-slate-400">
                  Belum ada pertemuan yang dibuat untuk matkul ini. Pilih nomor pertemuan untuk membuat baru.
                </p>
              )}
            </div>

            {/* Form Buat Pertemuan Baru */}
            {showCreateForm && newPertemuanNum && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
                <div className="flex items-center gap-2 text-amber-800 font-medium">
                  <Plus className="w-4 h-4" />
                  <span>Buat Pertemuan {newPertemuanNum}</span>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tanggal">Tanggal *</Label>
                  <Input
                    id="tanggal"
                    type="date"
                    value={newTanggal}
                    onChange={(e) => setNewTanggal(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="jamMulai">Jam Mulai *</Label>
                    <Input
                      id="jamMulai"
                      type="time"
                      value={newJamMulai}
                      onChange={(e) => setNewJamMulai(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="jamSelesai">Jam Selesai *</Label>
                    <Input
                      id="jamSelesai"
                      type="time"
                      value={newJamSelesai}
                      onChange={(e) => setNewJamSelesai(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowCreateForm(false);
                      setSelectedPertemuan("");
                    }}
                  >
                    Batal
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleCreatePertemuan}
                    disabled={creatingPertemuan}
                    className="bg-[#2563EB] hover:bg-[#1d4ed8]"
                  >
                    {creatingPertemuan ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        Membuat...
                      </>
                    ) : (
                      "Buat Pertemuan"
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Info Pertemuan */}
            {selectedPertemuanData && !showCreateForm && (
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
              <Label htmlFor="durasi">Durasi QR Valid</Label>
              <Select value={durasi} onValueChange={setDurasi}>
                <SelectTrigger id="durasi">
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
              disabled={generating || !selectedPertemuan || selectedPertemuan.startsWith("NEW_")}
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
            {isQrActive && !showCreateForm && (
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

            {countdown === "EXPIRED" && !showCreateForm && (
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
                    Pertemuan {selectedPertemuanData?.nomorPertemuan || selectedNomor} |{" "}
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
                <p className="text-xs mt-1">Pilih mata kuliah dan pertemuan, lalu Generate QR</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
