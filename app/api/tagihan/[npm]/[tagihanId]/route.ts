import { NextResponse } from "next/server";
import { adminDb } from "@/src/lib/firebase-admin";

// PUT: Update status tagihan
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ npm: string; tagihanId: string }> }
) {
  try {
    if (!adminDb) {
      return NextResponse.json({ error: "Firebase Admin SDK belum dikonfigurasi" }, { status: 503 });
    }

    const { npm, tagihanId } = await params;
    const { status, paymentMethod, paymentDate } = await request.json();

    const updates: Record<string, unknown> = { status, updatedAt: new Date() };
    if (paymentMethod) updates.paymentMethod = paymentMethod;
    if (paymentDate) updates.paymentDate = new Date(paymentDate);

    await adminDb
      .collection("mahasiswa")
      .doc(npm)
      .collection("tagihan")
      .doc(tagihanId)
      .update(updates);

    return NextResponse.json({ message: "Status tagihan berhasil diupdate" });
  } catch (error) {
    console.error("Error updating tagihan:", error);
    return NextResponse.json({ error: "Gagal mengupdate tagihan" }, { status: 500 });
  }
}
