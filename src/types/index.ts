// types/index.ts

export interface Mahasiswa {
  npm: string;
  name: string;
  major: string;
  campusEmail: string;
  passwordHash: string;
  photoUrl?: string;
  status: "AKTIF" | "NONAKTIF" | "CUTI" | "LULUS";
  kelas: "REGULER" | "KARYAWAN";
  angkatan: number;
  ipkKumulatif: number;
  totalSksLulus: number;
  totalSksTarget: number;
  semesterBerjalan: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MataKuliah {
  code: string;
  name: string;
  sks: number;
  type: "WAJIB" | "PILIHAN";
  semester: number;
  hari: string;
  jamMulai: string;
  jamSelesai: string;
  jamDisplay?: string; // Kompatibilitas Mobile App: "08:00 - 10:30 WIB"
  room: string;
  lecturerId: string;
  lecturer: string;
  enrolledCount: number;
  totalAttendance: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Pertemuan {
  id: string;
  courseId: string;
  courseName: string;
  nomorPertemuan: number;
  tanggal: Date;
  jamMulai: string;
  jamSelesai: string;
  qrToken: string;
  qrExpiresAt: Date;
  isQrActive: boolean;
  enrolledNpms: string[];
  createdBy: string;
  createdAt: Date;
}

export interface Presensi {
  id: string;
  npm: string;
  mahasiswaName?: string;
  mataKuliahId: string;
  pertemuanId: string;
  courseId: string;
  status: "HADIR" | "IZIN" | "SAKIT" | "ALPHA";
  scanMethod: "QR_SCAN" | "MANUAL";
  timestamp: Date;
}

export interface Dosen {
  nidn: string;
  name: string;
  title: string;
  email: string;
  department: string;
  passwordHash: string;
  isActive: boolean;
}

export interface Admin {
  uid: string;
  email: string;
  name: string;
  role: "super_admin" | "akademik" | "keuangan";
  isActive: boolean;
}

export interface AcademicResult {
  mataKuliahId: string;
  mataKuliahName: string;
  sks: number;
  nilaiAngka: number;
  nilaiHuruf: "A" | "B" | "C" | "D" | "E";
  mutu: number;
  semester: number;
  status: "LULUS" | "TIDAK_LULUS";
}

export interface Tagihan {
  id: string;
  semester: number;
  tanggal: Date;
  jatuhTempo: Date;
  total: number;
  status: "LUNAS" | "BELUM_LUNAS" | "PROSES";
  paymentMethod?: string;
  paymentDate?: Date;
}

export interface Pengumuman {
  id: string;
  title: string;
  content: string;
  isActive: boolean;
  priority: "HIGH" | "NORMAL" | "LOW";
  createdAt: Date;
}

// Legacy types untuk kompatibilitas dengan pages yang sudah ada
export interface Student {
  id?: string;
  npm: string;
  name: string;
  major: string;
  campusEmail: string;
  status: StudentStatus;
  semesterBerjalan: number;
  ipkKumulatif: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Course {
  code: string;
  name: string;
  sks: number;
  day: string;
  time: string;
  room: string;
  lecturer: string;
}

export type StudentStatus = "AKTIF" | "NONAKTIF" | "CUTI" | "LULUS";

export type DayOfWeek = "Senin" | "Selasa" | "Rabu" | "Kamis" | "Jumat" | "Sabtu" | "Minggu";
