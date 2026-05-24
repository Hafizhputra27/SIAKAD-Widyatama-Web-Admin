"use client";

import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import MahasiswaForm from "@/components/mahasiswa/MahasiswaForm";

export default function TambahMahasiswaPage() {
  const router = useRouter();

  const handleSubmit = async (data: Record<string, unknown>) => {
    const res = await fetch("/api/mahasiswa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      toast.success("Mahasiswa berhasil ditambahkan");
      router.push("/mahasiswa");
    } else {
      const error = await res.json();
      throw new Error(error.error || "Gagal menambahkan mahasiswa");
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#1B2E4B]">Tambah Mahasiswa</h2>
        <p className="text-sm text-slate-500 mt-1">
          Isi form di bawah untuk menambahkan mahasiswa baru
        </p>
      </div>
      <MahasiswaForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={() => router.push("/mahasiswa")}
      />
    </div>
  );
}
