"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
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
import { toast } from "react-hot-toast";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import type { MataKuliah } from "@/src/types";
import MataKuliahFormDialog from "@/components/mata-kuliah/MataKuliahFormDialog";
import EnrollmentDialog from "@/components/mata-kuliah/EnrollmentDialog";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Users,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const TYPE_COLORS: Record<string, string> = {
  WAJIB: "bg-blue-100 text-blue-700",
  PILIHAN: "bg-purple-100 text-purple-700",
};

export default function MataKuliahPage() {
  const router = useRouter();
  const [matkul, setMatkul] = useState<(MataKuliah & { code: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSemester, setFilterSemester] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("true");
  const [sorting, setSorting] = useState<SortingState>([]);

  // Dialog states
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editData, setEditData] = useState<Partial<MataKuliah> | undefined>();

  const [enrollOpen, setEnrollOpen] = useState(false);
  const [enrollCode, setEnrollCode] = useState("");
  const [enrollName, setEnrollName] = useState("");
  const [enrollSemester, setEnrollSemester] = useState(0);

  // Fetch data
  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(collection(db, "courses"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        code: doc.id,
        ...doc.data(),
      })) as (MataKuliah & { code: string })[];
      setMatkul(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const columns = useMemo<ColumnDef<MataKuliah & { code: string }>[]>(
    () => [
      {
        accessorKey: "code",
        header: "Kode",
        cell: ({ row }) => <span className="font-mono font-medium">{row.original.code}</span>,
      },
      { accessorKey: "name", header: "Nama" },
      {
        accessorKey: "sks",
        header: "SKS",
        cell: ({ row }) => `${row.original.sks} SKS`,
      },
      {
        accessorKey: "semester",
        header: "Semester",
        cell: ({ row }) => `Semester ${row.original.semester}`,
      },
      {
        accessorKey: "type",
        header: "Tipe",
        cell: ({ row }) => (
          <Badge className={TYPE_COLORS[row.original.type] || ""}>
            {row.original.type}
          </Badge>
        ),
      },
      {
        accessorKey: "lecturer",
        header: "Dosen",
        cell: ({ row }) => row.original.lecturer || "-",
      },
      {
        accessorKey: "hari",
        header: "Jadwal",
        cell: ({ row }) => (
          <div className="text-sm">
            <p>{row.original.hari}</p>
            <p className="text-slate-400 text-xs">
              {row.original.jamMulai} - {row.original.jamSelesai}
            </p>
          </div>
        ),
      },
      { accessorKey: "room", header: "Ruangan" },
      {
        accessorKey: "enrolledCount",
        header: "Enrolled",
        cell: ({ row }) => (
          <span className="text-sm">{row.original.enrolledCount || 0}</span>
        ),
      },
      {
        accessorKey: "isActive",
        header: "Status",
        cell: ({ row }) => (
          <Badge
            className={
              row.original.isActive
                ? "bg-green-100 text-green-700"
                : "bg-slate-100 text-slate-500"
            }
          >
            {row.original.isActive ? "Aktif" : "Nonaktif"}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "Aksi",
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => {
                setEditData(row.original);
                setFormMode("edit");
                setFormOpen(true);
              }}
            >
              <Pencil className="h-4 w-4 text-slate-500" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => {
                setEnrollCode(row.original.code);
                setEnrollName(row.original.name);
                setEnrollSemester(row.original.semester);
                setEnrollOpen(true);
              }}
            >
              <Users className="h-4 w-4 text-blue-500" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => handleDeactivate(row.original.code)}
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
    let data = [...matkul];

    if (filterSemester && filterSemester !== "all") {
      data = data.filter((m) => m.semester === parseInt(filterSemester));
    }
    if (filterType && filterType !== "all") {
      data = data.filter((m) => m.type === filterType);
    }
    if (filterStatus !== "all") {
      const isActive = filterStatus === "true";
      data = data.filter((m) => m.isActive === isActive);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.code.toLowerCase().includes(q) ||
          (m.lecturer || "").toLowerCase().includes(q)
      );
    }

    return data;
  }, [matkul, filterSemester, filterType, filterStatus, searchQuery]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  const handleDeactivate = async (code: string) => {
    if (!confirm(`Yakin ingin menonaktifkan mata kuliah ${code}?`)) return;
    try {
      const res = await fetch(`/api/matkul/${code}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Mata kuliah berhasil dinonaktifkan");
      } else {
        throw new Error("Gagal");
      }
    } catch {
      toast.error("Gagal menonaktifkan mata kuliah");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1B2E4B]">Data Mata Kuliah</h2>
          <p className="text-sm text-slate-500 mt-1">
            Kelola mata kuliah dan jadwal perkuliahan
          </p>
        </div>
        <Button
          className="bg-[#2563EB] hover:bg-[#1d4ed8]"
          onClick={() => {
            setEditData(undefined);
            setFormMode("create");
            setFormOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Tambah Mata Kuliah
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Cari kode, nama, atau dosen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterSemester} onValueChange={setFilterSemester}>
          <SelectTrigger className="w-[150px]">
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
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Tipe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Tipe</SelectItem>
            <SelectItem value="WAJIB">Wajib</SelectItem>
            <SelectItem value="PILIHAN">Pilihan</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Aktif</SelectItem>
            <SelectItem value="false">Nonaktif</SelectItem>
            <SelectItem value="all">Semua</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabel */}
      <div className="rounded-lg border bg-white">
        {loading ? (
          <div className="p-8 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="h-8 bg-slate-100 rounded w-20 animate-pulse" />
                <div className="h-8 bg-slate-100 rounded flex-1 animate-pulse" />
                <div className="h-8 bg-slate-100 rounded w-24 animate-pulse" />
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
                      Tidak ada data mata kuliah
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-slate-500">
                Menampilkan {table.getRowModel().rows.length} dari {filteredData.length} mata kuliah
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

      {/* Form Dialog */}
      <MataKuliahFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        initialData={editData}
        onSuccess={() => {
          setFormOpen(false);
          // Data akan auto-refresh dari onSnapshot
        }}
      />

      {/* Enrollment Dialog */}
      <EnrollmentDialog
        open={enrollOpen}
        onOpenChange={setEnrollOpen}
        courseCode={enrollCode}
        courseName={enrollName}
        semester={enrollSemester}
      />
    </div>
  );
}
