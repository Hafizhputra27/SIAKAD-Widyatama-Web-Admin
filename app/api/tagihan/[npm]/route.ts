import { NextResponse } from "next/server";
import { adminDb } from "@/src/lib/firebase-admin";

// GET: Semua tagihan mahasiswa tertentu
export async function GET(
  request: Request,
  { params }: { params: Promise<{ npm: string }> }
) {
  try {
    if (!adminDb) {
      return NextResponse.json({ error: "Firebase Admin SDK belum dikonfigurasi" }, { status: 503 });
    }

    const { npm } = await params;
    const snapshot = await adminDb
      .collection("mahasiswa")
      .doc(npm)
      .collection("tagihan")
      .get();

    const tagihan = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ data: tagihan });
  } catch (error) {
    console.error("Error getting tagihan:", error);
    return NextResponse.json({ error: "Gagal mengambil tagihan" }, { status: 500 });
  }
}

// POST: Buat tagihan baru untuk mahasiswa ini
export async function POST(
  request: Request,
  { params }: { params: Promise<{ npm: string }> }
) {
  try {
    if (!adminDb) {
      return NextResponse.json({ error: "Firebase Admin SDK belum dikonfigurasi" }, { status: 503 });
    }

    const { npm } = await params;
    const body = await request.json();
    const { semester, items, jatuhTempo, total } = body;

    const tagihanData = {
      semester: parseInt(semester),
      tanggal: new Date(),
      jatuhTempo: jatuhTempo ? new Date(jatuhTempo) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      total: total || items.reduce((sum: number, item: { jumlah: number }) => sum + (item.jumlah || 0), 0),
      items,
      status: "BELUM_LUNAS",
      createdAt: new Date(),
    };

    const docRef = adminDb.collection("mahasiswa").doc(npm).collection("tagihan").doc();
    await docRef.set({ ...tagihanData, id: docRef.id });

    return NextResponse.json({ message: "Tagihan berhasil dibuat", id: docRef.id }, { status: 201 });
  } catch (error) {
    console.error("Error creating tagihan:", error);
    return NextResponse.json({ error: "Gagal membuat tagihan" }, { status: 500 });
  }
}
