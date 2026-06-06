"use client";

import { useState, useEffect, useMemo } from "react";
import { useDosenAuth } from "@/hooks/useDosenAuth";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { collection, onSnapshot, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import type { MataKuliah, Presensi } from "@/src/types";
import { Loader2, Users, CheckCircle, AlertTriangle, XCircle, Clock } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  HADIR: "bg-green-100 text-green-700",
  IZIN: "bg-blue-100 text-blue-700",
  SAKIT: "bg-yellow-100 text-yellow-700",
  ALPHA: "bg-red-100 text-red-700",
};

interface MahasiswaPresensi {
  npm: string;
  name: string;
  status: string;
  timestamp: string | null;
  scanMethod: string;
}

export default function DosenPresensiPage() {
  const { user } = useDosenAuth();
  const [matkulList, setMatkulList] = useState<(MataKuliah & { code: string })[]>([]);
  const [pertemuanList, setPertemuanList] = useState<{ id: string; nomorPertemuan: number }[]>([]);
  const [selectedMatkul, setSelectedMatkul] = useState("");
  const [selectedPertemuan, setSelectedPertemuan] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [presensiRecords, setPresensiRecords] = useState<any[]>([]);
  const [enrolledNpms, setEnrolledNpms] = useState<string[]>([]);
  const [mahasiswaMap, setMahasiswaMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

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

    const q = query(
      collection(db, "courses"),
      where("lecturerId", "==", user.nidn)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs
          .map((d) => ({
            code: d.id,
            ...d.data(),
          })) as (MataKuliah & { code: string })[];
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
      setPertemuanList([]);
      setSelectedPertemuan("");
      return;
    }

    const q = query(collection(db, "pertemuan"), where("courseId", "==", selectedMatkul));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a: any, b: any) => a.nomorPertemuan - b.nomorPertemuan);
      setPertemuanList(data as { id: string; nomorPertemuan: number }[]);
    });
    return () => unsub();
  }, [selectedMatkul]);

  // Fetch presensi real-time
  useEffect(() => {
    if (!selectedPertemuan) {
      setPresensiRecords([]);
      setEnrolledNpms([]);
      return;
    }

    setLoading(true);

    getDoc(doc(db, "pertemuan", selectedPertemuan)).then((pertemuanDoc) => {
      if (pertemuanDoc.exists()) {
        const enrolled = pertemuanDoc.data()?.enrolledNpms || [];
        setEnrolledNpms(enrolled);
      }
    });

    const q = query(collection(db, "presensi"), where("pertemuanId", "==", selectedPertemuan));
    const unsub = onSnapshot(q, (snap) => {
      const records = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setPresensiRecords(records);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });

    return () => unsub();
  }, [selectedPertemuan]);

  // Derive presensi data
  const presensiData = useMemo(() => {
    const dataMap: Record<string, MahasiswaPresensi> = {};

    presensiRecords.forEach((rec: any) => {
      const npm = rec.npm;
      dataMap[npm] = {
        npm,
        name: rec.mahasiswaName || mahasiswaMap[npm] || npm,
        status: rec.status || "HADIR",
        timestamp: rec.timestamp?.toDate?.()
          ? rec.timestamp.toDate().toLocaleString("id-ID")
          : rec.timestamp ? new Date(rec.timestamp).toLocaleString("id-ID") : null,
        scanMethod: rec.scanMethod || "QR_SCAN",
      };
    });

    enrolledNpms.forEach((npm) => {
      if (!dataMap[npm]) {
        dataMap[npm] = {
          npm,
          name: mahasiswaMap[npm] || npm,
          status: "ALPHA",
          timestamp: null,
          scanMethod: "-",
        };
      }
    });

    return Object.values(dataMap);
  }, [presensiRecords, enrolledNpms, mahasiswaMap]);

  const summary = useMemo(() => {
    const total = presensiData.length;
    const hadir = presensiData.filter((p) => p.status === "HADIR").length;
    const izin = presensiData.filter((p) => p.status === "IZIN").length;
    const sakit = presensiData.filter((p) => p.status === "SAKIT").length;
    const alpha = presensiData.filter((p) => p.status === "ALPHA").length;
    return { total, hadir, izin, sakit, alpha };
  }, [presensiData]);

  const filteredData = useMemo(() => {
    if (!filterStatus || filterStatus === "all") return presensiData;
    return presensiData.filter((p) => p.status === filterStatus);
  }, [presensiData, filterStatus]);

  const columns = useMemo<ColumnDef<MahasiswaPresensi>[]>(
    () => [
      { accessorKey: "npm", header: "NPM", cell: ({ row }) => <span className="font-mono">{row.original.npm}</span> },
      { accessorKey: "name", header: "Nama" },
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
        accessorKey: "timestamp",
        header: "Waktu Scan",
        cell: ({ row }) => row.original.timestamp || "-",
      },
      {
        accessorKey: "scanMethod",
        header: "Metode",
        cell: ({ row }) => (
          <Badge variant="outline" className="text-xs">
            {row.original.scanMethod === "QR_SCAN" ? "QR Scan" : row.original.scanMethod === "MANUAL" ? "Manual" : "-"}
          </Badge>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1B2E4B]">Rekap Presensi</h2>
        <p className="text-sm text-slate-500 mt-1">Lihat kehadiran mahasiswa per pertemuan</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-3">
        <Select value={selectedMatkul} onValueChange={setSelectedMatkul}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Pilih Mata Kuliah" />
          </SelectTrigger>
          <SelectContent>
            {matkulList.map((m) => (
              <SelectItem key={m.code} value={m.code}>
                {m.code} - {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedPertemuan} onValueChange={setSelectedPertemuan}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Pilih Pertemuan" />
          </SelectTrigger>
          <SelectContent>
            {pertemuanList.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                Pertemuan {p.nomorPertemuan}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Filter Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="HADIR">Hadir</SelectItem>
            <SelectItem value="IZIN">Izin</SelectItem>
            <SelectItem value="SAKIT">Sakit</SelectItem>
            <SelectItem value="ALPHA">Alpha</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {selectedPertemuan && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Total</p>
                  <p className="text-2xl font-bold">{summary.total}</p>
                </div>
                <Users className="w-8 h-8 text-slate-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600">Hadir</p>
                  <p className="text-2xl font-bold text-green-700">{summary.hadir}</p>
                  <p className="text-xs text-green-600">{summary.total > 0 ? Math.round((summary.hadir / summary.total) * 100) : 0}%</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600">Izin</p>
                  <p className="text-2xl font-bold text-blue-700">{summary.izin}</p>
                </div>
                <Clock className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-600">Sakit</p>
                  <p className="text-2xl font-bold text-yellow-700">{summary.sakit}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600">Alpha</p>
                  <p className="text-2xl font-bold text-red-700">{summary.alpha}</p>
                </div>
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="rounded-lg border bg-white">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" />
          </div>
        ) : (
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
                    {selectedPertemuan
                      ? "Tidak ada data presensi"
                      : "Pilih mata kuliah dan pertemuan untuk melihat data"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
