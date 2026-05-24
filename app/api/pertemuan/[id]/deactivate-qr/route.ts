import { NextResponse } from "next/server";
import { adminDb } from "@/src/lib/firebase-admin";

// POST: Deactivate QR manual
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: "Firebase Admin SDK belum dikonfigurasi" },
        { status: 503 }
      );
    }

    const { id } = await params;

    await adminDb
      .collection("pertemuan")
      .doc(id)
      .update({
        isQrActive: false,
        qrExpiresAt: new Date(),
        updatedAt: new Date(),
      });

    return NextResponse.json({ message: "QR berhasil dinonaktifkan" });
  } catch (error) {
    console.error("Error deactivating QR:", error);
    return NextResponse.json(
      { error: "Gagal menonaktifkan QR" },
      { status: 500 }
    );
  }
}
