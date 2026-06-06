"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useDosenAuth } from "@/hooks/useDosenAuth";
import QRCode from "qrcode";
import {
  collection,
  onSnapshot,
  query,
  where,
  doc,
} from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import type { MataKuliah } from "@/src/types";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "react-hot-toast";
import {
  Loader2,
  Clock,
  Maximize2,
  StopCircle,
  Play,
  Users,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Calendar,
} from "lucide-react";

interface PertemuanData {
  id: string;
  courseId: string;
  courseName: string;
  nomorPertemuan: number;
  tanggal: Date;
  jamMulai: string;
  jamSelesai: string;
  qrToken: string;
  qrExpiresAt: Date | null;
  isQrActive: boolean;
  enrolledNpms: string[];
}

interface StudentRow {
  npm: string;
  name: string;
  status: string;
  timestamp: string | null;
  scanMethod: string;
  presensiId: string | null;
}

const HARI_INDO = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function getMeetingStatus(pt: PertemuanData | undefined): {
  label: string;
  variant: "default" | "secondary" | "outline" | "destructive";
  color: string;
} {
  if (!pt) return { label: "Belum Dibuat", variant: "outline", color: "text-slate-400" };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ptDate = new Date(pt.tanggal);
  ptDate.setHours(0, 0, 0, 0);

  if (isSameDay(ptDate, today)) {
    if (pt.isQrActive) {
      return { label: "Sedang Berlangsung", variant: "default", color: "text-green-700 bg-green-100" };
    }
    return { label: "Hari Ini", variant: "secondary", color: "text-amber-700 bg-amber-100" };
  }

  if (ptDate > today) {
    return { label: "Mendatang", variant: "outline", color: "text-slate-600 bg-slate-50" };
  }

  return { label: "Selesai", variant: "outline", color: "text-slate-400 bg-slate-100" };
}

