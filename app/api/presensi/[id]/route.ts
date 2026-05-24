import { NextResponse } from "next/server";
import { adminDb } from "@/src/lib/firebase-admin";

// PUT: Update status presensi
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
    const { status } = await request.json();

    if (!status) {
      return NextResponse.json(
        { error: "Status diperlukan" },
        { status: 400 }
      );
    }

    await adminDb
      .collection("presensi")
      .doc(id)
      .update({
        status,
        updatedAt: new Date(),
      });

    return NextResponse.json({ message: "Status presensi berhasil diupdate" });
  } catch (error) {
    console.error("Error updating presensi:", error);
    return NextResponse.json(
      { error: "Gagal mengupdate presensi" },
      { status: 500 }
    );
  }
}

// DELETE: Hapus record presensi
export async function DELETE(
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
    await adminDb.collection("presensi").doc(id).delete();

    return NextResponse.json({ message: "Presensi berhasil dihapus" });
  } catch (error) {
    console.error("Error deleting presensi:", error);
    return NextResponse.json(
      { error: "Gagal menghapus presensi" },
      { status: 500 }
    );
  }
}
