import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/src/lib/firebase-admin";
import { hashPassword } from "@/src/lib/password-utils";
import type { Mahasiswa } from "@/src/types";

// GET: List semua mahasiswa dengan optional filter
export async function GET(request: Request) {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: "Firebase Admin SDK belum dikonfigurasi" },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const semester = searchParams.get("semester");
    const major = searchParams.get("major");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    let query: FirebaseFirestore.Query = adminDb.collection("mahasiswa");

    // Apply filters
    if (status) {
      query = query.where("status", "==", status);
    }
    if (major) {
      query = query.where("major", "==", major);
    }
    if (semester) {
      query = query.where("semesterBerjalan", "==", parseInt(semester));
    }

    const snapshot = await query.get();
    let mahasiswa = snapshot.docs.map((doc) => ({
      npm: doc.id,
      ...doc.data(),
    })) as Mahasiswa[];

    // Search filter (client-side karena Firestore tidak mendukung partial text search)
    if (search) {
      const q = search.toLowerCase();
      mahasiswa = mahasiswa.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.npm.includes(q) ||
          m.major.toLowerCase().includes(q)
      );
    }

    return NextResponse.json({ data: mahasiswa, total: mahasiswa.length });
  } catch (error) {
    console.error("Error getting mahasiswa:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data mahasiswa" },
      { status: 500 }
    );
  }
}

// POST: Buat mahasiswa baru
export async function POST(request: Request) {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: "Firebase Admin SDK belum dikonfigurasi" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const {
      npm,
      name,
      campusEmail,
      major,
      kelas,
      angkatan,
      semesterBerjalan,
      password,
      photoUrl,
    } = body;

    // Validasi dasar
    if (!npm || !name || !campusEmail || !major || !kelas || !angkatan || !semesterBerjalan) {
      return NextResponse.json(
        { error: "Semua field wajib diisi" },
        { status: 400 }
      );
    }

    // Cek NPM sudah ada
    const existingDoc = await adminDb.collection("mahasiswa").doc(npm).get();
    if (existingDoc.exists) {
      return NextResponse.json(
        { error: `Mahasiswa dengan NPM ${npm} sudah ada` },
        { status: 409 }
      );
    }

    // Hash password
    const plainPassword = password || `${npm}@widyatama`;
    const passwordHash = await hashPassword(plainPassword);

    const mahasiswaData: Omit<Mahasiswa, "npm"> & { npm: string } = {
      npm,
      name,
      major,
      campusEmail,
      passwordHash,
      photoUrl: photoUrl || "",
      status: "AKTIF",
      kelas: kelas as "REGULER" | "KARYAWAN",
      angkatan: parseInt(angkatan as string),
      ipkKumulatif: 0,
      totalSksLulus: 0,
      totalSksTarget: 144,
      semesterBerjalan: parseInt(semesterBerjalan as string),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Simpan ke Firestore
    await adminDb.collection("mahasiswa").doc(npm).set(mahasiswaData);

    // Buat Firebase Auth user jika adminAuth tersedia
    if (adminAuth) {
      try {
        const email = campusEmail || `${npm}@student.widyatama.ac.id`;
        await adminAuth.createUser({
          uid: npm,
          email,
          password: plainPassword,
          displayName: name,
        });
      } catch (authError) {
        console.warn("Gagal membuat Firebase Auth user:", authError);
        // Jangan return error, data sudah tersimpan di Firestore
      }
    }

    return NextResponse.json(
      { message: "Mahasiswa berhasil ditambahkan", data: { npm, name } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating mahasiswa:", error);
    return NextResponse.json(
      { error: "Gagal menambahkan mahasiswa" },
      { status: 500 }
    );
  }
}