export default function DosenPertemuanPage() {
  const { user } = useDosenAuth();
  const [matkulList, setMatkulList] = useState<(MataKuliah & { code: string })[]>([]);
  const [pertemuanMap, setPertemuanMap] = useState<Map<string, PertemuanData>>(new Map());
  const [selectedMatkul, setSelectedMatkul] = useState("");
  const [selectedPertemuanId, setSelectedPertemuanId] = useState("");
  const [durasi, setDurasi] = useState("1");
  const [qrImage, setQrImage] = useState("");
  const [qrPayload, setQrPayload] = useState("");
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [isQrActive, setIsQrActive] = useState(false);
  const [countdown, setCountdown] = useState("");
  const [refreshCountdown, setRefreshCountdown] = useState("");
  const [generating, setGenerating] = useState(false);
  const [presensiRecords, setPresensiRecords] = useState<Record<string, any>>({});
  const [mahasiswaMap, setMahasiswaMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [confirmAlpha, setConfirmAlpha] = useState<StudentRow | null>(null);

  // Fetch mahasiswa name map
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "mahasiswa"), (snap) => {
      const map: Record<string, string> = {};
      snap.docs.forEach((d) => {
        map[d.id] = d.data().name || d.id;
      });
      setMahasiswaMap(map);
    });
    return () => unsub();
  }, []);

  // Fetch matkul yang diampu dosen
  useEffect(() => {
    if (!user?.nidn) return;

    const q = query(collection(db, "courses"), where("lecturerId", "==", user.nidn));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs
          .map((d) => ({ code: d.id, ...d.data() })) as (MataKuliah & { code: string })[];
        setMatkulList(data.filter((m) => m.isActive !== false));
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching courses:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user?.nidn]);

  // Fetch pertemuan saat matkul dipilih
  useEffect(() => {
    if (!selectedMatkul) {
      setPertemuanMap(new Map());
      setSelectedPertemuanId("");
      return;
    }

    const q = query(collection(db, "pertemuan"), where("courseId", "==", selectedMatkul));

    const unsub = onSnapshot(q, (snap) => {
      const map = new Map<string, PertemuanData>();
      let autoSelectId = "";
      const today = new Date();

      snap.docs.forEach((d) => {
        const data = d.data() as any;
        const pt: PertemuanData = {
          id: d.id,
          ...data,
          tanggal: data.tanggal?.toDate ? data.tanggal.toDate() : new Date(data.tanggal),
          qrExpiresAt: data.qrExpiresAt?.toDate ? data.qrExpiresAt.toDate() : data.qrExpiresAt ? new Date(data.qrExpiresAt) : null,
        };
        map.set(d.id, pt);

        // Auto-select pertemuan hari ini
        if (!autoSelectId && isSameDay(pt.tanggal, today)) {
          autoSelectId = d.id;
        }
      });

      setPertemuanMap(map);

      // Auto-select kalau ada pertemuan hari ini dan belum ada yang dipilih
      if (autoSelectId && !selectedPertemuanId) {
        setSelectedPertemuanId(autoSelectId);
      }
    });

    return () => unsub();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMatkul]);

  // Real-time listener untuk QR status & presensi
  useEffect(() => {
    if (!selectedPertemuanId) {
      setIsQrActive(false);
      setPresensiRecords({});
      setQrImage("");
      return;
    }

    const unsubPertemuan = onSnapshot(doc(db, "pertemuan", selectedPertemuanId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as any;
        setIsQrActive(data.isQrActive);
        if (data.qrExpiresAt) {
          const exp = data.qrExpiresAt.toDate ? data.qrExpiresAt.toDate() : new Date(data.qrExpiresAt);
          setExpiresAt(exp);
        }
      }
    });

    const unsubPresensi = onSnapshot(
      query(collection(db, "presensi"), where("pertemuanId", "==", selectedPertemuanId)),
      (snap) => {
        const records: Record<string, any> = {};
        snap.docs.forEach((d) => {
          const data = d.data();
          records[data.npm] = { id: d.id, ...data };
        });
        setPresensiRecords(records);
      }
    );

    return () => {
      unsubPertemuan();
      unsubPresensi();
    };
  }, [selectedPertemuanId]);

  // Countdown timer untuk QR expiration
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

  // Auto-refresh QR setiap 1 menit
  useEffect(() => {
    if (!isQrActive || !selectedPertemuanId) return;

    const refreshInterval = 60000; // 1 menit
    let remaining = refreshInterval;

    const refreshTimer = setInterval(() => {
      remaining -= 1000;
      if (remaining <= 0) remaining = refreshInterval;
      const sec = Math.ceil(remaining / 1000);
      setRefreshCountdown(`Refresh dalam ${sec}d`);
    }, 1000);

    const autoRegen = setInterval(() => {
      handleGenerate(true);
    }, refreshInterval);

    return () => {
      clearInterval(autoRegen);
      clearInterval(refreshTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isQrActive, selectedPertemuanId, durasi]);

  const selectedPertemuan = useMemo(() => {
    return pertemuanMap.get(selectedPertemuanId);
  }, [pertemuanMap, selectedPertemuanId]);

  const studentRows = useMemo<StudentRow[]>(() => {
    if (!selectedPertemuan) return [];

    const rows: StudentRow[] = [];
    const enrolled = selectedPertemuan.enrolledNpms || [];

    // Sort by NPM
    const sortedNpms = [...enrolled].sort();

    sortedNpms.forEach((npm) => {
      const presensi = presensiRecords[npm];
      if (presensi) {
        rows.push({
          npm,
          name: presensi.mahasiswaName || mahasiswaMap[npm] || npm,
          status: presensi.status || "HADIR",
          timestamp: presensi.timestamp?.toDate?.()
            ? presensi.timestamp.toDate().toLocaleString("id-ID")
            : presensi.timestamp
            ? new Date(presensi.timestamp).toLocaleString("id-ID")
            : null,
          scanMethod: presensi.scanMethod || "QR_SCAN",
          presensiId: presensi.id || null,
        });
      } else {
        rows.push({
          npm,
          name: mahasiswaMap[npm] || npm,
          status: "ALPHA",
          timestamp: null,
          scanMethod: "-",
          presensiId: null,
        });
      }
    });

    return rows;
  }, [selectedPertemuan, presensiRecords, mahasiswaMap]);

  const stats = useMemo(() => {
    const total = studentRows.length;
    const hadir = studentRows.filter((r) => r.status === "HADIR").length;
    const izin = studentRows.filter((r) => r.status === "IZIN").length;
    const sakit = studentRows.filter((r) => r.status === "SAKIT").length;
    const alpha = studentRows.filter((r) => r.status === "ALPHA").length;
    return { total, hadir, izin, sakit, alpha };
  }, [studentRows]);

  const handleGenerate = useCallback(
    async (isAuto = false) => {
      if (!selectedPertemuanId) {
        if (!isAuto) toast.error("Pilih pertemuan terlebih dahulu");
        return;
      }

      if (!isAuto) setGenerating(true);
      try {
        const res = await fetch(`/api/pertemuan/${selectedPertemuanId}/generate-qr`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ durasiMenit: parseInt(durasi) }),
        });

        if (res.ok) {
          const data = await res.json();
          setQrPayload(data.qrPayload);

          const qrDataUrl = await QRCode.toDataURL(data.qrPayload, {
            width: 400,
            margin: 2,
            color: { dark: "#1B2E4B", light: "#FFFFFF" },
          });
          setQrImage(qrDataUrl);
          setExpiresAt(new Date(data.qrExpiresAt));
          setIsQrActive(true);
          if (!isAuto) toast.success("QR Code berhasil digenerate");
        } else {
          throw new Error("Gagal");
        }
      } catch {
        if (!isAuto) toast.error("Gagal generate QR");
      } finally {
        if (!isAuto) setGenerating(false);
      }
    },
    [selectedPertemuanId, durasi]
  );

  const handleDeactivate = async () => {
    if (!selectedPertemuanId) return;
    try {
      const res = await fetch(`/api/pertemuan/${selectedPertemuanId}/deactivate-qr`, {
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

  const openFullscreen = () => {
    if (!selectedPertemuanId) return;
    const url = `/portal-dosen/pertemuan/qr-fullscreen?pertemuanId=${selectedPertemuanId}`;
    window.open(url, "_blank", "width=900,height=900");
  };

  const handleStatusChange = async (row: StudentRow, newStatus: string) => {
    if (!selectedPertemuanId || !selectedPertemuan) return;

    // ALPHA → HADIR/IZIN/SAKIT: create presensi
    if (row.status === "ALPHA" && newStatus !== "ALPHA") {
      try {
        const res = await fetch("/api/presensi", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            npm: row.npm,
            courseId: selectedPertemuan.courseId,
            pertemuanId: selectedPertemuanId,
            status: newStatus,
            mahasiswaName: row.name,
          }),
        });
        if (res.ok) {
          toast.success(`${row.name} diubah menjadi ${newStatus}`);
        } else {
          const data = await res.json();
          throw new Error(data.error || "Gagal");
        }
      } catch (err: any) {
        toast.error(err.message || "Gagal mengubah status");
      }
      return;
    }

    // HADIR/IZIN/SAKIT → ALPHA: delete presensi (with confirmation)
    if (row.status !== "ALPHA" && newStatus === "ALPHA") {
      setConfirmAlpha(row);
      return;
    }

    // HADIR/IZIN/SAKIT → HADIR/IZIN/SAKIT (different): update presensi
    if (row.status !== "ALPHA" && newStatus !== "ALPHA" && row.presensiId) {
      try {
        const res = await fetch(`/api/presensi/${row.presensiId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
        if (res.ok) {
          toast.success(`${row.name} diubah menjadi ${newStatus}`);
        } else {
          const data = await res.json();
          throw new Error(data.error || "Gagal");
        }
      } catch (err: any) {
        toast.error(err.message || "Gagal mengubah status");
      }
    }
  };

  const confirmDeletePresensi = async () => {
    if (!confirmAlpha || !confirmAlpha.presensiId) return;
    try {
      const res = await fetch(`/api/presensi/${confirmAlpha.presensiId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success(`${confirmAlpha.name} diubah menjadi ALPHA`);
      } else {
        const data = await res.json();
        throw new Error(data.error || "Gagal");
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal mengubah status");
    } finally {
      setConfirmAlpha(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-[#1B2E4B]">Kelola Pertemuan</h2>
        <p className="text-sm text-slate-500 mt-1">
          Generate QR presensi dan kelola kehadiran mahasiswa
        </p>
      </div>

      {/* Pilih Mata Kuliah */}
      <Card>
        <CardContent className="p-4">
          <Select value={selectedMatkul} onValueChange={setSelectedMatkul}>
            <SelectTrigger className="w-full max-w-md">
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
        </CardContent>
      </Card>

      {selectedMatkul && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* KOLOM KIRI: List 16 Pertemuan */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Daftar Pertemuan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {Array.from({ length: 16 }, (_, i) => {
                  const nomor = i + 1;
                  // Find pertemuan by nomorPertemuan
                  const pt = Array.from(pertemuanMap.values()).find(
                    (p) => p.nomorPertemuan === nomor
                  );
                  const isSelected = pt?.id === selectedPertemuanId;
                  const status = getMeetingStatus(pt);

                  return (
                    <button
                      key={nomor}
                      onClick={() => {
                        if (pt) {
                          setSelectedPertemuanId(pt.id);
                          setQrImage("");
                          setIsQrActive(false);
                        }
                      }}
                      disabled={!pt}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        isSelected
                          ? "border-[#2563EB] bg-blue-50 ring-1 ring-[#2563EB]"
                          : pt
                          ? "border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                          : "border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">
                            Pertemuan {nomor}
                          </p>
                          {pt ? (
                            <p className="text-xs text-slate-500">
                              {pt.tanggal
                                ? new Date(pt.tanggal).toLocaleDateString("id-ID")
                                : "-"}{" "}
                              • {pt.jamMulai} - {pt.jamSelesai}
                            </p>
                          ) : (
                            <p className="text-xs text-slate-400">Belum dibuat</p>
                          )}
                        </div>
                        {pt && (
                          <Badge
                            variant={status.variant}
                            className={`text-xs shrink-0 ml-2 ${status.color}`}
                          >
                            {status.label}
                          </Badge>
                        )}
                      </div>
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* KOLOM KANAN: QR + Counter + Tabel */}
          <div className="lg:col-span-2 space-y-4">
            {/* QR Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {selectedPertemuan
                    ? `${selectedPertemuan.courseName} — Pertemuan ${selectedPertemuan.nomorPertemuan}`
                    : "Generate QR Presensi"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedPertemuan ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* QR Image + Controls */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-center bg-slate-50 rounded-lg p-6 min-h-[280px]">
                        {qrImage && isQrActive ? (
                          <div className="text-center space-y-3">
                            <img
                              src={qrImage}
                              alt="QR Code"
                              className="w-48 h-48 mx-auto border-2 border-dashed border-slate-300 rounded-lg p-2"
                            />
                            <Badge className="bg-green-100 text-green-700 animate-pulse">
                              QR AKTIF — {countdown || "--:--"}
                            </Badge>
                            <p className="text-xs text-slate-400">
                              {refreshCountdown || "Refresh dalam 60d"}
                            </p>
                          </div>
                        ) : (
                          <div className="text-center text-slate-400">
                            <p>QR Code akan ditampilkan di sini</p>
                            <p className="text-xs mt-1">
                              Klik "Mulai Sesi" untuk generate QR
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {!isQrActive ? (
                          <>
                            <Select value={durasi} onValueChange={setDurasi}>
                              <SelectTrigger className="w-[120px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {[1, 2, 5, 10, 15].map((d) => (
                                  <SelectItem key={d} value={d.toString()}>
                                    {d} menit
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              onClick={() => handleGenerate(false)}
                              disabled={generating}
                              className="flex-1 bg-[#2563EB] hover:bg-[#1d4ed8]"
                            >
                              {generating ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <Play className="w-4 h-4 mr-2" />
                              )}
                              Mulai Sesi
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              onClick={openFullscreen}
                              className="flex-1"
                            >
                              <Maximize2 className="w-4 h-4 mr-2" />
                              Fullscreen
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={handleDeactivate}
                              className="flex-1"
                            >
                              <StopCircle className="w-4 h-4 mr-2" />
                              Akhiri Sesi
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Counter Stats */}
                    <div className="grid grid-cols-2 gap-3">
                      <Card className="bg-slate-50 border-0">
                        <CardContent className="p-3">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-slate-500" />
                            <span className="text-xs text-slate-500">Total</span>
                          </div>
                          <p className="text-2xl font-bold">{stats.total}</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-green-50 border-0">
                        <CardContent className="p-3">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-xs text-green-600">Hadir</span>
                          </div>
                          <p className="text-2xl font-bold text-green-700">{stats.hadir}</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-blue-50 border-0">
                        <CardContent className="p-3">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-blue-600" />
                            <span className="text-xs text-blue-600">Izin</span>
                          </div>
                          <p className="text-2xl font-bold text-blue-700">{stats.izin}</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-yellow-50 border-0">
                        <CardContent className="p-3">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-yellow-600" />
                            <span className="text-xs text-yellow-600">Sakit</span>
                          </div>
                          <p className="text-2xl font-bold text-yellow-700">{stats.sakit}</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-red-50 border-0 col-span-2">
                        <CardContent className="p-3">
                          <div className="flex items-center gap-2">
                            <XCircle className="w-4 h-4 text-red-600" />
                            <span className="text-xs text-red-600">Alpha</span>
                          </div>
                          <p className="text-2xl font-bold text-red-700">{stats.alpha}</p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 text-center py-8">
                    Pilih mata kuliah dan pertemuan untuk generate QR
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Tabel Mahasiswa */}
            {selectedPertemuan && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Daftar Mahasiswa — Pertemuan {selectedPertemuan.nomorPertemuan}
                  </CardTitle>
                  <p className="text-xs text-slate-500">
                    Mahasiswa yang tidak scan QR otomatis tercatat ALPHA. Dosen dapat mengubah status.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border overflow-hidden">
                    <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                      <Table>
                        <TableHeader className="sticky top-0 bg-white z-10">
                          <TableRow>
                            <TableHead className="w-12">No</TableHead>
                            <TableHead>NPM</TableHead>
                            <TableHead>Nama</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Waktu</TableHead>
                            <TableHead>Metode</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {studentRows.length > 0 ? (
                            studentRows.map((row, idx) => (
                              <TableRow key={row.npm}>
                                <TableCell className="text-slate-500">{idx + 1}</TableCell>
                                <TableCell className="font-mono text-sm">{row.npm}</TableCell>
                                <TableCell>{row.name}</TableCell>
                                <TableCell>
                                  <Select
                                    value={row.status}
                                    onValueChange={(val) => handleStatusChange(row, val)}
                                  >
                                    <SelectTrigger className="w-[110px] h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="HADIR">
                                        <span className="flex items-center gap-2">
                                          <span className="w-2 h-2 rounded-full bg-green-500" />
                                          HADIR
                                        </span>
                                      </SelectItem>
                                      <SelectItem value="IZIN">
                                        <span className="flex items-center gap-2">
                                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                                          IZIN
                                        </span>
                                      </SelectItem>
                                      <SelectItem value="SAKIT">
                                        <span className="flex items-center gap-2">
                                          <span className="w-2 h-2 rounded-full bg-yellow-500" />
                                          SAKIT
                                        </span>
                                      </SelectItem>
                                      <SelectItem value="ALPHA">
                                        <span className="flex items-center gap-2">
                                          <span className="w-2 h-2 rounded-full bg-red-500" />
                                          ALPHA
                                        </span>
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell className="text-sm text-slate-500">
                                  {row.timestamp || "-"}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-xs">
                                    {row.scanMethod === "QR_SCAN"
                                      ? "QR Scan"
                                      : row.scanMethod === "MANUAL"
                                      ? "Manual"
                                      : "-"}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={6} className="h-32 text-center text-slate-400">
                                Tidak ada mahasiswa terdaftar di pertemuan ini
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Dialog: Change to ALPHA */}
      <Dialog open={!!confirmAlpha} onOpenChange={() => setConfirmAlpha(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Perubahan Status</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin mengubah status{" "}
              <strong>{confirmAlpha?.name}</strong> menjadi{" "}
              <strong>ALPHA</strong>? Data presensi akan dihapus.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAlpha(null)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={confirmDeletePresensi}>
              Ya, Ubah ke ALPHA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
