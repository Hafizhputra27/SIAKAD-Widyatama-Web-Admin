"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Switch } from "@/components/ui/switch";
import { toast } from "react-hot-toast";
import { Loader2 } from "lucide-react";
import type { MataKuliah } from "@/src/types";

interface DosenOption {
  nidn: string;
  name: string;
}

interface MataKuliahFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initialData?: Partial<MataKuliah>;
  onSuccess: () => void;
}

export default function MataKuliahFormDialog({
  open,
  onOpenChange,
  mode,
  initialData,
  onSuccess,
}: MataKuliahFormDialogProps) {
  const [formData, setFormData] = useState({
    code: initialData?.code || "",
    name: initialData?.name || "",
    sks: initialData?.sks?.toString() || "3",
    semester: initialData?.semester?.toString() || "1",
    type: initialData?.type || "WAJIB",
    hari: initialData?.hari || "Senin",
    jamMulai: initialData?.jamMulai || "08:00",
    jamSelesai: initialData?.jamSelesai || "10:30",
    room: initialData?.room || "",
    lecturerId: initialData?.lecturerId || "",
    lecturer: initialData?.lecturer || "",
    totalAttendance: initialData?.totalAttendance?.toString() || "14",
    isActive: initialData?.isActive !== false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dosenList, setDosenList] = useState<DosenOption[]>([]);
  const [roomsList, setRoomsList] = useState<string[]>([]);

  // Fetch dosen & rooms
  useEffect(() => {
    if (!open) return;
    fetch("/api/dosen")
      .then((res) => res.json())
      .then((data) => setDosenList(data.data || []))
      .catch(() => setDosenList([]));
    fetch("/api/rooms")
      .then((res) => res.json())
      .then((data) => setRoomsList((data.data || []).map((r: { name?: string; id?: string }) => r.name || r.id)))
      .catch(() => setRoomsList(["R.301", "R.302", "R.303", "R.304", "R.305"]));
  }, [open]);

  // Reset form saat mode/initialData berubah
  useEffect(() => {
    if (open) {
      setFormData({
        code: initialData?.code || "",
        name: initialData?.name || "",
        sks: initialData?.sks?.toString() || "3",
        semester: initialData?.semester?.toString() || "1",
        type: initialData?.type || "WAJIB",
        hari: initialData?.hari || "Senin",
        jamMulai: initialData?.jamMulai || "08:00",
        jamSelesai: initialData?.jamSelesai || "",
        room: initialData?.room || "",
        lecturerId: initialData?.lecturerId || "",
        lecturer: initialData?.lecturer || "",
        totalAttendance: initialData?.totalAttendance?.toString() || "14",
        isActive: initialData?.isActive !== false,
      });
    }
  }, [open, initialData]);

  // Auto-calculate jamSelesai dari SKS
  useEffect(() => {
    if (formData.jamMulai && formData.sks) {
      const jamSelesai = calculateJamSelesai(formData.jamMulai, parseInt(formData.sks));
      setFormData((prev) => ({ ...prev, jamSelesai }));
    }
  }, [formData.jamMulai, formData.sks]);

  const handleChange = (field: string, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.code) newErrors.code = "Kode mata kuliah wajib diisi";
    else if (!/^[A-Z]{2}\d{3}$/.test(formData.code)) {
      newErrors.code = "Format: 2 huruf + 3 angka (contoh: IF301)";
    }

    if (!formData.name || formData.name.length < 5) {
      newErrors.name = "Nama minimal 5 karakter";
    }

    if (!formData.sks || parseInt(formData.sks) < 1 || parseInt(formData.sks) > 6) {
      newErrors.sks = "SKS harus 1-6";
    }

    if (!formData.room) newErrors.room = "Ruangan wajib diisi";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const url = mode === "create" ? "/api/matkul" : `/api/matkul/${formData.code}`;
      const method = mode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          sks: parseInt(formData.sks),
          semester: parseInt(formData.semester),
          totalAttendance: parseInt(formData.totalAttendance),
        }),
      });

      if (res.ok) {
        toast.success(mode === "create" ? "Mata kuliah berhasil ditambahkan" : "Mata kuliah berhasil diupdate");
        onSuccess();
        onOpenChange(false);
      } else {
        const error = await res.json();
        throw new Error(error.error || "Gagal");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Tambah Mata Kuliah" : "Edit Mata Kuliah"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Isi form untuk menambahkan mata kuliah baru"
              : "Ubah data mata kuliah"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          {/* Kode & Nama */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Kode MK *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => handleChange("code", e.target.value.toUpperCase())}
                disabled={mode === "edit"}
                placeholder="IF301"
              />
              {errors.code && <p className="text-sm text-destructive">{errors.code}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nama Mata Kuliah *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Pemrograman Web"
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>
          </div>

          {/* SKS, Semester, Tipe */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>SKS *</Label>
              <Select value={formData.sks} onValueChange={(v) => handleChange("sks", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="SKS" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6].map((s) => (
                    <SelectItem key={s} value={s.toString()}>
                      {s} SKS
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Semester *</Label>
              <Select value={formData.semester} onValueChange={(v) => handleChange("semester", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Semester" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 8 }, (_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                      Semester {i + 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipe *</Label>
              <Select value={formData.type} onValueChange={(v) => handleChange("type", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WAJIB">Wajib</SelectItem>
                  <SelectItem value="PILIHAN">Pilihan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Jadwal */}
          <div className="border rounded-lg p-4 space-y-4 bg-slate-50/50">
            <p className="font-medium text-sm">Jadwal Perkuliahan</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Hari *</Label>
                <Select value={formData.hari} onValueChange={(v) => handleChange("hari", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"].map((h) => (
                      <SelectItem key={h} value={h}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Jam Mulai *</Label>
                <Input
                  type="time"
                  value={formData.jamMulai}
                  onChange={(e) => handleChange("jamMulai", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Jam Selesai (auto)</Label>
                <Input value={formData.jamSelesai} disabled />
              </div>
            </div>
          </div>

          {/* Ruangan & Dosen */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Ruangan *</Label>
              <Select value={formData.room} onValueChange={(v) => handleChange("room", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih ruangan" />
                </SelectTrigger>
                <SelectContent>
                  {roomsList.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.room && <p className="text-sm text-destructive">{errors.room}</p>}
            </div>
            <div className="space-y-2">
              <Label>Dosen Pengampu *</Label>
              <Select
                value={formData.lecturerId}
                onValueChange={(v) => {
                  const selected = dosenList.find((d) => d.nidn === v);
                  handleChange("lecturerId", v);
                  handleChange("lecturer", selected?.name || v);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih dosen" />
                </SelectTrigger>
                <SelectContent>
                  {dosenList.map((d) => (
                    <SelectItem key={d.nidn} value={d.nidn}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Pengaturan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div className="space-y-2">
              <Label>Total Pertemuan</Label>
              <Input
                type="number"
                value={formData.totalAttendance}
                onChange={(e) => handleChange("totalAttendance", e.target.value)}
                min={1}
                max={20}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => handleChange("isActive", checked)}
              />
              <Label className="font-normal cursor-pointer">
                {formData.isActive ? "Aktif" : "Nonaktif"}
              </Label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" className="bg-[#2563EB] hover:bg-[#1d4ed8]" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : mode === "create" ? (
                "Tambah Mata Kuliah"
              ) : (
                "Simpan Perubahan"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function calculateJamSelesai(jamMulai: string, sks: number): string {
  const [hours, minutes] = jamMulai.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes + sks * 50;
  const endHours = Math.floor(totalMinutes / 60);
  const endMinutes = totalMinutes % 60;
  return `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`;
}
