import { NextResponse } from "next/server";
import { adminDb } from "@/src/lib/firebase-admin";

// PUT: Update data ruangan
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
    const { roomName, building, floor } = body;

    // Validasi input
    if (!roomName || !building || floor === undefined) {
      return NextResponse.json(
        { error: "Semua field wajib diisi (roomName, building, floor)" },
        { status: 400 }
      );
    }

    const floorNum = Number(floor);
    if (isNaN(floorNum)) {
      return NextResponse.json(
        { error: "Lantai harus berupa angka" },
        { status: 400 }
      );
    }

    // Update di Firestore
    await adminDb
      .collection("rooms")
      .doc(id)
      .update({
        roomName,
        building,
        floor: floorNum,
      });

    return NextResponse.json({ message: "Ruangan berhasil diupdate" });
  } catch (error) {
    console.error("Error updating room:", error);
    return NextResponse.json(
      { error: "Gagal mengupdate ruangan" },
      { status: 500 }
    );
  }
}

// DELETE: Hapus ruangan dari database
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

    // Hapus dokumen di Firestore
    await adminDb.collection("rooms").doc(id).delete();

    return NextResponse.json({ message: "Ruangan berhasil dihapus" });
  } catch (error) {
    console.error("Error deleting room:", error);
    return NextResponse.json(
      { error: "Gagal menghapus ruangan" },
      { status: 500 }
    );
  }
}
