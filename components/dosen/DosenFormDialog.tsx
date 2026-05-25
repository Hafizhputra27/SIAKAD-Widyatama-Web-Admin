"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "react-hot-toast";
import { Loader2 } from "lucide-react";
import type { Dosen } from "@/src/types";

interface DosenFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  dosen?: Dosen | null;
}

export default function DosenFormDialog({
  open,
  onOpenChange,
  onSuccess,
  dosen,
}: DosenFormDialogProps) {
  const isEdit = !!dosen;

  const [formData, setFormData] = useState({
    nidn: "",
    name: "",
    title: "",
    email: "",
    department: "",
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      if (isEdit && dosen) {
        setFormData({
          nidn: dosen.nidn || "",
          name: dosen.name || "",
          title: dosen.title || "",
          email: dosen.email || "",
          department: dosen.department || "",
        });
      } else {
        setFormData({
          nidn: "",
          name: "",
          title: "",
          email: "",
          department: "",
        });
      }
      setErrors({});
    }
  }, [open, isEdit, dosen]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.nidn.trim()) {
      newErrors.nidn = "NIDN wajib diisi";
    }
    if (!formData.name.trim()) {
      newErrors.name = "Nama wajib diisi";
    }
    if (!formData.email.trim()) {
      newErrors.email = "Email wajib diisi";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Format email tidak valid";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      if (isEdit) {
        // UPDATE: PUT /api/dosen/:nidn
        const res = await fetch(`/api/dosen/${dosen.nidn}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            title: formData.title,
            email: formData.email,
            department: formData.department,
          }),
        });

        const data = await res.json();
        if (res.ok) {
          toast.success("Dosen berhasil diperbarui");
          onOpenChange(false);
          onSuccess();
        } else {
          throw new Error(data.error || "Gagal memperbarui dosen");
        }
      } else {
        // CREATE: POST /api/dosen
        const res = await fetch("/api/dosen", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nidn: formData.nidn,
            name: formData.name,
            title: formData.title,
            email: formData.email,
            department: formData.department,
          }),
        });

        const data = await res.json();
        if (res.ok) {
          toast.success("Dosen berhasil ditambahkan");
          onOpenChange(false);
          onSuccess();
        } else {
          throw new Error(data.error || "Gagal menambahkan dosen");
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Dosen" : "Tambah Dosen"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Perbarui informasi dosen yang sudah ada."
              : "Isi form berikut untuk menambahkan dosen baru."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* NIDN */}
          <div className="space-y-1.5">
            <Label htmlFor="nidn">
              NIDN <span className="text-red-500">*</span>
            </Label>
            <Input
              id="nidn"
              placeholder="Contoh: 001"
              value={formData.nidn}
              onChange={(e) => handleChange("nidn", e.target.value)}
              disabled={isEdit || loading}
              className={errors.nidn ? "border-red-500" : ""}
            />
            {isEdit && (
              <p className="text-xs text-slate-400">NIDN tidak dapat diubah</p>
            )}
            {errors.nidn && (
              <p className="text-xs text-red-500">{errors.nidn}</p>
            )}
          </div>

          {/* Nama */}
          <div className="space-y-1.5">
            <Label htmlFor="name">
              Nama Lengkap <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Contoh: Dr. Budi Santoso, M.Kom"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              disabled={loading}
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && (
              <p className="text-xs text-red-500">{errors.name}</p>
            )}
          </div>

          {/* Gelar */}
          <div className="space-y-1.5">
            <Label htmlFor="title">Gelar</Label>
            <Input
              id="title"
              placeholder="Contoh: M.Kom, Ph.D"
              value={formData.title}
              onChange={(e) => handleChange("title", e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email">
              Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="Contoh: budi@widyatama.ac.id"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              disabled={loading}
              className={errors.email ? "border-red-500" : ""}
            />
            {errors.email && (
              <p className="text-xs text-red-500">{errors.email}</p>
            )}
          </div>

          {/* Departemen */}
          <div className="space-y-1.5">
            <Label htmlFor="department">Departemen / Program Studi</Label>
            <Input
              id="department"
              placeholder="Contoh: Mobile Development"
              value={formData.department}
              onChange={(e) => handleChange("department", e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-[#2563EB] hover:bg-[#1d4ed8]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                isEdit ? "Simpan Perubahan" : "Tambah Dosen"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
