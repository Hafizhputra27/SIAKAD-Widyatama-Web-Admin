"use client";

import { useState, useEffect } from "react";
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
import { Loader2, Save, FileSpreadsheet, Search, GraduationCap, BookOpen } from "lucide-react";

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

export default function NilaiPage() {
  const [matkulList, setMatkulList] = useState<(MataKuliah & { code: string })[]>([]);
  const [selectedMatkul, setSelectedMatkul] = useState("");
  const [nilaiData, setNilaiData] = useState<NilaiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchNpm, setSearchNpm] = useState("");

  // Tab transkrip
  const [transkripNpm, setTranskripNpm] = useState("");
  const [transkripData, setTranskripData] = useState<Record<string, unknown> | null>(null);
  const [transkripNilai, setTranskripNilai] = useState<Record<string, unknown>[]>([]);
  const [loadingTranskrip, setLoadingTranskrip] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "courses"), (snap) => {
      const data = snap.docs
        .map((d) => ({ code: d.id, ...d.data() } as MataKuliah & { code: string }))
        .filter((m) => m.isActive !== false);
      setMatkulList(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Fetch enrolled mahasiswa + nilai saat matkul dipilih
  useEffect(() => {
    if (!selectedMatkul) {
      setNilaiData([]);
      return;
    }
    setLoading(true);

    async function fetchData() {
      // Ambil pertemuan untuk dapat enrolledNpms
      const pertemuanSnap = await getDoc(doc(db, "pertemuan", `${selectedMatkul}_1`));
      // Fallback: fetch dari API
      try {
        const res = await fetch(`/api/nilai?courseId=${selectedMatkul}`);
        const apiData = await res.json();
        const rows: NilaiRow[] = (apiData.data || []).map((n: Record<string, unknown>) => ({
          npm: n.npm as string,
          name: (n.mahasiswaName as string) || (n.npm as string),
          nilaiAngka: (n.nilaiAngka as number) || "",
          nilaiHuruf: (n.nilaiHuruf as string) || "",
          mutu: (n.mutu as number) || 0,
          status: (n.status as string) || "MENGULANG",
        }));
        setNilaiData(rows);
      } catch {
        setNilaiData([]);
      }
      setLoading(false);
    }

    fetchData();
  }, [selectedMatkul]);

  const handleNilaiChange = (npm: string, value: string) => {
    const angka = parseFloat(value);
    const huruf = !isNaN(angka) ? angkaToHuruf(angka) : "";
    const mutu = huruf ? hurufToMutu(huruf) : 0;
    const status = huruf && huruf !== "E" ? "LULUS" : "MENGULANG";

    setNilaiData((prev) =>
      prev.map((row) =>
        row.npm === npm
          ? { ...row, nilaiAngka: value === "" ? "" : angka, nilaiHuruf: huruf, mutu, status }
          : row
      )
    );
  };

  const handleSaveAll = async () => {
    if (!selectedMatkul) return;
    setSaving(true);

    const nilaiList = nilaiData
      .filter((row) => row.nilaiAngka !== "")
      .map((row) => ({
        npm: row.npm,
        nilaiAngka: row.nilaiAngka as number,
      }));

    try {
      const res = await fetch("/api/nilai/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: selectedMatkul,
          semester: matkulList.find((m) => m.code === selectedMatkul)?.semester || 1,
          nilaiList,
        }),
      });

      if (res.ok) {
        toast.success(`${nilaiList.length} nilai berhasil disimpan`);
      } else {
        throw new Error("Gagal");
      }
    } catch {
      toast.error("Gagal menyimpan nilai");
    } finally {
      setSaving(false);
    }
  };

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

  const exportNilai = () => {
    const headers = ["NPM", "Nama", "Nilai Angka", "Nilai Huruf", "Mutu", "Status"];
    const rows = nilaiData.map((n) => [
      n.npm,
      n.name,
      n.nilaiAngka.toString(),
      n.nilaiHuruf,
      n.mutu.toString(),
      n.status,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nilai-${selectedMatkul}.csv`;
    a.click();
  };

  const filteredNilai = nilaiData.filter(
    (n) =>
      n.npm.includes(searchNpm) ||
      n.name.toLowerCase().includes(searchNpm.toLowerCase())
  );

  // Group transkrip by semester
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
          <p className="text-sm text-slate-500 mt-1">Input dan kelola nilai mahasiswa</p>
        </div>
      </div>

      <Tabs defaultValue="input" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="input">Input Nilai per Matkul</TabsTrigger>
          <TabsTrigger value="transkrip">Transkrip Mahasiswa</TabsTrigger>
        </TabsList>

        {/* Tab 1: Input Nilai */}
        <TabsContent value="input" className="mt-4 space-y-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <Select value={selectedMatkul} onValueChange={setSelectedMatkul}>
              <SelectTrigger className="w-[320px]">
                <SelectValue placeholder="Pilih Mata Kuliah" />
              </SelectTrigger>
              <SelectContent>
                {matkulList.map((m) => (
                  <SelectItem key={m.code} value={m.code}>
                    {m.code} - {m.name} (Semester {m.semester})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Cari NPM atau nama..."
                value={searchNpm}
                onChange={(e) => setSearchNpm(e.target.value)}
                className="pl-9"
              />
            </div>
            {selectedMatkul && (
              <>
                <Button variant="outline" onClick={exportNilai}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Button
                  onClick={handleSaveAll}
                  disabled={saving}
                  className="bg-[#2563EB] hover:bg-[#1d4ed8]"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Simpan Semua
                </Button>
              </>
            )}
          </div>

          {selectedMatkul && (
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
                        <th className="px-4 py-3 text-left font-medium">NPM</th>
                        <th className="px-4 py-3 text-left font-medium">Nama</th>
                        <th className="px-4 py-3 text-left font-medium w-32">Nilai Angka</th>
                        <th className="px-4 py-3 text-left font-medium">Huruf</th>
                        <th className="px-4 py-3 text-left font-medium">Mutu</th>
                        <th className="px-4 py-3 text-left font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredNilai.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                            Tidak ada data mahasiswa
                          </td>
                        </tr>
                      ) : (
                        filteredNilai.map((row) => (
                          <tr key={row.npm} className="hover:bg-slate-50">
                            <td className="px-4 py-2 font-mono">{row.npm}</td>
                            <td className="px-4 py-2">{row.name}</td>
                            <td className="px-4 py-2">
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                value={row.nilaiAngka}
                                onChange={(e) => handleNilaiChange(row.npm, e.target.value)}
                                className="w-24 h-8"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <Badge
                                className={
                                  row.nilaiHuruf === "A"
                                    ? "bg-green-100 text-green-700"
                                    : row.nilaiHuruf === "E"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-blue-100 text-blue-700"
                                }
                              >
                                {row.nilaiHuruf || "-"}
                              </Badge>
                            </td>
                            <td className="px-4 py-2">{row.mutu || "-"}</td>
                            <td className="px-4 py-2">
                              <Badge
                                variant="outline"
                                className={
                                  row.status === "LULUS"
                                    ? "text-green-600 border-green-300"
                                    : "text-red-600 border-red-300"
                                }
                              >
                                {row.status}
                              </Badge>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
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
                        <p className="text-2xl font-bold">{(transkripData.ipkKumulatif as number)?.toFixed(2) || "0.00"}</p>
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
                        <p className="text-2xl font-bold">{(transkripData.totalSksLulus as number) || 0}</p>
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
                        <p className="text-2xl font-bold">{(transkripData.totalSksTarget as number) || 144}</p>
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
    </div>
  );
}
