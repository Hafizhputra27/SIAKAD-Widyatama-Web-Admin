"use client";

import { useState, useEffect, useMemo } from "react";
import { useDosenAuth } from "@/hooks/useDosenAuth";
import {
  collection,
  onSnapshot,
  query,
  where,
  doc,
  getDoc,
  getDocs,
} from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import type { MataKuliah } from "@/src/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "react-hot-toast";
import {
  Loader2,
  Save,
  Upload,
  Download,
  FileSpreadsheet,
  GraduationCap,
  Calculator,
} from "lucide-react";

interface NilaiRow {
  npm: string;
  name: string;
  nilaiAngka: number | "";
  nilaiHuruf: string;
  mutu: number;
  status: string;
}

function angkaToHuruf(n: number): string {
  if (n >= 85) return "A";
  if (n >= 70) return "B";
  if (n >= 55) return "C";
  if (n >= 40) return "D";
  return "E";
}

function hurufToMutu(h: string): number {
  const map: Record<string, number> = { A: 4.0, B: 3.0, C: 2.0, D: 1.0, E: 0.0 };
  return map[h] ?? 0;
}

function statusLulus(h: string): string {
  return h !== "E" ? "LULUS" : "TIDAK_LULUS";
}

export default function DosenNilaiPage() {
  const { user } = useDosenAuth();
  const [matkulList, setMatkulList] = useState<(MataKuliah & { code: string })[]>([]);
  const [selectedMatkul, setSelectedMatkul] = useState("");
  const [nilaiData, setNilaiData] = useState<NilaiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchNpm, setSearchNpm] = useState("");
  const [importing, setImporting] = useState(false);

  // Fetch matkul yang diampu dosen
  useEffect(() => {
    if (!user?.nidn) return;

    const q = query(
      collection(db, "courses"),
      where("lecturerId", "==", user.nidn)
    );

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

  // Fetch mahasiswa enrolled + nilai existing saat matkul dipilih
  useEffect(() => {
    if (!selectedMatkul) {
      setNilaiData([]);
      return;
    }

    setLoading(true);

    async function fetchData() {
      try {
        // 1. Ambil enrolledNpms dari pertemuan pertama (query by courseId + nomorPertemuan)
        let enrolledNpms: string[] = [];

        const ptQuery = query(
          collection(db, "pertemuan"),
          where("courseId", "==", selectedMatkul),
          where("nomorPertemuan", "==", 1)
        );
        const ptSnap = await getDocs(ptQuery);
        if (!ptSnap.empty) {
          enrolledNpms = ptSnap.docs[0].data().enrolledNpms || [];
        }

        // Fallback: fetch dari API kalau query Firestore kosong
        if (enrolledNpms.length === 0) {
          try {
            const res = await fetch(`/api/matkul/${selectedMatkul}`);
            const apiData = await res.json();
            enrolledNpms = apiData.data?.enrolledStudents || apiData.data?.enrolledNpms || [];
          } catch {
            // ignore
          }
        }

        // 2. Fetch nama mahasiswa dan nilai existing
        const rows: NilaiRow[] = [];

        if (enrolledNpms.length > 0) {
          // Fetch nilai existing via API
          const nilaiRes = await fetch(`/api/nilai?courseId=${selectedMatkul}`);
          const nilaiJson = await nilaiRes.json();
          const existingNilai: Record<string, any> = {};
          (nilaiJson.data || []).forEach((n: any) => {
            existingNilai[n.npm] = n;
          });

          // Fetch nama mahasiswa
          for (const npm of enrolledNpms) {
            const mhsDoc = await getDoc(doc(db, "mahasiswa", npm));
            const mhsName = mhsDoc.exists() ? mhsDoc.data()?.name : npm;

            const existing = existingNilai[npm];
            if (existing && existing.nilaiAngka) {
              rows.push({
                npm,
                name: existing.mahasiswaName || mhsName || npm,
                nilaiAngka: existing.nilaiAngka,
                nilaiHuruf: existing.nilaiHuruf || "",
                mutu: existing.mutu || 0,
                status: existing.status || "TIDAK_LULUS",
              });
            } else {
              rows.push({
                npm,
                name: mhsName || npm,
                nilaiAngka: "",
                nilaiHuruf: "",
                mutu: 0,
                status: "BELUM_DINILAI",
              });
            }
          }
        }

        // Sort by NPM
        rows.sort((a, b) => a.npm.localeCompare(b.npm));
        setNilaiData(rows);
      } catch (err) {
        console.error("Error fetching nilai data:", err);
        setNilaiData([]);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [selectedMatkul]);

  const handleNilaiChange = (npm: string, value: string) => {
    const angka = value === "" ? "" : parseFloat(value);
    if (value !== "" && (isNaN(angka as number) || (angka as number) < 0 || (angka as number) > 100)) return;

    const huruf = value === "" ? "" : angkaToHuruf(angka as number);
    const mutu = huruf ? hurufToMutu(huruf) : 0;
    const status = huruf ? statusLulus(huruf) : "BELUM_DINILAI";

    setNilaiData((prev) =>
      prev.map((row) =>
        row.npm === npm
          ? { ...row, nilaiAngka: angka, nilaiHuruf: huruf, mutu, status }
          : row
      )
    );
  };

  const handleSaveAll = async () => {
    if (!selectedMatkul) return;
    setSaving(true);

    const matkulData = matkulList.find((m) => m.code === selectedMatkul);
    const nilaiList = nilaiData
      .filter((row) => row.nilaiAngka !== "")
      .map((row) => ({
        npm: row.npm,
        nilaiAngka: row.nilaiAngka as number,
      }));

    if (nilaiList.length === 0) {
      toast.error("Tidak ada nilai yang diinput");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/nilai/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: selectedMatkul,
          semester: matkulData?.semester || 1,
          nilaiList,
        }),
      });

      if (res.ok) {
        toast.success(`${nilaiList.length} nilai berhasil disimpan`);
      } else {
        const data = await res.json();
        throw new Error(data.error || "Gagal");
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan nilai");
    } finally {
      setSaving(false);
    }
  };

  const exportTemplate = () => {
    const headers = ["npm", "nama", "nilaiAngka"];
    const rows = nilaiData.map((n) => [n.npm, n.name, ""].join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `template-nilai-${selectedMatkul}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Template berhasil diunduh");
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/nilai/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Import selesai: ${data.success} berhasil, ${data.failed} gagal`);
        // Refresh data
        setSelectedMatkul("");
        setTimeout(() => setSelectedMatkul(selectedMatkul), 100);
      } else {
        throw new Error(data.error || "Gagal import");
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal mengimport nilai");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  const filteredNilai = nilaiData.filter(
    (n) =>
      n.npm.includes(searchNpm) ||
      n.name.toLowerCase().includes(searchNpm.toLowerCase())
  );

  const stats = useMemo(() => {
    const total = nilaiData.length;
    const sudah = nilaiData.filter((n) => n.nilaiAngka !== "").length;
    const belum = total - sudah;
    const avg =
      sudah > 0
        ? nilaiData
            .filter((n) => n.nilaiAngka !== "")
            .reduce((sum, n) => sum + (n.nilaiAngka as number), 0) / sudah
        : 0;
    return { total, sudah, belum, avg: avg.toFixed(1) };
  }, [nilaiData]);

  if (loading && matkulList.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1B2E4B]">Input Nilai Mahasiswa</h2>
        <p className="text-sm text-slate-500 mt-1">
          Input dan kelola nilai untuk mata kuliah yang Anda ampu
        </p>
      </div>

      {/* Pilih Mata Kuliah */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={selectedMatkul} onValueChange={setSelectedMatkul}>
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Pilih mata kuliah" />
              </SelectTrigger>
              <SelectContent>
                {matkulList.map((m) => (
                  <SelectItem key={m.code} value={m.code}>
                    {m.code} - {m.name} (Semester {m.semester})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedMatkul && (
              <>
                <Button variant="outline" onClick={exportTemplate}>
                  <Download className="w-4 h-4 mr-2" />
                  Template CSV
                </Button>
                <Button variant="outline" asChild>
                  <label className="cursor-pointer">
                    <Upload className="w-4 h-4 mr-2" />
                    {importing ? "Mengimport..." : "Import CSV"}
                    <input
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={handleImportCSV}
                      disabled={importing}
                    />
                  </label>
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats & Actions */}
      {selectedMatkul && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="bg-slate-50 border-0">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-slate-500" />
                  <span className="text-xs text-slate-500">Total Mahasiswa</span>
                </div>
                <p className="text-2xl font-bold">{stats.total}</p>
              </CardContent>
            </Card>
            <Card className="bg-green-50 border-0">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-green-600" />
                  <span className="text-xs text-green-600">Sudah Dinilai</span>
                </div>
                <p className="text-2xl font-bold text-green-700">{stats.sudah}</p>
              </CardContent>
            </Card>
            <Card className="bg-amber-50 border-0">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-amber-600" />
                  <span className="text-xs text-amber-600">Belum Dinilai</span>
                </div>
                <p className="text-2xl font-bold text-amber-700">{stats.belum}</p>
              </CardContent>
            </Card>
            <Card className="bg-blue-50 border-0">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-blue-600" />
                  <span className="text-xs text-blue-600">Rata-rata</span>
                </div>
                <p className="text-2xl font-bold text-blue-700">{stats.avg}</p>
              </CardContent>
            </Card>
          </div>

          {/* Search + Save */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Cari NPM atau nama..."
              value={searchNpm}
              onChange={(e) => setSearchNpm(e.target.value)}
              className="max-w-sm"
            />
            <Button
              onClick={handleSaveAll}
              disabled={saving}
              className="bg-[#2563EB] hover:bg-[#1d4ed8] ml-auto"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Simpan Semua
            </Button>
          </div>

          {/* Tabel Nilai */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Daftar Nilai Mahasiswa</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" />
                </div>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-white z-10">
                        <TableRow>
                          <TableHead className="w-12">No</TableHead>
                          <TableHead>NPM</TableHead>
                          <TableHead>Nama</TableHead>
                          <TableHead className="w-28">Nilai Angka</TableHead>
                          <TableHead className="w-20">Huruf</TableHead>
                          <TableHead className="w-16">Mutu</TableHead>
                          <TableHead className="w-24">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredNilai.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={7}
                              className="h-32 text-center text-slate-400"
                            >
                              Tidak ada data mahasiswa
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredNilai.map((row, idx) => (
                            <TableRow key={row.npm}>
                              <TableCell className="text-slate-500">{idx + 1}</TableCell>
                              <TableCell className="font-mono text-sm">{row.npm}</TableCell>
                              <TableCell>{row.name}</TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={row.nilaiAngka}
                                  onChange={(e) =>
                                    handleNilaiChange(row.npm, e.target.value)
                                  }
                                  className="w-20 h-8 text-sm"
                                />
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={
                                    row.nilaiHuruf === "A"
                                      ? "bg-green-100 text-green-700"
                                      : row.nilaiHuruf === "B"
                                      ? "bg-blue-100 text-blue-700"
                                      : row.nilaiHuruf === "C"
                                      ? "bg-yellow-100 text-yellow-700"
                                      : row.nilaiHuruf === "D"
                                      ? "bg-orange-100 text-orange-700"
                                      : row.nilaiHuruf === "E"
                                      ? "bg-red-100 text-red-700"
                                      : "bg-slate-100 text-slate-500"
                                  }
                                >
                                  {row.nilaiHuruf || "-"}
                                </Badge>
                              </TableCell>
                              <TableCell>{row.mutu || "-"}</TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={
                                    row.status === "LULUS"
                                      ? "text-green-600 border-green-300"
                                      : row.status === "BELUM_DINILAI"
                                      ? "text-slate-400 border-slate-300"
                                      : "text-red-600 border-red-300"
                                  }
                                >
                                  {row.status === "BELUM_DINILAI"
                                    ? "Belum"
                                    : row.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
