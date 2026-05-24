import { NextResponse } from "next/server";
import { adminDb } from "@/src/lib/firebase-admin";

// PUT: Update pengumuman
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!adminDb) {
      return NextResponse.json({ error: "Firebase Admin SDK belum dikonfigurasi" }, { status: 503 });
    }

    const { id } = await params;
    const body = await request.json();

    await adminDb
      .collection("pengumuman")
      .doc(id)
      .update({
        ...body,
        updatedAt: new Date(),
      });

    return NextResponse.json({ message: "Pengumuman berhasil diupdate" });
  } catch (error) {
    console.error("Error updating pengumuman:", error);
    return NextResponse.json({ error: "Gagal mengupdate pengumuman" }, { status: 500 });
  }
}

// DELETE: Hapus pengumuman
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!adminDb) {
      return NextResponse.json({ error: "Firebase Admin SDK belum dikonfigurasi" }, { status: 503 });
    }

    const { id } = await params;
    await adminDb.collection("pengumuman").doc(id).delete();

    return NextResponse.json({ message: "Pengumuman berhasil dihapus" });
  } catch (error) {
    console.error("Error deleting pengumuman:", error);
    return NextResponse.json({ error: "Gagal menghapus pengumuman" }, { status: 500 });
  }
}

// PATCH: Toggle isActive
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!adminDb) {
      return NextResponse.json({ error: "Firebase Admin SDK belum dikonfigurasi" }, { status: 503 });
    }

    const { id } = await params;
    const { isActive } = await request.json();

    await adminDb
      .collection("pengumuman")
      .doc(id)
      .update({
        isActive,
        updatedAt: new Date(),
      });

    return NextResponse.json({ message: "Status pengumuman berhasil diupdate" });
  } catch (error) {
    console.error("Error toggling pengumuman:", error);
    return NextResponse.json({ error: "Gagal mengupdate status pengumuman" }, { status: 500 });
  }
}
