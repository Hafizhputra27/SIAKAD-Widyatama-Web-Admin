import { NextResponse } from "next/server";
import { adminDb } from "@/src/lib/firebase-admin";

// POST: Buat tagihan bulk untuk semua mahasiswa aktif
export async function POST(request: Request) {
  try {
    if (!adminDb) {
      return NextResponse.json({ error: "Firebase Admin SDK belum dikonfigurasi" }, { status: 503 });
    }

    const body = await request.json();
    const { semester, items, jatuhTempo } = body;

    if (!semester || !items || !Array.isArray(items)) {
      return NextResponse.json({ error: "Field wajib tidak lengkap" }, { status: 400 });
    }

    // Hitung total
    const total = items.reduce((sum: number, item: { jumlah: number }) => sum + (item.jumlah || 0), 0);

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
        semester: parseInt(semester),
        tanggal: new Date(),
        jatuhTempo: jatuhTempo ? new Date(jatuhTempo) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        total,
        items,
        status: "BELUM_LUNAS",
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
