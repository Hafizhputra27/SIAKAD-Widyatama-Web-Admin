"use client";

import { useState, useEffect, useMemo } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "react-hot-toast";
import type { Dosen } from "@/src/types";
import DosenFormDialog from "@/components/dosen/DosenFormDialog";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export default function DosenPage() {
  const [dosen, setDosen] = useState<Dosen[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  // Modal states
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [selectedDosen, setSelectedDosen] = useState<Dosen | null>(null);

  // Fetch data dari API Route
  const fetchDosen = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dosen");
      const data = await res.json();
      if (res.ok) {
        setDosen(data.data as Dosen[]);
      } else {
        throw new Error(data.error || "Gagal mengambil data");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengambil data dosen");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDosen();
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setGlobalFilter(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleAdd = () => {
    setSelectedDosen(null);
    setFormDialogOpen(true);
  };

  const handleEdit = (d: Dosen) => {
    setSelectedDosen(d);
    setFormDialogOpen(true);
  };

  const handleDelete = async (nidn: string) => {
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menghapus dosen dengan NIDN ${nidn}?\n\nData yang dihapus tidak dapat dikembalikan.`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/dosen/${nidn}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (res.ok) {
        toast.success("Dosen berhasil dihapus");
        // Update state tabel langsung tanpa reload
        setDosen((prev) => prev.filter((d) => d.nidn !== nidn));
      } else {
        throw new Error(data.error || "Gagal menghapus dosen");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus dosen");
    }
  };

  const columns = useMemo<ColumnDef<Dosen>[]>(
    () => [
      {
        id: "no",
        header: "No",
        cell: ({ row }) => (
          <span className="text-slate-500 text-sm">
            {row.index + 1}
          </span>
        ),
        enableSorting: false,
        size: 50,
      },
      {
        accessorKey: "nidn",
        header: "NIDN",
        cell: ({ row }) => (
          <span className="font-mono text-sm font-medium text-slate-700">
            {row.original.nidn}
          </span>
        ),
      },
      {
        accessorKey: "name",
        header: "Nama",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium text-slate-800">
              {row.original.name}
            </span>
            {row.original.title && (
              <span className="text-xs text-slate-400">
                {row.original.title}
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => (
          <span className="text-sm text-slate-600">
            {row.original.email}
          </span>
        ),
      },
      {
        accessorKey: "department",
        header: "Departemen",
        cell: ({ row }) => (
          <span className="text-sm text-slate-600">
            {row.original.department || "-"}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Aksi",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => handleEdit(row.original)}
            >
              <Pencil className="h-4 w-4 text-amber-500" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => handleDelete(row.original.nidn)}
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data: dosen,
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1B2E4B]">Manajemen Dosen</h2>
          <p className="text-sm text-slate-500 mt-1">
            Kelola data dosen Universitas Widyatama
          </p>
        </div>
        <Button
          className="bg-[#2563EB] hover:bg-[#1d4ed8]"
          onClick={handleAdd}
        >
          <Plus className="w-4 h-4 mr-2" />
          Tambah Dosen
        </Button>
      </div>

      {/* Search */}
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Cari nama, NIDN, atau email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-white shadow-sm">
        {loading ? (
          <div className="p-8 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="h-8 bg-slate-100 rounded w-12 animate-pulse" />
                <div className="h-8 bg-slate-100 rounded w-24 animate-pulse" />
                <div className="h-8 bg-slate-100 rounded flex-1 animate-pulse" />
                <div className="h-8 bg-slate-100 rounded w-48 animate-pulse" />
                <div className="h-8 bg-slate-100 rounded w-32 animate-pulse" />
                <div className="h-8 bg-slate-100 rounded w-20 animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id}>
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
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
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="h-32 text-center text-slate-400"
                      >
                        Tidak ada data dosen
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t gap-3">
              <p className="text-sm text-slate-500">
                Menampilkan {table.getRowModel().rows.length} dari{" "}
                {dosen.length} dosen
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
                  Halaman {table.getState().pagination.pageIndex + 1} dari{" "}
                  {table.getPageCount()}
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
      <DosenFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        onSuccess={fetchDosen}
        dosen={selectedDosen}
      />
    </div>
  );
}
