"use client";

import { useState, useEffect } from "react";
import { useDosenAuth } from "@/hooks/useDosenAuth";
import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import type { MataKuliah } from "@/src/types";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, LayoutGrid, List, Clock, CalendarDays } from "lucide-react";

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

export default function DosenJadwalPage() {
  const { user } = useDosenAuth();
  const [matkul, setMatkul] = useState<(MataKuliah & { code: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const hariIni = new Date().getDay();
  const hariIniNama = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"][hariIni];

  useEffect(() => {
    if (!user?.nidn) return;

    setLoading(true);
    const q = query(
      collection(db, "courses"),
      where("lecturerId", "==", user.nidn)
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs
          .map((doc) => ({ code: doc.id, ...doc.data() } as MataKuliah & { code: string }))
          .filter((m) => m.isActive !== false);
        setMatkul(data);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching courses:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user?.nidn]);

  // Group by day for grid view
  const jadwalByDay: Record<string, (MataKuliah & { code: string })[]> = {};
  HARI_ORDER.forEach((hari) => {
    jadwalByDay[hari] = matkul
      .filter((m) => m.hari === hari)
      .sort((a, b) => a.jamMulai.localeCompare(b.jamMulai));
  });

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
      <div>
        <h2 className="text-2xl font-bold text-[#1B2E4B]">Jadwal Mengajar</h2>
        <p className="text-sm text-slate-500 mt-1">
          Jadwal perkuliahan Anda hari ini: <strong>{hariIniNama}</strong>
        </p>
      </div>

      {/* Today's Classes Card */}
      {jadwalByDay[hariIniNama]?.length > 0 && (
        <Card className="bg-[#2563EB]/5 border-[#2563EB]/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-[#2563EB]">
              <CalendarDays className="w-5 h-5" />
              Jadwal Hari Ini — {hariIniNama}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {jadwalByDay[hariIniNama].map((course) => (
                <div
                  key={course.code}
                  className={`p-3 rounded-lg border ${SEMESTER_COLORS[course.semester] || "bg-slate-100"}`}
                >
                  <p className="font-semibold text-sm">{course.name}</p>
                  <p className="text-xs opacity-70">{course.code}</p>
                  <div className="flex items-center gap-1 mt-2 text-xs opacity-80">
                    <Clock className="w-3 h-3" />
                    {course.jamMulai} - {course.jamSelesai}
                  </div>
                  <p className="text-xs opacity-70 mt-1">Ruang {course.room}</p>
                  <Badge variant="outline" className="text-[10px] mt-2">
                    {course.sks} SKS
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Total {matkul.length} mata kuliah diampu
        </p>
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

      {/* Grid View */}
      {viewMode === "grid" && (
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Header hari */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              <div className="p-2 font-semibold text-sm text-slate-500">Jam</div>
              {HARI_ORDER.map((hari) => (
                <div
                  key={hari}
                  className={`p-2 font-semibold text-sm text-center rounded ${
                    hari === hariIniNama ? "bg-[#2563EB] text-white" : "text-[#1B2E4B]"
                  }`}
                >
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
                            const colorClass =
                              SEMESTER_COLORS[course.semester] || "bg-slate-100 border-slate-300";
                            return (
                              <div
                                key={course.code}
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
                              </div>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {matkul.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-slate-400">
                    Tidak ada jadwal mengajar
                  </TableCell>
                </TableRow>
              ) : (
                matkul
                  .sort((a, b) => {
                    const hariDiff = HARI_ORDER.indexOf(a.hari) - HARI_ORDER.indexOf(b.hari);
                    if (hariDiff !== 0) return hariDiff;
                    return a.jamMulai.localeCompare(b.jamMulai);
                  })
                  .map((course) => (
                    <TableRow
                      key={course.code}
                      className={course.hari === hariIniNama ? "bg-[#2563EB]/5" : ""}
                    >
                      <TableCell className="font-mono font-medium">{course.code}</TableCell>
                      <TableCell>{course.name}</TableCell>
                      <TableCell>{course.sks} SKS</TableCell>
                      <TableCell>
                        <Badge className={SEMESTER_COLORS[course.semester] || ""}>
                          Semester {course.semester}
                        </Badge>
                      </TableCell>
                      <TableCell>{course.hari}</TableCell>
                      <TableCell>
                        {course.jamMulai} - {course.jamSelesai}
                      </TableCell>
                      <TableCell>{course.room}</TableCell>
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
            <div
              className={`w-3 h-3 rounded ${SEMESTER_COLORS[i + 1]?.split(" ")[0] || "bg-slate-200"}`}
            />
            <span>{i + 1}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
