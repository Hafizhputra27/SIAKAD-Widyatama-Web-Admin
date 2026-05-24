"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { doc, onSnapshot, collection } from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import MahasiswaForm from "@/components/mahasiswa/MahasiswaForm";
import { DataTable } from "@/components/shared/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "react-hot-toast";
import { KeyRound, AlertTriangle, Download, Loader2 } from "lucide-react";
import type { Mahasiswa, MataKuliah } from "@/src/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TabData {
  id: string;
  [key: string]: unknown;
}

export default function EditMahasiswaPage() {
  const router = useRouter();
  const params = useParams();
  const npm = params?.npm as string;

  const [mahasiswa, setMahasiswa] = useState<Mahasiswa | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  // Tab data states
  const [nilaiData, setNilaiData] = useState<TabData[]>([]);
  const [tagihanData, setTagihanData] = useState<TabData[]>([]);
  const [presensiData, setPresensiData] = useState<TabData[]>([]);
  const [allCourses, setAllCourses] = useState<MataKuliah[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "courses"), (snap) => {
      const list = snap.docs.map((d) => ({
        code: d.id,
        ...d.data(),
      })) as unknown as MataKuliah[];
      setAllCourses(list.filter((c) => c.isActive !== false));
    });
    return () => unsub();
  }, []);

  const eligibleCourses = allCourses.filter(
    (c) => !nilaiData.some((n) => n.mataKuliahId === c.code)
  );

  useEffect(() => {
    if (!npm) return;
    setLoading(true);

    const unsub = onSnapshot(doc(db, "mahasiswa", npm), (docSnap) => {
      if (docSnap.exists()) {
        setMahasiswa({ npm: docSnap.id, ...docSnap.data() } as Mahasiswa);
      }
      setLoading(false);
    });

    // Fetch subcollections
    const unsubNilai = onSnapshot(
      collection(db, "mahasiswa", npm, "academic_results"),
      (snap) => setNilaiData(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsubTagihan = onSnapshot(
      collection(db, "mahasiswa", npm, "tagihan"),
      (snap) => setTagihanData(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsubPresensi = onSnapshot(
      collection(db, "presensi"),
      (snap) =>
        setPresensiData(
          snap.docs
            .filter((d) => d.data().npm === npm)
            .map((d) => ({ id: d.id, ...d.data() }))
        )
    );

    return () => {
      unsub();
      unsubNilai();
      unsubTagihan();
      unsubPresensi();
    };
  }, [npm]);

  const handleUpdate = async (data: Record<string, unknown>) => {
    const res = await fetch(`/api/mahasiswa/${npm}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      toast.success("Data mahasiswa berhasil diupdate");
    } else {
      const error = await res.json();
      throw new Error(error.error || "Gagal mengupdate");
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      toast.error("Password minimal 8 karakter");
      return;
    }
    setResetting(true);
    try {
      const res = await fetch(`/api/mahasiswa/${npm}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      if (res.ok) {
        toast.success("Password berhasil direset");
        setResetModalOpen(false);
        setNewPassword("");
      } else {
        throw new Error("Gagal");
      }
    } catch {
      toast.error("Gagal mereset password");
    } finally {
      setResetting(false);
    }
  };

  const handleDeactivate = async () => {
    if (!confirm("Yakin ingin menonaktifkan akun ini?")) return;
    try {
      const res = await fetch(`/api/mahasiswa/${npm}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Akun berhasil dinonaktifkan");
        router.push("/mahasiswa");
      }
    } catch {
      toast.error("Gagal menonaktifkan akun");
    }
  };

  const handleEnroll = async (courseCode: string) => {
    if (!courseCode || courseCode === "none") return;
    try {
      const res = await fetch(`/api/matkul/${courseCode}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ npms: [npm] }),
      });
      if (res.ok) {
        toast.success("Mahasiswa berhasil dienroll");
        setSelectedCourse("");
      } else {
        const error = await res.json();
        throw new Error(error.error || "Gagal");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal enroll";
      toast.error(msg);
    }
  };

  const handleUnenroll = async (courseCode: string) => {
    if (!confirm(`Yakin ingin mengeluarkan mahasiswa ini dari mata kuliah ${courseCode}?`)) return;
    try {
      const res = await fetch(`/api/matkul/${courseCode}/enroll`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ npm }),
      });
      if (res.ok) {
        toast.success("Mahasiswa berhasil di-unenroll");
      } else {
        const error = await res.json();
        throw new Error(error.error || "Gagal");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal unenroll";
      toast.error(msg);
    }
  };

  const nilaiColumns: ColumnDef<TabData>[] = [
    { accessorKey: "mataKuliahName", header: "Mata Kuliah" },
    { accessorKey: "sks", header: "SKS" },
    { accessorKey: "nilaiHuruf", header: "Nilai" },
    { accessorKey: "mutu", header: "Mutu" },
    { accessorKey: "semester", header: "Semester" },
  ];

  const tagihanColumns: ColumnDef<TabData>[] = [
    { accessorKey: "semester", header: "Semester" },
    {
      accessorKey: "total",
      header: "Total",
      cell: ({ row }) => `Rp ${(row.original.total as number).toLocaleString()}`,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status as string;
        const colors: Record<string, string> = {
          LUNAS: "bg-green-100 text-green-700",
          BELUM_LUNAS: "bg-red-100 text-red-700",
          PROSES: "bg-yellow-100 text-yellow-700",
        };
        return <Badge className={colors[status] || ""}>{status}</Badge>;
      },
    },
  ];

  const presensiColumns: ColumnDef<TabData>[] = [
    { accessorKey: "courseName", header: "Mata Kuliah" },
    { accessorKey: "status", header: "Status" },
    { accessorKey: "scanMethod", header: "Metode" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" />
      </div>
    );
  }

  if (!mahasiswa) {
    return <div className="text-center py-12 text-slate-500">Mahasiswa tidak ditemukan</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1B2E4B]">Detail Mahasiswa</h2>
          <p className="text-sm text-slate-500 mt-1">NPM: {npm}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setResetModalOpen(true)}>
            <KeyRound className="w-4 h-4 mr-2" />
            Reset Password
          </Button>
          <Button variant="destructive" onClick={handleDeactivate}>
            <AlertTriangle className="w-4 h-4 mr-2" />
            Nonaktifkan
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="data-diri" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="data-diri">Data Diri</TabsTrigger>
          <TabsTrigger value="matkul">Mata Kuliah</TabsTrigger>
          <TabsTrigger value="kehadiran">Kehadiran</TabsTrigger>
          <TabsTrigger value="nilai">Nilai</TabsTrigger>
          <TabsTrigger value="tagihan">Tagihan</TabsTrigger>
        </TabsList>

        <TabsContent value="data-diri" className="mt-4">
          <MahasiswaForm
            mode="edit"
            initialData={mahasiswa}
            onSubmit={handleUpdate}
            onCancel={() => router.push("/mahasiswa")}
          />
        </TabsContent>

        <TabsContent value="matkul" className="mt-4 space-y-4">
          <div className="rounded-lg border bg-white p-6 space-y-4">
            <div className="flex items-end gap-3 max-w-xl">
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium text-slate-700">Enroll Mata Kuliah Baru</label>
                <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Mata Kuliah" />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleCourses.length === 0 ? (
                      <SelectItem value="none" disabled>
                        Tidak ada mata kuliah tersedia
                      </SelectItem>
                    ) : (
                      eligibleCourses.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.code} - {c.name} (Semester {c.semester})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => handleEnroll(selectedCourse)}
                disabled={!selectedCourse || selectedCourse === "none"}
                className="bg-[#2563EB] hover:bg-[#1d4ed8]"
              >
                Enroll
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden mt-4">
              {nilaiData.length === 0 ? (
                <p className="text-sm text-slate-400 py-8 text-center">
                  Belum terdaftar di mata kuliah apa pun
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Kode</th>
                      <th className="px-4 py-3 text-left font-medium">Mata Kuliah</th>
                      <th className="px-4 py-3 text-left font-medium">SKS</th>
                      <th className="px-4 py-3 text-left font-medium">Semester</th>
                      <th className="px-4 py-3 text-left font-medium">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {nilaiData.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2 font-mono">{row.mataKuliahId as string}</td>
                        <td className="px-4 py-2">{row.mataKuliahName as string}</td>
                        <td className="px-4 py-2">{row.sks as number} SKS</td>
                        <td className="px-4 py-2">Semester {row.semester as number}</td>
                        <td className="px-4 py-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUnenroll(row.mataKuliahId as string)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 px-2"
                          >
                            Unenroll
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="kehadiran" className="mt-4">
          <div className="rounded-lg border bg-white">
            {presensiData.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                Belum ada data kehadiran
              </div>
            ) : (
              <DataTable columns={presensiColumns} data={presensiData} />
            )}
          </div>
        </TabsContent>

        <TabsContent value="nilai" className="mt-4">
          <div className="rounded-lg border bg-white">
            {nilaiData.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                Belum ada data nilai
              </div>
            ) : (
              <DataTable columns={nilaiColumns} data={nilaiData} />
            )}
          </div>
        </TabsContent>

        <TabsContent value="tagihan" className="mt-4">
          <div className="rounded-lg border bg-white">
            {tagihanData.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                Belum ada data tagihan
              </div>
            ) : (
              <DataTable columns={tagihanColumns} data={tagihanData} />
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Reset Password Modal */}
      <Dialog open={resetModalOpen} onOpenChange={setResetModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Reset password untuk {mahasiswa.name} ({npm})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <input
              type="password"
              placeholder="Password baru (minimal 8 karakter)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            />
            <Button
              onClick={handleResetPassword}
              disabled={resetting}
              className="w-full bg-[#2563EB] hover:bg-[#1d4ed8]"
            >
              {resetting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Mereset...
                </>
              ) : (
                "Reset Password"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
