import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/src/lib/firebase-admin";
import { hashPassword } from "@/src/lib/password-utils";
import type { Mahasiswa } from "@/src/types";

// POST: Import mahasiswa dari CSV/Excel
export async function POST(request: Request) {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: "Firebase Admin SDK belum dikonfigurasi" },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split("\n").filter((line) => line.trim());

    // Skip header
    const dataLines = lines.slice(1);

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Batch write (max 500 per batch)
    let batch = adminDb.batch();
    let batchCount = 0;
    const batches = [] as Promise<unknown>[];

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i];
      const cols = line.split(",").map((c) => c.trim());

      if (cols.length < 6) {
        results.failed++;
        results.errors.push(`Baris ${i + 2}: Format tidak valid`);
        continue;
      }

      const [npm, name, major, kelas, angkatan, semesterBerjalan, campusEmail] = cols;

      if (!npm || !name || !major) {
        results.failed++;
        results.errors.push(`Baris ${i + 2}: NPM, nama, dan major wajib diisi`);
        continue;
      }

      // Cek NPM sudah ada
      const existingDoc = await adminDb.collection("mahasiswa").doc(npm).get();
      if (existingDoc.exists) {
        results.failed++;
        results.errors.push(`Baris ${i + 2}: NPM ${npm} sudah ada`);
        continue;
      }

      const defaultPassword = `${npm}@widyatama`;
      const passwordHash = await hashPassword(defaultPassword);

      const mahasiswaData: Omit<Mahasiswa, "npm"> & { npm: string } = {
        npm,
        name,
        major: major || "Teknik Informatika",
        campusEmail: campusEmail || `${npm}@student.widyatama.ac.id`,
        passwordHash,
        photoUrl: "",
        status: "AKTIF",
        kelas: (kelas || "REGULER") as "REGULER" | "KARYAWAN",
        angkatan: parseInt(angkatan) || new Date().getFullYear(),
        ipkKumulatif: 0,
        totalSksLulus: 0,
        totalSksTarget: 144,
        semesterBerjalan: parseInt(semesterBerjalan) || 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      batch.set(adminDb.collection("mahasiswa").doc(npm), mahasiswaData);
      batchCount++;

      // Buat Firebase Auth user jika tersedia
      if (adminAuth) {
        try {
          await adminAuth.createUser({
            uid: npm,
            email: mahasiswaData.campusEmail,
            password: defaultPassword,
            displayName: name,
          });
        } catch {
          // Silent fail untuk auth
        }
      }

      // Commit batch setiap 400 operasi
      if (batchCount >= 400) {
        batches.push(batch.commit());
        batch = adminDb.batch();
        batchCount = 0;
      }

      results.success++;
    }

    // Commit sisa batch
    if (batchCount > 0 && batches.length === 0) {
      await batch.commit();
    }

    await Promise.all(batches);

    return NextResponse.json({
      message: "Import selesai",
      ...results,
    });
  } catch (error) {
    console.error("Error importing mahasiswa:", error);
    return NextResponse.json(
      { error: "Gagal mengimport mahasiswa" },
      { status: 500 }
    );
  }
}
