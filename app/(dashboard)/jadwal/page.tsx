"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Loader2, LayoutGrid, List, Clock } from "lucide-react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import type { MataKuliah } from "@/src/types";

const HARI_ORDER = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const JAM_SLOTS = [
  "07:00", "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00", "18:00",
];

const SEMESTER_COLORS: Record<number, string> = {
  1: "bg-blue-100 border-blue-300 text-blue-800",
  2: "bg-green-100 border-green-300 text-green-800",
  3: "bg-amber-100 border-amber-300 text-amber-800",
  4: "bg-rose-100 border-rose-300 text-rose-800",
  5: "bg-purple-100 border-purple-300 text-purple-800",
  6: "bg-cyan-100 border-cyan-300 text-cyan-800",
  7: "bg-pink-100 border-pink-300 text-pink-800",
  8: "bg-orange-100 border-orange-300 text-orange-800",
};

export default function JadwalPage() {
  const [matkul, setMatkul] = useState<(MataKuliah & { code: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filterSemester, setFilterSemester] = useState("");

  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(collection(db, "courses"), (snapshot) => {
      const data = snapshot.docs
        .map((doc) => ({ code: doc.id, ...doc.data() } as MataKuliah & { code: string }))
        .filter((m) => m.isActive !== false);
      setMatkul(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filteredMatkul = filterSemester && filterSemester !== "all"
    ? matkul.filter((m) => m.semester === parseInt(filterSemester))
    : matkul;

  // Group by day for grid view
  const jadwalByDay: Record<string, (MataKuliah & { code: string })[]> = {};
  HARI_ORDER.forEach((hari) => {
    jadwalByDay[hari] = filteredMatkul
      .filter((m) => m.hari === hari)
      .sort((a, b) => a.jamMulai.localeCompare(b.jamMulai));
  });

  // Parse time string to minutes
  const timeToMinutes = (time: string): number => {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1B2E4B]">Jadwal Perkuliahan</h2>
          <p className="text-sm text-slate-500 mt-1">
            Tampilan jadwal mingguan
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={filterSemester} onValueChange={setFilterSemester}>
            <SelectTrigger className="w-[160px]">
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
          <div className="flex border rounded-lg overflow-hidden">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className={viewMode === "grid" ? "bg-[#2563EB]" : ""}
            >
              <LayoutGrid className="w-4 h-4 mr-1" />
              Grid
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className={viewMode === "list" ? "bg-[#2563EB]" : ""}
            >
              <List className="w-4 h-4 mr-1" />
              List
            </Button>
          </div>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === "grid" && (
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Header hari */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              <div className="p-2 font-semibold text-sm text-slate-500">Jam</div>
              {HARI_ORDER.map((hari) => (
                <div key={hari} className="p-2 font-semibold text-sm text-center text-[#1B2E4B]">
                  {hari}
                </div>
              ))}
            </div>

            {/* Time slots */}
            <div className="space-y-2">
              {JAM_SLOTS.map((slot) => {
                const slotMinutes = timeToMinutes(slot);
                const nextSlotMinutes = slotMinutes + 60;

                return (
                  <div key={slot} className="grid grid-cols-7 gap-2">
                    <div className="p-2 text-xs text-slate-400 font-mono flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {slot}
                    </div>
                    {HARI_ORDER.map((hari) => {
                      const coursesInSlot = jadwalByDay[hari]?.filter((m) => {
                        const startMinutes = timeToMinutes(m.jamMulai);
                        const endMinutes = timeToMinutes(m.jamSelesai);
                        return startMinutes < nextSlotMinutes && endMinutes > slotMinutes;
                      });

                      return (
                        <div key={hari} className="min-h-[80px] p-1">
                          {coursesInSlot?.map((course) => {
                            const colorClass = SEMESTER_COLORS[course.semester] || "bg-slate-100 border-slate-300";
                            return (
                              <Link
                                key={course.code}
                                href={`/mata-kuliah/${course.code}`}
                                className={`block p-2 rounded-lg border text-xs mb-1 hover:shadow-md transition-shadow cursor-pointer ${colorClass}`}
                              >
                                <p className="font-semibold truncate">{course.code}</p>
                                <p className="truncate">{course.name}</p>
                                <p className="text-[10px] opacity-70">
                                  {course.jamMulai} - {course.jamSelesai}
                                </p>
                                <p className="text-[10px] opacity-70">{course.room}</p>
                                <Badge variant="outline" className="text-[10px] mt-1 px-1 py-0">
                                  {course.sks} SKS
                                </Badge>
                              </Link>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <div className="rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>SKS</TableHead>
                <TableHead>Semester</TableHead>
                <TableHead>Hari</TableHead>
                <TableHead>Jam</TableHead>
                <TableHead>Ruangan</TableHead>
                <TableHead>Dosen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMatkul.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-slate-400">
                    Tidak ada jadwal
                  </TableCell>
                </TableRow>
              ) : (
                filteredMatkul
                  .sort((a, b) => {
                    const hariDiff = HARI_ORDER.indexOf(a.hari) - HARI_ORDER.indexOf(b.hari);
                    if (hariDiff !== 0) return hariDiff;
                    return a.jamMulai.localeCompare(b.jamMulai);
                  })
                  .map((course) => (
                    <TableRow key={course.code}>
                      <TableCell className="font-mono font-medium">{course.code}</TableCell>
                      <TableCell>{course.name}</TableCell>
                      <TableCell>{course.sks} SKS</TableCell>
                      <TableCell>
                        <Badge
                          className={SEMESTER_COLORS[course.semester] || ""}
                        >
                          Semester {course.semester}
                        </Badge>
                      </TableCell>
                      <TableCell>{course.hari}</TableCell>
                      <TableCell>
                        {course.jamMulai} - {course.jamSelesai}
                      </TableCell>
                      <TableCell>{course.room}</TableCell>
                      <TableCell>{course.lecturer || "-"}</TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="text-slate-500 font-medium">Semester:</span>
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i + 1} className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded ${SEMESTER_COLORS[i + 1]?.split(" ")[0] || "bg-slate-200"}`} />
            <span>{i + 1}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
