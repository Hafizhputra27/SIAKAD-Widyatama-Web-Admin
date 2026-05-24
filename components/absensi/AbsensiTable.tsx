"use client";

import { DataTable } from "@/components/shared/DataTable";
import type { Presensi } from "@/src/types";
import { ColumnDef } from "@tanstack/react-table";

interface AbsensiTableProps {
  data: Presensi[];
}

export default function AbsensiTable({ data }: AbsensiTableProps) {
  const columns: ColumnDef<Presensi>[] = [
    { accessorKey: "npm", header: "NPM" },
    { accessorKey: "mahasiswaName", header: "Nama" },
    { accessorKey: "status", header: "Status" },
    { accessorKey: "scanMethod", header: "Metode" },
    { accessorKey: "timestamp", header: "Waktu" },
  ];

  return <DataTable columns={columns} data={data} />;
}
