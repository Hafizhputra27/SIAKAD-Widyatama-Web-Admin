"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "react-hot-toast";
import type { Mahasiswa } from "@/src/types";

interface MahasiswaFormProps {
  mode: "create" | "edit";
  initialData?: Partial<Mahasiswa>;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onCancel?: () => void;
}

const PROGRAM_STUDI_OPTIONS = [
  "Teknik Informatika",
  "Sistem Informasi",
  "Manajemen Informatika",
  "Komputerisasi Akuntansi",
];

const KELAS_OPTIONS = ["REGULER", "KARYAWAN"];

const currentYear = new Date().getFullYear();
const TAHUN_OPTIONS = Array.from({ length: 10 }, (_, i) => currentYear - i);

const SEMESTER_OPTIONS = Array.from({ length: 14 }, (_, i) => i + 1);

export default function MahasiswaForm({
  mode,
  initialData,
  onSubmit,
  onCancel,
}: MahasiswaFormProps) {
  const [formData, setFormData] = useState({
    npm: initialData?.npm || "",
    name: initialData?.name || "",
    campusEmail: initialData?.campusEmail || "",
    major: initialData?.major || "",
    kelas: initialData?.kelas || "REGULER",
    angkatan: initialData?.angkatan || currentYear,
    semesterBerjalan: initialData?.semesterBerjalan || 1,
    password: "",
    confirmPassword: "",
    autoGeneratePassword: false,
    photoUrl: initialData?.photoUrl || "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(initialData?.photoUrl || "");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handleChange = (field: string, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.npm) {
      newErrors.npm = "NPM wajib diisi";
    } else if (!/^\d{9,10}$/.test(formData.npm)) {
      newErrors.npm = "NPM harus 9-10 digit angka";
    }

    if (!formData.name || formData.name.length < 3) {
      newErrors.name = "Nama minimal 3 karakter";
    }

    if (!formData.campusEmail) {
      newErrors.campusEmail = "Email kampus wajib diisi";
    } else if (!formData.campusEmail.endsWith("@widyatama.ac.id")) {
      newErrors.campusEmail = "Harus email @widyatama.ac.id";
    }

    if (!formData.major) newErrors.major = "Program studi wajib dipilih";

    if (mode === "create" && !formData.autoGeneratePassword) {
      if (!formData.password) {
        newErrors.password = "Password wajib diisi";
      } else if (formData.password.length < 8) {
        newErrors.password = "Password minimal 8 karakter";
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Password tidak cocok";
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
      const payload: Record<string, unknown> = {
        npm: formData.npm,
        name: formData.name,
        campusEmail: formData.campusEmail,
        major: formData.major,
        kelas: formData.kelas,
        angkatan: formData.angkatan,
        semesterBerjalan: formData.semesterBerjalan,
        photoUrl: formData.photoUrl,
      };

      if (mode === "create") {
        payload.password = formData.autoGeneratePassword
          ? `${formData.npm}@widyatama`
          : formData.password;
      }

      await onSubmit(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Terjadi kesalahan";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setUploadingPhoto(true);
      try {
        // Upload ke API endpoint
        const uploadFormData = new FormData();
        uploadFormData.append("file", file);
        uploadFormData.append("npm", formData.npm);

        const res = await fetch("/api/upload/photo", {
          method: "POST",
          body: uploadFormData,
        });

        if (res.ok) {
          const data = await res.json();
          setPhotoPreview(data.url);
          setFormData((prev) => ({ ...prev, photoUrl: data.url }));
          toast.success("Foto berhasil diupload");
        } else {
          throw new Error("Gagal upload foto");
        }
      } catch {
        // Fallback: preview saja
        const reader = new FileReader();
        reader.onloadend = () => {
          setPhotoPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } finally {
        setUploadingPhoto(false);
      }
    },
    [formData.npm]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg"] },
    maxFiles: 1,
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Section 1: Data Pribadi */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data Pribadi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="npm">NPM *</Label>
              <Input
                id="npm"
                value={formData.npm}
                onChange={(e) => handleChange("npm", e.target.value)}
                disabled={mode === "edit"}
                placeholder="241111011"
              />
              {errors.npm && <p className="text-sm text-destructive">{errors.npm}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nama Lengkap *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Nama lengkap mahasiswa"
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="campusEmail">Email Kampus *</Label>
            <Input
              id="campusEmail"
              type="email"
              value={formData.campusEmail}
              onChange={(e) => handleChange("campusEmail", e.target.value)}
              placeholder="nama@widyatama.ac.id"
            />
            {errors.campusEmail && (
              <p className="text-sm text-destructive">{errors.campusEmail}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Data Akademik */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data Akademik</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Program Studi *</Label>
              <Select
                value={formData.major}
                onValueChange={(v) => handleChange("major", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih program studi" />
                </SelectTrigger>
                <SelectContent>
                  {PROGRAM_STUDI_OPTIONS.map((ps) => (
                    <SelectItem key={ps} value={ps}>
                      {ps}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.major && <p className="text-sm text-destructive">{errors.major}</p>}
            </div>
            <div className="space-y-2">
              <Label>Kelas *</Label>
              <Select
                value={formData.kelas}
                onValueChange={(v) => handleChange("kelas", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kelas" />
                </SelectTrigger>
                <SelectContent>
                  {KELAS_OPTIONS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {k}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Angkatan *</Label>
              <Select
                value={formData.angkatan.toString()}
                onValueChange={(v) => handleChange("angkatan", parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih angkatan" />
                </SelectTrigger>
                <SelectContent>
                  {TAHUN_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t.toString()}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Semester Berjalan *</Label>
              <Select
                value={formData.semesterBerjalan.toString()}
                onValueChange={(v) => handleChange("semesterBerjalan", parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih semester" />
                </SelectTrigger>
                <SelectContent>
                  {SEMESTER_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s.toString()}>
                      Semester {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Keamanan (hanya create) */}
      {mode === "create" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Keamanan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="autoPassword"
                checked={formData.autoGeneratePassword}
                onCheckedChange={(checked) =>
                  handleChange("autoGeneratePassword", checked === true)
                }
              />
              <Label htmlFor="autoPassword" className="text-sm font-normal cursor-pointer">
                Generate password otomatis ({formData.npm || "NPM"}@widyatama)
              </Label>
            </div>

            {!formData.autoGeneratePassword && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password Awal *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                    placeholder="Minimal 8 karakter"
                  />
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Konfirmasi Password *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange("confirmPassword", e.target.value)}
                    placeholder="Ulangi password"
                  />
                  {errors.confirmPassword && (
                    <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Section 4: Foto Profil */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Foto Profil (Opsional)</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              isDragActive
                ? "border-[#2563EB] bg-blue-50"
                : "border-slate-300 hover:border-slate-400"
            }`}
          >
            <input {...getInputProps()} />
            {photoPreview ? (
              <div className="flex flex-col items-center">
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="w-24 h-24 rounded-full object-cover mb-3"
                />
                <p className="text-sm text-slate-500">
                  {uploadingPhoto ? "Mengupload..." : "Klik atau drag untuk ganti foto"}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-slate-500">
                  {isDragActive
                    ? "Drop foto di sini..."
                    : "Drag & drop foto atau klik untuk memilih"}
                </p>
                <p className="text-xs text-slate-400">PNG, JPG up to 2MB</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Batal
          </Button>
        )}
        <Button
          type="submit"
          className="bg-[#2563EB] hover:bg-[#1d4ed8]"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? "Menyimpan..."
            : mode === "create"
            ? "Simpan Mahasiswa"
            : "Update Mahasiswa"}
        </Button>
      </div>
    </form>
  );
}
