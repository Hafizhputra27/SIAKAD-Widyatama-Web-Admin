import { NextResponse } from "next/server";
import { adminDb } from "@/src/lib/firebase-admin";

// GET: List pertemuan dengan filter
export async function GET(request: Request) {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: "Firebase Admin SDK belum dikonfigurasi" },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");
    const tanggal = searchParams.get("tanggal");

    let query: FirebaseFirestore.Query = adminDb.collection("pertemuan");

    if (courseId) {
      query = query.where("courseId", "==", courseId);
    }
    if (tanggal) {
      const date = new Date(tanggal);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      query = query.where("tanggal", ">=", date).where("tanggal", "<", nextDay);
    }

    const snapshot = await query.orderBy("nomorPertemuan").get();
    const pertemuan = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ data: pertemuan, total: pertemuan.length });
  } catch (error) {
    console.error("Error getting pertemuan:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data pertemuan" },
      { status: 500 }
    );
  }
}

// POST: Buat pertemuan baru
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
      courseId,
      courseName,
      nomorPertemuan,
      tanggal,
      jamMulai,
      jamSelesai,
      enrolledNpms = [],
    } = body;

    if (!courseId || !nomorPertemuan || !tanggal) {
      return NextResponse.json(
        { error: "Field wajib tidak lengkap" },
        { status: 400 }
      );
    }

    // Cek pertemuan dengan nomor yang sama untuk course ini
    const existingSnap = await adminDb
      .collection("pertemuan")
      .where("courseId", "==", courseId)
      .where("nomorPertemuan", "==", parseInt(nomorPertemuan))
      .get();

    if (!existingSnap.empty) {
      return NextResponse.json(
        { error: `Pertemuan ke-${nomorPertemuan} untuk matkul ini sudah ada` },
        { status: 409 }
      );
    }

    const docRef = adminDb.collection("pertemuan").doc();
    await docRef.set({
      id: docRef.id,
      courseId,
      courseName: courseName || "",
      nomorPertemuan: parseInt(nomorPertemuan),
      tanggal: new Date(tanggal),
      jamMulai: jamMulai || "",
      jamSelesai: jamSelesai || "",
      qrToken: "",
      qrExpiresAt: null,
      isQrActive: false,
      enrolledNpms,
      createdBy: "admin",
      createdAt: new Date(),
    });

    return NextResponse.json(
      { message: "Pertemuan berhasil dibuat", id: docRef.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating pertemuan:", error);
    return NextResponse.json(
      { error: "Gagal membuat pertemuan" },
      { status: 500 }
    );
  }
}
