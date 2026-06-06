import { NextResponse } from "next/server";
import { adminDb } from "@/src/lib/firebase-admin";

// GET: Summary tagihan semua mahasiswa
export async function GET() {
  try {
    if (!adminDb) {
      return NextResponse.json({ error: "Firebase Admin SDK belum dikonfigurasi" }, { status: 503 });
    }

    // Aggregate tagihan dari semua mahasiswa
    const mahasiswaSnap = await adminDb.collection("mahasiswa").get();
    let totalLunas = 0;
    let totalBelumLunas = 0;
    let totalProses = 0;
    let totalNominal = 0;

    const tagihanList: Record<string, unknown>[] = [];

    for (const mDoc of mahasiswaSnap.docs) {
      const tagihanSnap = await adminDb
        .collection("mahasiswa")
        .doc(mDoc.id)
        .collection("tagihan")
        .get();

      tagihanSnap.docs.forEach((tDoc) => {
        const data = tDoc.data();
        const status = data.status as string;
        const total = data.total || 0;

        if (status === "LUNAS") totalLunas++;
        else if (status === "BELUM_LUNAS") totalBelumLunas++;
        else if (status === "PROSES") totalProses++;

        totalNominal += total;

        tagihanList.push({
          id: tDoc.id,
          npm: mDoc.id,
          mahasiswaName: mDoc.data().name,
          ...data,
        });
      });
    }

    return NextResponse.json({
      summary: { totalLunas, totalBelumLunas, totalProses, totalNominal },
      data: tagihanList,
    });
  } catch (error) {
    console.error("Error getting tagihan:", error);
    return NextResponse.json({ error: "Gagal mengambil data tagihan" }, { status: 500 });
  }
}

// POST: Buat tagihan baru untuk satu mahasiswa
export async function POST(request: Request) {
  try {
    if (!adminDb) {
      return NextResponse.json({ error: "Firebase Admin SDK belum dikonfigurasi" }, { status: 503 });
    }

    const body = await request.json();
    const {
      npm,
      judul,
      tipe,
      total,
      jatuhTempo,
      semester,
      tahunAjaran,
      diskon = 0,
      items,
    } = body;

    if (!npm || !judul || !tipe || !total || !semester) {
      return NextResponse.json({ error: "Field wajib tidak lengkap (npm, judul, tipe, total, semester)" }, { status: 400 });
    }

    const tagihanData = {
      npm,
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
      items: items || [], // optional array for web detail breakdown
      createdAt: new Date(),
    };

    const docRef = adminDb
      .collection("mahasiswa")
      .doc(npm)
      .collection("tagihan")
      .doc();

    await docRef.set({ ...tagihanData, id: docRef.id });

    return NextResponse.json(
      { message: "Tagihan berhasil dibuat", id: docRef.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating tagihan:", error);
    return NextResponse.json({ error: "Gagal membuat tagihan" }, { status: 500 });
  }
}
