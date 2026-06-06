import { NextResponse } from "next/server";
import { adminDb } from "@/src/lib/firebase-admin";

// POST: Buat tagihan bulk untuk semua mahasiswa aktif
export async function POST(request: Request) {
  try {
    if (!adminDb) {
      return NextResponse.json({ error: "Firebase Admin SDK belum dikonfigurasi" }, { status: 503 });
    }

    const body = await request.json();
    const { judul, tipe, total, jatuhTempo, semester, tahunAjaran, diskon = 0, items } = body;

    if (!judul || !tipe || !total || !semester) {
      return NextResponse.json({ error: "Field wajib tidak lengkap (judul, tipe, total, semester)" }, { status: 400 });
    }

    // Ambil semua mahasiswa aktif
    const mahasiswaSnap = await adminDb
      .collection("mahasiswa")
      .where("status", "==", "AKTIF")
      .get();

    const batch = adminDb.batch();
    let count = 0;

    for (const mDoc of mahasiswaSnap.docs) {
      const docRef = adminDb.collection("mahasiswa").doc(mDoc.id).collection("tagihan").doc();
      batch.set(docRef, {
        id: docRef.id,
        npm: mDoc.id,
        judul,
        tipe,
        total: parseInt(total),
        status: "BELUM_LUNAS",
        isLunas: false,
        jatuhTempo: jatuhTempo ? new Date(jatuhTempo) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        tanggalBayar: null,
        paymentMethod: null,
        tahunAjaran: tahunAjaran || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
        semester: parseInt(semester),
        diskon: parseInt(diskon) || 0,
        items: items || [],
        createdAt: new Date(),
      });
      count++;
    }

    await batch.commit();

    return NextResponse.json({
      message: `${count} tagihan berhasil dibuat untuk mahasiswa aktif`,
      count,
    });
  } catch (error) {
    console.error("Error bulk tagihan:", error);
    return NextResponse.json({ error: "Gagal membuat tagihan bulk" }, { status: 500 });
  }
}
