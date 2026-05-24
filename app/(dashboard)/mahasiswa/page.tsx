"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  type SortingState,
  type ColumnDef,
  flexRender,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "react-hot-toast";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import type { Mahasiswa } from "@/src/types";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  KeyRound,
  Upload,
  Download,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  AKTIF: "bg-green-100 text-green-700 hover:bg-green-200",
  NONAKTIF: "bg-red-100 text-red-700 hover:bg-red-200",
  CUTI: "bg-yellow-100 text-yellow-700 hover:bg-yellow-200",
  LULUS: "bg-blue-100 text-blue-700 hover:bg-blue-200",
};

function getIpkColor(ipk: number): string {
  if (ipk >= 3.5) return "text-green-600 font-semibold";
  if (ipk >= 3.0) return "text-blue-600 font-medium";
  if (ipk >= 2.5) return "text-yellow-600 font-medium";
  return "text-red-600 font-semibold";
}

export default function MahasiswaPage() {
  const router = useRouter();
  const [mahasiswa, setMahasiswa] = useState<Mahasiswa[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSemester, setFilterSemester] = useState("");
  const [filterMajor, setFilterMajor] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  // Reset password modal
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetNpm, setResetNpm] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  // Import modal
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  // Fetch data
  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(collection(db, "mahasiswa"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        npm: doc.id,
        ...doc.data(),
      })) as Mahasiswa[];
      setMahasiswa(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setGlobalFilter(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const columns = useMemo<ColumnDef<Mahasiswa>[]>(
    () => [
      {
        accessorKey: "npm",
        header: "NPM",
        cell: ({ row }) => <span className="font-mono">{row.original.npm}</span>,
      },
      { accessorKey: "name", header: "Nama" },
      { accessorKey: "major", header: "Program Studi" },
      {
        accessorKey: "semesterBerjalan",
        header: "Semester",
        cell: ({ row }) => `Semester ${row.original.semesterBerjalan}`,
      },
      { accessorKey: "kelas", header: "Kelas" },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge className={STATUS_COLORS[row.original.status] || ""}>
            {row.original.status}
          </Badge>
        ),
      },
      {
        accessorKey: "ipkKumulatif",
        header: "IPK",
        cell: ({ row }) => (
          <span className={getIpkColor(row.original.ipkKumulatif || 0)}>
            {(row.original.ipkKumulatif || 0).toFixed(2)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Aksi",
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Link href={`/mahasiswa/${row.original.npm}/edit`}>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Pencil className="h-4 w-4 text-slate-500" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => {
                setResetNpm(row.original.npm);
                setResetModalOpen(true);
              }}
            >
              <KeyRound className="h-4 w-4 text-slate-500" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => handleDeactivate(row.original.npm)}
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  const filteredData = useMemo(() => {
    let data = [...mahasiswa];

    if (filterStatus && filterStatus !== "all") {
      data = data.filter((m) => m.status === filterStatus);
    }
    if (filterMajor && filterMajor !== "all") {
      data = data.filter((m) => m.major === filterMajor);
    }
    if (filterSemester && filterSemester !== "all") {
      data = data.filter((m) => m.semesterBerjalan === parseInt(filterSemester));
    }

    return data;
  }, [mahasiswa, filterStatus, filterMajor, filterSemester]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  const handleDeactivate = async (npm: string) => {
    if (!confirm(`Yakin ingin menonaktifkan mahasiswa ${npm}?`)) return;
    try {
      const res = await fetch(`/api/mahasiswa/${npm}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Mahasiswa berhasil dinonaktifkan");
      } else {
        throw new Error("Gagal");
      }
    } catch {
      toast.error("Gagal menonaktifkan mahasiswa");
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      toast.error("Password minimal 8 karakter");
      return;
    }
    setResetting(true);
    try {
      const res = await fetch(`/api/mahasiswa/${resetNpm}/reset-password`, {
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

  const handleImport = async () => {
    if (!importFile) {
      toast.error("Pilih file CSV terlebih dahulu");
      return;
    }
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", importFile);

      const res = await fetch("/api/mahasiswa/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Import berhasil: ${data.success} data`);
        if (data.failed > 0) {
          toast.error(`${data.failed} data gagal diimport`);
        }
        setImportModalOpen(false);
        setImportFile(null);
      } else {
        throw new Error(data.error || "Gagal import");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal import");
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const csv = "npm,name,major,kelas,angkatan,semesterBerjalan,campusEmail\n241111011,Budi Santoso,Teknik Informatika,REGULER,2024,1,241111011@student.widyatama.ac.id";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template-mahasiswa.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1B2E4B]">Data Mahasiswa</h2>
          <p className="text-sm text-slate-500 mt-1">
            Kelola data mahasiswa Universitas Widyatama
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setImportModalOpen(true)}
          >
            <Upload className="w-4 h-4 mr-2" />
            Import CSV
          </Button>
          <Link href="/mahasiswa/tambah">
            <Button className="bg-[#2563EB] hover:bg-[#1d4ed8]">
              <Plus className="w-4 h-4 mr-2" />
              Tambah Mahasiswa
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Cari nama atau NPM..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterSemester} onValueChange={setFilterSemester}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Semester" />
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
        <Select value={filterMajor} onValueChange={setFilterMajor}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Program Studi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Prodi</SelectItem>
            {["Teknik Informatika", "Sistem Informasi", "Manajemen Informatika", "Komputerisasi Akuntansi"].map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="AKTIF">Aktif</SelectItem>
            <SelectItem value="NONAKTIF">Nonaktif</SelectItem>
            <SelectItem value="CUTI">Cuti</SelectItem>
            <SelectItem value="LULUS">Lulus</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabel */}
      <div className="rounded-lg border bg-white">
        {loading ? (
          <div className="p-8 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="h-8 bg-slate-100 rounded w-24 animate-pulse" />
                <div className="h-8 bg-slate-100 rounded flex-1 animate-pulse" />
                <div className="h-8 bg-slate-100 rounded w-32 animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-32 text-center text-slate-400">
                      Tidak ada data mahasiswa
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-slate-500">
                Menampilkan {table.getRowModel().rows.length} dari {filteredData.length} mahasiswa
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-slate-600">
                  Halaman {table.getState().pagination.pageIndex + 1} dari {table.getPageCount()}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Select
                  value={table.getState().pagination.pageSize.toString()}
                  onValueChange={(v) => table.setPageSize(Number(v))}
                >
                  <SelectTrigger className="w-[80px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 25, 50].map((size) => (
                      <SelectItem key={size} value={size.toString()}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Reset Password Modal */}
      <Dialog open={resetModalOpen} onOpenChange={setResetModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Reset password untuk mahasiswa {resetNpm}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Input
              type="password"
              placeholder="Password baru (minimal 8 karakter)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
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

      {/* Import Modal */}
      <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import Mahasiswa</DialogTitle>
            <DialogDescription>
              Upload file CSV untuk import data mahasiswa
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="p-4 bg-slate-50 rounded-lg text-sm space-y-2">
              <p className="font-medium">Format CSV:</p>
              <code className="text-xs bg-white p-2 rounded block">
                npm,name,major,kelas,angkatan,semesterBerjalan,campusEmail
              </code>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="w-4 h-4 mr-2" />
                Download Template
              </Button>
            </div>
            <Input
              type="file"
              accept=".csv,.xlsx"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
            />
            <Button
              onClick={handleImport}
              disabled={importing || !importFile}
              className="w-full bg-[#2563EB] hover:bg-[#1d4ed8]"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Mengimport...
                </>
              ) : (
                "Import Sekarang"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
