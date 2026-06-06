"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "react-hot-toast";
import { collection, onSnapshot, doc, getDoc } from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import type { MataKuliah } from "@/src/types";
import { Loader2, Search, GraduationCap, BookOpen, BarChart3, Eye } from "lucide-react";

interface RekapRow {
  code: string;
  name: string;
  sks: number;
  semester: number;
  lecturer: string;
  totalMahasiswa: number;
  avgNilai: number;
  avgHuruf: string;
  lulusCount: number;
  tidakLulusCount: number;
  belumDinilai: number;
}

function angkaToHuruf(n: number): string {
  if (n >= 85) return "A";
  if (n >= 70) return "B";
  if (n >= 55) return "C";
  if (n >= 40) return "D";
  return "E";
}

export default function NilaiPage() {
  const [matkulList, setMatkulList] = useState<(MataKuliah & { code: string })[]>([]);
  const [nilaiData, setNilaiData] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [filterSemester, setFilterSemester] = useState("all");
  const [searchMatkul, setSearchMatkul] = useState("");

  // Tab transkrip
  const [transkripNpm, setTranskripNpm] = useState("");
  const [transkripData, setTranskripData] = useState<Record<string, unknown> | null>(null);
  const [transkripNilai, setTranskripNilai] = useState<Record<string, unknown>[]>([]);
  const [loadingTranskrip, setLoadingTranskrip] = useState(false);

  // Detail modal
  const [selectedDetailMatkul, setSelectedDetailMatkul] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(collection(db, "courses"), (snap) => {
      const data = snap.docs
        .map((d) => ({ code: d.id, ...d.data() } as MataKuliah & { code: string }))
        .filter((m) => m.isActive !== false);
      setMatkulList(data);
    });
    return () => unsub();
  }, []);

  // Fetch nilai for all matkul
  useEffect(() => {
    async function fetchAllNilai() {
      const result: Record<string, any[]> = {};
      try {
        const res = await fetch("/api/nilai");
        const apiData = await res.json();
        // Group by courseId
        (apiData.data || []).forEach((n: any) => {
          const cid = n.mataKuliahId as string;
          if (!result[cid]) result[cid] = [];
          result[cid].push(n);
        });
      } catch (err) {
        console.error("Error fetching nilai:", err);
      }
      setNilaiData(result);
      setLoading(false);
    }

    fetchAllNilai();
  }, []);

  const rekapData = useMemo<RekapRow[]>(() => {
    return matkulList
      .map((m) => {
        const nilaiList = nilaiData[m.code] || [];
        const total = nilaiList.length;
        const lulus = nilaiList.filter((n) => n.status === "LULUS").length;
        const tidakLulus = nilaiList.filter((n) => n.status === "TIDAK_LULUS").length;
        const belum = total - lulus - tidakLulus;

        const avg =
          total > 0
            ? nilaiList.reduce((sum: number, n: any) => sum + (n.nilaiAngka || 0), 0) / total
            : 0;

        return {
          code: m.code,
          name: m.name,
          sks: m.sks,
          semester: m.semester,
          lecturer: m.lecturer || "-",
          totalMahasiswa: total,
          avgNilai: parseFloat(avg.toFixed(1)),
          avgHuruf: total > 0 ? angkaToHuruf(avg) : "-",
          lulusCount: lulus,
          tidakLulusCount: tidakLulus,
          belumDinilai: belum,
        };
      })
      .filter((m) => {
        if (filterSemester !== "all" && m.semester !== parseInt(filterSemester)) return false;
        if (searchMatkul) {
          const q = searchMatkul.toLowerCase();
          return m.code.toLowerCase().includes(q) || m.name.toLowerCase().includes(q);
        }
        return true;
      });
  }, [matkulList, nilaiData, filterSemester, searchMatkul]);

  const handleSearchTranskrip = async () => {
    if (!transkripNpm) return;
    setLoadingTranskrip(true);
    try {
      const mDoc = await getDoc(doc(db, "mahasiswa", transkripNpm));
      if (mDoc.exists()) {
        setTranskripData(mDoc.data());
      }

      const res = await fetch(`/api/nilai?npm=${transkripNpm}`);
      const apiData = await res.json();
      setTranskripNilai(apiData.data || []);
    } catch {
      toast.error("Gagal mengambil transkrip");
    } finally {
      setLoadingTranskrip(false);
    }
  };

  const transkripBySemester: Record<number, typeof transkripNilai> = {};
  transkripNilai.forEach((n) => {
    const sem = (n.semester as number) || 0;
    if (!transkripBySemester[sem]) transkripBySemester[sem] = [];
    transkripBySemester[sem].push(n);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1B2E4B]">Manajemen Nilai</h2>
          <p className="text-sm text-slate-500 mt-1">
            Lihat rekap nilai dan transkrip mahasiswa
          </p>
        </div>
      </div>

      <Tabs defaultValue="rekap" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="rekap">
            <BarChart3 className="w-4 h-4 mr-2" />
            Rekap Nilai
          </TabsTrigger>
          <TabsTrigger value="transkrip">
            <GraduationCap className="w-4 h-4 mr-2" />
            Transkrip Mahasiswa
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Rekap Nilai (Read-Only) */}
        <TabsContent value="rekap" className="mt-4 space-y-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <Select value={filterSemester} onValueChange={setFilterSemester}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter Semester" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Semester</SelectItem>
                {Array.from({ length: 8 }, (_, i) => (
                  <SelectItem key={i + 1} value={(i + 1).toString()}>
                    Semester {i + 1}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Cari kode atau nama matkul..."
                value={searchMatkul}
                onChange={(e) => setSearchMatkul(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="rounded-lg border bg-white">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Kode</th>
                      <th className="px-4 py-3 text-left font-medium">Nama</th>
                      <th className="px-4 py-3 text-left font-medium">Semester</th>
                      <th className="px-4 py-3 text-left font-medium">Dosen</th>
                      <th className="px-4 py-3 text-left font-medium">Peserta</th>
                      <th className="px-4 py-3 text-left font-medium">Rata-rata</th>
                      <th className="px-4 py-3 text-left font-medium">Lulus</th>
                      <th className="px-4 py-3 text-left font-medium">Tidak Lulus</th>
                      <th className="px-4 py-3 text-left font-medium">Belum</th>
                      <th className="px-4 py-3 text-left font-medium"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rekapData.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                          Tidak ada data
                        </td>
                      </tr>
                    ) : (
                      rekapData.map((row) => (
                        <tr key={row.code} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-mono font-medium">{row.code}</td>
                          <td className="px-4 py-3">{row.name}</td>
                          <td className="px-4 py-3">
                            <Badge variant="outline">Semester {row.semester}</Badge>
                          </td>
                          <td className="px-4 py-3">{row.lecturer}</td>
                          <td className="px-4 py-3">{row.totalMahasiswa}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-bold">{row.avgNilai || "-"}</span>
                              {row.avgHuruf !== "-" && (
                                <Badge
                                  className={
                                    row.avgHuruf === "A"
                                      ? "bg-green-100 text-green-700"
                                      : row.avgHuruf === "E"
                                      ? "bg-red-100 text-red-700"
                                      : "bg-blue-100 text-blue-700"
                                  }
                                >
                                  {row.avgHuruf}
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-green-600 font-medium">{row.lulusCount}</td>
                          <td className="px-4 py-3 text-red-600 font-medium">{row.tidakLulusCount}</td>
                          <td className="px-4 py-3 text-amber-600 font-medium">{row.belumDinilai}</td>
                          <td className="px-4 py-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedDetailMatkul(row.code)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Detail
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Tab 2: Transkrip */}
        <TabsContent value="transkrip" className="mt-4 space-y-4">
          <div className="flex gap-3 max-w-lg">
            <Input
              placeholder="Masukkan NPM mahasiswa..."
              value={transkripNpm}
              onChange={(e) => setTranskripNpm(e.target.value)}
            />
            <Button onClick={handleSearchTranskrip} disabled={loadingTranskrip}>
              {loadingTranskrip ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4 mr-2" />
              )}
              Cari
            </Button>
          </div>

          {transkripData && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <GraduationCap className="w-8 h-8 text-[#2563EB]" />
                      <div>
                        <p className="text-sm text-slate-500">IPK Kumulatif</p>
                        <p className="text-2xl font-bold">
                          {(transkripData.ipkKumulatif as number)?.toFixed(2) || "0.00"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <BookOpen className="w-8 h-8 text-green-500" />
                      <div>
                        <p className="text-sm text-slate-500">Total SKS Lulus</p>
                        <p className="text-2xl font-bold">
                          {(transkripData.totalSksLulus as number) || 0}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <BookOpen className="w-8 h-8 text-amber-500" />
                      <div>
                        <p className="text-sm text-slate-500">SKS Tempuh</p>
                        <p className="text-2xl font-bold">
                          {(transkripData.totalSksTarget as number) || 144}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Nilai per semester */}
              {Object.entries(transkripBySemester)
                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                .map(([sem, nilaiList]) => (
                  <Card key={sem}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Semester {sem}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 border-b">
                            <tr>
                              <th className="px-3 py-2 text-left font-medium">Kode</th>
                              <th className="px-3 py-2 text-left font-medium">Mata Kuliah</th>
                              <th className="px-3 py-2 text-left font-medium">SKS</th>
                              <th className="px-3 py-2 text-left font-medium">Nilai</th>
                              <th className="px-3 py-2 text-left font-medium">Huruf</th>
                              <th className="px-3 py-2 text-left font-medium">Mutu</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {nilaiList.map((n, i) => (
                              <tr key={i}>
                                <td className="px-3 py-2 font-mono">{n.mataKuliahId as string}</td>
                                <td className="px-3 py-2">{n.mataKuliahName as string}</td>
                                <td className="px-3 py-2">{n.sks as number}</td>
                                <td className="px-3 py-2">{n.nilaiAngka as number}</td>
                                <td className="px-3 py-2">
                                  <Badge
                                    className={
                                      (n.nilaiHuruf as string) === "A"
                                        ? "bg-green-100 text-green-700"
                                        : (n.nilaiHuruf as string) === "E"
                                        ? "bg-red-100 text-red-700"
                                        : "bg-blue-100 text-blue-700"
                                    }
                                  >
                                    {n.nilaiHuruf as string}
                                  </Badge>
                                </td>
                                <td className="px-3 py-2">{n.mutu as number}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Detail Modal */}
      {selectedDetailMatkul && (
        <DialogDetailNilai
          courseId={selectedDetailMatkul}
          courseName={matkulList.find((m) => m.code === selectedDetailMatkul)?.name || ""}
          nilaiList={nilaiData[selectedDetailMatkul] || []}
          onClose={() => setSelectedDetailMatkul(null)}
        />
      )}
    </div>
  );
}

function DialogDetailNilai({
  courseId,
  courseName,
  nilaiList,
  onClose,
}: {
  courseId: string;
  courseName: string;
  nilaiList: any[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-auto shadow-xl">
        <div className="p-6 border-b flex items-center justify-between">
          <h3 className="text-lg font-bold">
            Detail Nilai — {courseName} ({courseId})
          </h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>
        <div className="p-6">
          {nilaiList.length === 0 ? (
            <p className="text-slate-400 text-center py-8">Belum ada nilai yang diinput</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">NPM</th>
                    <th className="px-3 py-2 text-left font-medium">Nama</th>
                    <th className="px-3 py-2 text-left font-medium">Nilai</th>
                    <th className="px-3 py-2 text-left font-medium">Huruf</th>
                    <th className="px-3 py-2 text-left font-medium">Mutu</th>
                    <th className="px-3 py-2 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {nilaiList
                    .sort((a, b) => (a.npm || "").localeCompare(b.npm || ""))
                    .map((n, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 font-mono">{n.npm || "-"}</td>
                        <td className="px-3 py-2">{n.mahasiswaName || "-"}</td>
                        <td className="px-3 py-2 font-bold">{n.nilaiAngka}</td>
                        <td className="px-3 py-2">
                          <Badge
                            className={
                              n.nilaiHuruf === "A"
                                ? "bg-green-100 text-green-700"
                                : n.nilaiHuruf === "E"
                                ? "bg-red-100 text-red-700"
                                : "bg-blue-100 text-blue-700"
                            }
                          >
                            {n.nilaiHuruf}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">{n.mutu}</td>
                        <td className="px-3 py-2">
                          <Badge
                            variant="outline"
                            className={
                              n.status === "LULUS"
                                ? "text-green-600 border-green-300"
                                : "text-red-600 border-red-300"
                            }
                          >
                            {n.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
