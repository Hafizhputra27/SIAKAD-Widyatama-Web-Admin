"use client";

import { useState, useEffect } from "react";
import { useDosenAuth } from "@/hooks/useDosenAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Users,
  CheckCircle,
  Calendar,
  ArrowRight,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import type { MataKuliah } from "@/src/types";

const HARI_INDO = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export default function DosenDashboardPage() {
  const { user } = useDosenAuth();
  const [matkulList, setMatkulList] = useState<(MataKuliah & { code: string })[]>([]);
  const [pertemuanHariIni, setPertemuanHariIni] = useState<any[]>([]);
  const [presensiHariIni, setPresensiHariIni] = useState(0);
  const [totalMahasiswa, setTotalMahasiswa] = useState(0);
  const [loading, setLoading] = useState(true);

  const hariIni = HARI_INDO[new Date().getDay()];

  // Fetch matkul yang diampu dosen
  useEffect(() => {
    if (!user?.nidn) return;

    const q = query(
      collection(db, "courses"),
      where("lecturerId", "==", user.nidn)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs
          .map((d) => ({
            code: d.id,
            ...d.data(),
          })) as (MataKuliah & { code: string })[];
        const active = data.filter((m) => m.isActive !== false);
        setMatkulList(active);
        setTotalMahasiswa(active.reduce((sum, m) => sum + (m.enrolledCount || 0), 0));
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching courses:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user?.nidn]);

  // Fetch pertemuan hari ini untuk matkul yang diampu
  useEffect(() => {
    if (matkulList.length === 0) return;

    const courseIds = matkulList.map((m) => m.code);

    // Karena Firestore tidak support OR query sederhana untuk IN dengan real-time,
    // kita query semua pertemuan lalu filter client-side
    const unsub = onSnapshot(collection(db, "pertemuan"), (snap) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const data = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((p: any) => {
          const ptDate = p.tanggal?.toDate ? p.tanggal.toDate() : new Date(p.tanggal);
          return (
            courseIds.includes(p.courseId) &&
            ptDate >= today &&
            ptDate < tomorrow
          );
        });

      setPertemuanHariIni(data);
    });

    return () => unsub();
  }, [matkulList]);

  // Hitung presensi hari ini
  useEffect(() => {
    if (pertemuanHariIni.length === 0) {
      setPresensiHariIni(0);
      return;
    }

    const pertemuanIds = pertemuanHariIni.map((p) => p.id);
    const unsub = onSnapshot(collection(db, "presensi"), (snap) => {
      const count = snap.docs.filter((d) => {
        const data = d.data();
        return pertemuanIds.includes(data.pertemuanId);
      }).length;
      setPresensiHariIni(count);
    });

    return () => unsub();
  }, [pertemuanHariIni]);

  const matkulHariIni = matkulList.filter((m) => m.hari === hariIni);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1B2E4B]">Dashboard Dosen</h2>
        <p className="text-sm text-slate-500 mt-1">
          Selamat datang, {user?.name || "Dosen"}
        </p>
      </div>

      {/* Statistik Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Mata Kuliah Diampu</p>
                <p className="text-3xl font-bold">{matkulList.length}</p>
              </div>
              <BookOpen className="w-8 h-8 text-[#2563EB] opacity-70" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Mahasiswa</p>
                <p className="text-3xl font-bold">{totalMahasiswa}</p>
              </div>
              <Users className="w-8 h-8 text-green-600 opacity-70" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Presensi Hari Ini</p>
                <p className="text-3xl font-bold">{presensiHariIni}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600 opacity-70" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Jadwal Hari Ini */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#2563EB]" />
            Jadwal Hari Ini — {hariIni}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {matkulHariIni.length > 0 ? (
            <div className="space-y-3">
              {matkulHariIni.map((m) => (
                <div
                  key={m.code}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{m.name}</p>
                    <p className="text-sm text-slate-500">
                      {m.code} • {m.jamMulai} - {m.jamSelesai} • Ruang {m.room}
                    </p>
                  </div>
                  <Link href="/portal-dosen/pertemuan">
                    <Button size="sm" variant="outline">
                      Buka Pertemuan
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-6">
              Tidak ada jadwal mengajar hari ini
            </p>
          )}
        </CardContent>
      </Card>

      {/* Pertemuan Aktif Hari Ini */}
      {pertemuanHariIni.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pertemuan Hari Ini</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pertemuanHariIni.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 bg-green-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{p.courseName}</p>
                    <p className="text-sm text-slate-500">
                      Pertemuan ke-{p.nomorPertemuan} • {p.jamMulai} - {p.jamSelesai}
                    </p>
                  </div>
                  <Badge
                    className={
                      p.isQrActive
                        ? "bg-green-100 text-green-700 animate-pulse"
                        : "bg-slate-100 text-slate-600"
                    }
                  >
                    {p.isQrActive ? "QR Aktif" : "Belum Dimulai"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
