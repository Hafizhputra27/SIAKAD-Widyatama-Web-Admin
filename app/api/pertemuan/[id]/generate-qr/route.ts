import { NextResponse } from "next/server";
import { adminDb } from "@/src/lib/firebase-admin";
import { randomUUID } from "crypto";

// POST: Generate/regenerate QR token
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
    const { durasiMenit = 15 } = await request.json();

    // Generate token UUID v4
    const token = randomUUID();

    // Hitung expiresAt
    const now = new Date();
    const expiresAt = new Date(now.getTime() + durasiMenit * 60 * 1000);
    const expiresAtUnix = Math.floor(expiresAt.getTime() / 1000);

    // Ambil data pertemuan untuk courseId
    const pertemuanDoc = await adminDb.collection("pertemuan").doc(id).get();
    if (!pertemuanDoc.exists) {
      return NextResponse.json(
        { error: "Pertemuan tidak ditemukan" },
        { status: 404 }
      );
    }

    const pertemuanData = pertemuanDoc.data();
    const courseId = pertemuanData?.courseId || "";

    // Update Firestore
    await adminDb
      .collection("pertemuan")
      .doc(id)
      .update({
        qrToken: token,
        qrExpiresAt: expiresAt,
        isQrActive: true,
        updatedAt: new Date(),
      });

    // Buat payload JSON untuk QR (ISO 8601 untuk mobile, Unix timestamp tetap di response)
    const payload = {
      token,
      courseId,
      pertemuanId: id,
      expiresAt: expiresAt.toISOString(),
    };

    const qrPayload = JSON.stringify(payload);

    return NextResponse.json({
      qrPayload,
      qrExpiresAt: expiresAt.toISOString(),
      expiresAtUnix,
      token,
    });
  } catch (error) {
    console.error("Error generating QR:", error);
    return NextResponse.json(
      { error: "Gagal generate QR" },
      { status: 500 }
    );
  }
}
