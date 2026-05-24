import { NextResponse } from "next/server";
import { adminDb } from "@/src/lib/firebase-admin";

// GET: Detail pertemuan + list presensi
export async function GET(
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
    const doc = await adminDb.collection("pertemuan").doc(id).get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: "Pertemuan tidak ditemukan" },
        { status: 404 }
      );
    }

    // Ambil presensi untuk pertemuan ini
    const presensiSnap = await adminDb
      .collection("presensi")
      .where("pertemuanId", "==", id)
      .get();

    const presensi = presensiSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    return NextResponse.json({
      data: {
        id: doc.id,
        ...doc.data(),
        presensi,
      },
    });
  } catch (error) {
    console.error("Error getting pertemuan:", error);
    return NextResponse.json(
      { error: "Gagal mengambil detail pertemuan" },
      { status: 500 }
    );
  }
}

// PUT: Update pertemuan
export async function PUT(
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
    const body = await request.json();

    await adminDb
      .collection("pertemuan")
      .doc(id)
      .update({
        ...body,
        updatedAt: new Date(),
      });

    return NextResponse.json({ message: "Pertemuan berhasil diupdate" });
  } catch (error) {
    console.error("Error updating pertemuan:", error);
    return NextResponse.json(
      { error: "Gagal mengupdate pertemuan" },
      { status: 500 }
    );
  }
}
