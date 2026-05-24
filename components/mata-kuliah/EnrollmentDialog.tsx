"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "react-hot-toast";
import { Loader2, Search, Users, UserPlus, UserMinus } from "lucide-react";
import type { Mahasiswa } from "@/src/types";

interface EnrollmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseCode: string;
  courseName: string;
  semester: number;
}

export default function EnrollmentDialog({
  open,
  onOpenChange,
  courseCode,
  courseName,
  semester,
}: EnrollmentDialogProps) {
  const [enrolledNpms, setEnrolledNpms] = useState<string[]>([]);
  const [allMahasiswa, setAllMahasiswa] = useState<Mahasiswa[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [selectedNpms, setSelectedNpms] = useState<string[]>([]);

  useEffect(() => {
    if (!open || !courseCode) return;
    setLoading(true);

    // Fetch course detail (dapatkan enrolled)
    fetch(`/api/matkul/${courseCode}`)
      .then((res) => res.json())
      .then((data) => {
        const enrolled = data.data?.enrolledMahasiswa?.map((m: Mahasiswa) => m.npm) || [];
        setEnrolledNpms(enrolled);
      })
      .catch(() => setEnrolledNpms([]));

    // Fetch all mahasiswa aktif semester yang sama
    fetch(`/api/mahasiswa?status=AKTIF`)
      .then((res) => res.json())
      .then((data) => {
        const filtered = (data.data || []).filter(
          (m: Mahasiswa) => m.semesterBerjalan === semester
        );
        setAllMahasiswa(filtered);
        setLoading(false);
      })
      .catch(() => {
        setAllMahasiswa([]);
        setLoading(false);
      });
  }, [open, courseCode, semester]);

  const handleEnroll = async () => {
    if (selectedNpms.length === 0) return;
    setEnrolling(true);
    try {
      const res = await fetch(`/api/matkul/${courseCode}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ npms: selectedNpms }),
      });
      if (res.ok) {
        toast.success(`${selectedNpms.length} mahasiswa berhasil dienroll`);
        setEnrolledNpms((prev) => [...new Set([...prev, ...selectedNpms])]);
        setSelectedNpms([]);
      } else {
        throw new Error("Gagal");
      }
    } catch {
      toast.error("Gagal enroll mahasiswa");
    } finally {
      setEnrolling(false);
    }
  };

  const handleUnenroll = async (npm: string) => {
    try {
      const res = await fetch(`/api/matkul/${courseCode}/enroll`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ npm }),
      });
      if (res.ok) {
        toast.success("Mahasiswa berhasil di-unenroll");
        setEnrolledNpms((prev) => prev.filter((n) => n !== npm));
      } else {
        throw new Error("Gagal");
      }
    } catch {
      toast.error("Gagal unenroll");
    }
  };

  const handleBatchEnrollSemester = async () => {
    const eligible = allMahasiswa
      .filter((m) => !enrolledNpms.includes(m.npm))
      .map((m) => m.npm);
    if (eligible.length === 0) {
      toast("Semua mahasiswa semester ini sudah dienroll");
      return;
    }
    setSelectedNpms(eligible);
    await handleEnroll();
  };

  const filteredMahasiswa = allMahasiswa.filter(
    (m) =>
      !enrolledNpms.includes(m.npm) &&
      (m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.npm.includes(searchQuery))
  );

  const enrolledMahasiswa = allMahasiswa.filter((m) => enrolledNpms.includes(m.npm));

  const toggleSelect = (npm: string) => {
    setSelectedNpms((prev) =>
      prev.includes(npm) ? prev.filter((n) => n !== npm) : [...prev, npm]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Kelola Mahasiswa Enrolled</DialogTitle>
          <DialogDescription>
            {courseName} ({courseCode}) — Semester {semester}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Enrolled List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Users className="w-4 h-4" />
                Mahasiswa Terdaftar ({enrolledMahasiswa.length})
              </h4>
            </div>
            {enrolledMahasiswa.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">
                Belum ada mahasiswa terdaftar
              </p>
            ) : (
              <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                {enrolledMahasiswa.map((m) => (
                  <div
                    key={m.npm}
                    className="flex items-center justify-between px-3 py-2 hover:bg-slate-50"
                  >
                    <div>
                      <p className="text-sm font-medium">{m.name}</p>
                      <p className="text-xs text-slate-500">{m.npm}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnenroll(m.npm)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <UserMinus className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Mahasiswa */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Tambah Mahasiswa
              </h4>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBatchEnrollSemester}
                disabled={enrolling}
              >
                Enroll Semua Semester {semester}
              </Button>
            </div>

            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Cari mahasiswa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" />
              </div>
            ) : filteredMahasiswa.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">
                {searchQuery
                  ? "Tidak ada mahasiswa yang cocok"
                  : "Semua mahasiswa semester ini sudah dienroll"}
              </p>
            ) : (
              <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                {filteredMahasiswa.map((m) => (
                  <div
                    key={m.npm}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50"
                  >
                    <Checkbox
                      checked={selectedNpms.includes(m.npm)}
                      onCheckedChange={() => toggleSelect(m.npm)}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{m.name}</p>
                      <p className="text-xs text-slate-500">
                        {m.npm} · {m.major}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {m.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            {selectedNpms.length > 0 && (
              <Button
                onClick={handleEnroll}
                disabled={enrolling}
                className="w-full mt-3 bg-[#2563EB] hover:bg-[#1d4ed8]"
              >
                {enrolling ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Mengenroll...
                  </>
                ) : (
                  `Enroll ${selectedNpms.length} Mahasiswa`
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
