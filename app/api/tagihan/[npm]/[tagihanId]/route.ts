import { NextResponse } from "next/server";
import { adminDb } from "@/src/lib/firebase-admin";

// PUT: Update tagihan (status, payment, etc.)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ npm: string; tagihanId: string }> }
) {
  try {
    if (!adminDb) {
      return NextResponse.json({ error: "Firebase Admin SDK belum dikonfigurasi" }, { status: 503 });
    }

    const { npm, tagihanId } = await params;
    const {
      status,
      isLunas,
      paymentMethod,
      tanggalBayar,
      diskon,
    } = await request.json();

    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (status !== undefined) updates.status = status;
    if (isLunas !== undefined) updates.isLunas = isLunas;
    if (paymentMethod !== undefined) updates.paymentMethod = paymentMethod;
    if (tanggalBayar !== undefined) updates.tanggalBayar = tanggalBayar ? new Date(tanggalBayar) : null;
    if (diskon !== undefined) updates.diskon = parseInt(diskon) || 0;

    // Auto-update isLunas berdasarkan status
    if (status === "LUNAS") updates.isLunas = true;
    if (status === "BELUM_LUNAS") updates.isLunas = false;

    await adminDb
      .collection("mahasiswa")
      .doc(npm)
      .collection("tagihan")
      .doc(tagihanId)
      .update(updates);

    return NextResponse.json({ message: "Tagihan berhasil diupdate" });
  } catch (error) {
    console.error("Error updating tagihan:", error);
    return NextResponse.json({ error: "Gagal mengupdate tagihan" }, { status: 500 });
  }
}
