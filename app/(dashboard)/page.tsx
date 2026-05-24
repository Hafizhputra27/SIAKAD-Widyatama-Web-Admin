"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  BookOpen,
  ClipboardCheck,
  Receipt,
  QrCode,
  GraduationCap,
  Megaphone,
  AlertTriangle,
  Clock,
} from "lucide-react";

interface TodayMeeting {
  id: string;
  courseName: string;
  courseId: string;
  nomorPertemuan: number;
  jamMulai: string;
  jamSelesai: string;
  isQrActive: boolean;
}

export default function DashboardPage() {
  const [stats, setStats] = useState({
    mahasiswa: 0,
    courses: 0,
    presensiToday: 0,
    tagihanBelumLunas: 0,
  });
  const [meetings, setMeetings] = useState<TodayMeeting[]>([]);
  const [pengumumanList, setPengumumanList] = useState<{ title: string; createdAt: Date }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Stats: mahasiswa aktif
    const unsub1 = onSnapshot(
      query(collection(db, "mahasiswa"), where("status", "==", "AKTIF")),
      (snap) => {
        setStats((prev) => ({ ...prev, mahasiswa: snap.size }));
      }
    );

    // Stats: courses aktif
    const unsub2 = onSnapshot(
      query(collection(db, "courses"), where("isActive", "==", true)),
      (snap) => {
        setStats((prev) => ({ ...prev, courses: snap.size }));
      }
    );

    // Stats: presensi hari ini
    const unsub3 = onSnapshot(
      query(collection(db, "presensi"), where("timestamp", ">=", today), where("timestamp", "<", tomorrow)),
      (snap) => {
        setStats((prev) => ({ ...prev, presensiToday: snap.size }));
      }
    );

    // Pertemuan hari ini
    const unsub4 = onSnapshot(
      query(collection(db, "pertemuan"), where("tanggal", ">=", today), where("tanggal", "<", tomorrow)),
      (snap) => {
        const data = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as TodayMeeting[];
        setMeetings(data);
        setLoading(false);
      }
    );

    // Pengumuman aktif
    const unsub5 = onSnapshot(
      query(collection(db, "pengumuman"), where("isActive", "==", true)),
      (snap) => {
        const data = snap.docs.map((d) => ({
          title: d.data().title || "",
          createdAt: d.data().createdAt?.toDate?.() ? d.data().createdAt.toDate() : new Date(),
        }));
        setPengumumanList(data.slice(0, 3));
      }
    );

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
      unsub5();
    };
  }, []);

  const statCards = [
    {
      label: "Mahasiswa Aktif",
      value: stats.mahasiswa,
      icon: Users,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Mata Kuliah Aktif",
      value: stats.courses,
      icon: BookOpen,
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Absensi Hari Ini",
      value: stats.presensiToday,
      icon: ClipboardCheck,
      color: "bg-amber-50 text-amber-600",
    },
    {
      label: "Tagihan Belum Lunas",
      value: stats.tagihanBelumLunas,
      icon: Receipt,
      color: "bg-rose-50 text-rose-600",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))
          : statCards.map((stat) => (
              <Card key={stat.label}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">{stat.label}</p>
                      <p className="text-2xl font-bold text-[#1B2E4B] mt-1">{stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-xl ${stat.color}`}>
                      <stat.icon className="w-6 h-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/absensi/qr">
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-blue-200">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <QrCode className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-[#1B2E4B]">Generate QR Sekarang</p>
                <p className="text-xs text-slate-500">Buat QR absensi untuk pertemuan</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/nilai">
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-green-200">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-xl">
                <GraduationCap className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-[#1B2E4B]">Input Nilai</p>
                <p className="text-xs text-slate-500">Masukkan nilai mahasiswa</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/pengumuman">
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-purple-200">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-xl">
                <Megaphone className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="font-semibold text-[#1B2E4B]">Buat Pengumuman</p>
                <p className="text-xs text-slate-500">Tambah pengumuman kampus</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pertemuan Hari Ini */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-[#2563EB]" />
              <h3 className="font-semibold text-[#1B2E4B]">Pertemuan Hari Ini</h3>
            </div>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : meetings.length === 0 ? (
              <p className="text-sm text-slate-400 py-4">Tidak ada pertemuan hari ini</p>
            ) : (
              <div className="space-y-3">
                {meetings.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-sm">{m.courseName || m.courseId}</p>
                      <p className="text-xs text-slate-500">
                        Pertemuan {m.nomorPertemuan} · {m.jamMulai} - {m.jamSelesai}
                      </p>
                    </div>
                    <Badge
                      className={
                        m.isQrActive
                          ? "bg-green-100 text-green-700 animate-pulse"
                          : "bg-slate-100 text-slate-500"
                      }
                    >
                      {m.isQrActive ? "QR Aktif" : "QR Tidak Aktif"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pengumuman Terbaru */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Megaphone className="w-5 h-5 text-[#2563EB]" />
              <h3 className="font-semibold text-[#1B2E4B]">Pengumuman Terbaru</h3>
            </div>
            {pengumumanList.length === 0 ? (
              <p className="text-sm text-slate-400 py-4">Belum ada pengumuman aktif</p>
            ) : (
              <div className="space-y-3">
                {pengumumanList.map((p, i) => (
                  <div key={i} className="p-3 bg-slate-50 rounded-lg">
                    <p className="font-medium text-sm">{p.title}</p>
                    <p className="text-xs text-slate-400">
                      {p.createdAt.toLocaleDateString("id-ID")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Warning */}
      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              Mahasiswa dengan kehadiran &lt; 75%
            </p>
            <p className="text-xs text-amber-600 mt-1">
              Data akan ditampilkan setelah modul rekap absensi diimplementasikan sepenuhnya.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
