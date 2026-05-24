"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "react-hot-toast";
import { Loader2 } from "lucide-react";

interface RoomData {
  id?: string;
  roomName: string;
  building: string;
  floor: number | string;
}

interface RoomFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initialData?: RoomData;
  onSuccess: () => void;
}

export default function RoomFormDialog({
  open,
  onOpenChange,
  mode,
  initialData,
  onSuccess,
}: RoomFormDialogProps) {
  const [formData, setFormData] = useState<RoomData>({
    id: "",
    roomName: "",
    building: "",
    floor: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setFormData({
        id: initialData?.id || "",
        roomName: initialData?.roomName || "",
        building: initialData?.building || "",
        floor: initialData?.floor !== undefined ? initialData.floor.toString() : "",
      });
      setErrors({});
    }
  }, [open, initialData]);

  const handleChange = (field: keyof RoomData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (mode === "create" && !formData.id) {
      newErrors.id = "Kode ruangan wajib diisi";
    }
    if (!formData.roomName) {
      newErrors.roomName = "Nama ruangan wajib diisi";
    }
    if (!formData.building) {
      newErrors.building = "Nama gedung wajib diisi";
    }
    if (formData.floor === "") {
      newErrors.floor = "Lantai wajib diisi";
    } else {
      const floorNum = Number(formData.floor);
      if (isNaN(floorNum)) {
        newErrors.floor = "Lantai harus berupa angka";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const url = mode === "create" ? "/api/rooms" : `/api/rooms/${formData.id}`;
      const method = mode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: formData.id,
          roomName: formData.roomName,
          building: formData.building,
          floor: Number(formData.floor),
        }),
      });

      if (res.ok) {
        toast.success(
          mode === "create"
            ? "Ruangan berhasil ditambahkan"
            : "Ruangan berhasil diupdate"
        );
        onSuccess();
        onOpenChange(false);
      } else {
        const error = await res.json();
        throw new Error(error.error || "Gagal menyimpan");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Tambah Ruangan" : "Edit Ruangan"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Isi form untuk mendaftarkan ruangan kelas baru"
              : "Ubah data ruangan kelas"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Kode Ruangan */}
          <div className="space-y-2">
            <Label htmlFor="roomId">Kode Ruangan (ID) *</Label>
            <Input
              id="roomId"
              value={formData.id}
              onChange={(e) => handleChange("id", e.target.value.toUpperCase())}
              disabled={mode === "edit"}
              placeholder="ROOM6"
            />
            {errors.id && <p className="text-sm text-destructive">{errors.id}</p>}
          </div>

          {/* Nama Ruangan */}
          <div className="space-y-2">
            <Label htmlFor="roomName">Nama Ruangan *</Label>
            <Input
              id="roomName"
              value={formData.roomName}
              onChange={(e) => handleChange("roomName", e.target.value)}
              placeholder="Ruangan B410"
            />
            {errors.roomName && (
              <p className="text-sm text-destructive">{errors.roomName}</p>
            )}
          </div>

          {/* Gedung */}
          <div className="space-y-2">
            <Label htmlFor="building">Gedung *</Label>
            <Input
              id="building"
              value={formData.building}
              onChange={(e) => handleChange("building", e.target.value)}
              placeholder="Gedung B"
            />
            {errors.building && (
              <p className="text-sm text-destructive">{errors.building}</p>
            )}
          </div>

          {/* Lantai */}
          <div className="space-y-2">
            <Label htmlFor="floor">Lantai *</Label>
            <Input
              id="floor"
              type="number"
              value={formData.floor}
              onChange={(e) => handleChange("floor", e.target.value)}
              placeholder="4"
              min={-2}
              max={20}
            />
            {errors.floor && <p className="text-sm text-destructive">{errors.floor}</p>}
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              className="bg-[#2563EB] hover:bg-[#1d4ed8]"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : mode === "create" ? (
                "Tambah Ruangan"
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
