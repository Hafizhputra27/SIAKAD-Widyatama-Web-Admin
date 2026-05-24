"use client";

import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import type { Mahasiswa } from "@/src/types";

interface MahasiswaTableProps {
  data: Mahasiswa[];
  onDelete?: (npm: string) => void;
}

export default function MahasiswaTable({ data, onDelete }: MahasiswaTableProps) {
  const columns: ColumnDef<Mahasiswa>[] = [
    { accessorKey: "npm", header: "NPM" },
    { accessorKey: "name", header: "Nama" },
    { accessorKey: "major", header: "Jurusan" },
    { accessorKey: "status", header: "Status" },
    {
      id: "actions",
      header: "Aksi",
      cell: ({ row }) => {
        const npm = row.original.npm;
        return (
          <div className="flex gap-2">
            <Link href={`/mahasiswa/${npm}/edit`}>
              <Button variant="outline" size="sm">
                <Pencil className="h-4 w-4" />
              </Button>
            </Link>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onDelete?.(npm)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  return <DataTable columns={columns} data={data} />;
}
