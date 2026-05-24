import { NextResponse } from "next/server";
import { adminDb } from "@/src/lib/firebase-admin";

// GET: List presensi dengan filter
export async function GET(request: Request) {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: "Firebase Admin SDK belum dikonfigurasi" },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const pertemuanId = searchParams.get("pertemuanId");
    const courseId = searchParams.get("courseId");
    const npm = searchParams.get("npm");
    const status = searchParams.get("status");

    let query: FirebaseFirestore.Query = adminDb.collection("presensi");

    if (pertemuanId) {
      query = query.where("pertemuanId", "==", pertemuanId);
    }
    if (courseId) {
      query = query.where("courseId", "==", courseId);
    }
    if (npm) {
      query = query.where("npm", "==", npm);
    }
    if (status) {
      query = query.where("status", "==", status);
    }

    const snapshot = await query.get();
    const presensi = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ data: presensi, total: presensi.length });
  } catch (error) {
    console.error("Error getting presensi:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data presensi" },
      { status: 500 }
    );
  }
}

// POST: Tambah presensi manual (by admin)
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
      courseId,
      pertemuanId,
      status: presensiStatus,
      mahasiswaName,
    } = body;

    if (!npm || !courseId || !pertemuanId) {
      return NextResponse.json(
        { error: "Field wajib tidak lengkap" },
        { status: 400 }
      );
    }

    // Cek duplicate
    const existingSnap = await adminDb
      .collection("presensi")
      .where("pertemuanId", "==", pertemuanId)
      .where("npm", "==", npm)
      .get();

    if (!existingSnap.empty) {
      return NextResponse.json(
        { error: "Mahasiswa sudah tercatat untuk pertemuan ini" },
        { status: 409 }
      );
    }

    const docRef = adminDb.collection("presensi").doc();
    await docRef.set({
      id: docRef.id,
      npm,
      mahasiswaName: mahasiswaName || "",
      mataKuliahId: courseId,
      courseId,
      pertemuanId,
      status: presensiStatus || "HADIR",
      scanMethod: "MANUAL",
      timestamp: new Date(),
      createdAt: new Date(),
    });

    return NextResponse.json(
      { message: "Presensi berhasil dicatat", id: docRef.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating presensi:", error);
    return NextResponse.json(
      { error: "Gagal mencatat presensi" },
      { status: 500 }
    );
  }
}
