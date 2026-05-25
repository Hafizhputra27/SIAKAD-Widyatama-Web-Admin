import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/src/lib/firebase-admin";

interface RouteParams {
  params: Promise<{ nidn: string }>;
}

// GET: Ambil detail dosen berdasarkan NIDN
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: "Firebase Admin SDK belum dikonfigurasi" },
        { status: 503 }
      );
    }

    const { nidn } = await params;
    const docRef = adminDb.collection("lecturers").doc(nidn);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json(
        { error: "Dosen tidak ditemukan" },
        { status: 404 }
      );
    }

    const data = docSnap.data();

    return NextResponse.json({
      data: {
        nidn: docSnap.id,
        ...data,
      },
    });
  } catch (error) {
    console.error("Error getting dosen detail:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data dosen" },
      { status: 500 }
    );
  }
}

// PUT: Update dosen berdasarkan NIDN
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: "Firebase Admin SDK belum dikonfigurasi" },
        { status: 503 }
      );
    }

    const { nidn } = await params;
    const body = await request.json();
    const { name, title, email, department } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: "Nama dan email wajib diisi" },
        { status: 400 }
      );
    }

    const docRef = adminDb.collection("lecturers").doc(nidn);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json(
        { error: "Dosen tidak ditemukan" },
        { status: 404 }
      );
    }

    const updateData = {
      name,
      title: title || "",
      email,
      department: department || "",
      updatedAt: new Date().toISOString(),
    };

    await docRef.update(updateData);

    return NextResponse.json({
      message: "Dosen berhasil diperbarui",
      data: {
        nidn,
        ...updateData,
      },
    });
  } catch (error) {
    console.error("Error updating dosen:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui dosen" },
      { status: 500 }
    );
  }
}

// DELETE: Hapus dosen berdasarkan NIDN
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: "Firebase Admin SDK belum dikonfigurasi" },
        { status: 503 }
      );
    }

    const { nidn } = await params;
    const docRef = adminDb.collection("lecturers").doc(nidn);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json(
        { error: "Dosen tidak ditemukan" },
        { status: 404 }
      );
    }

    await docRef.delete();

    return NextResponse.json({
      message: "Dosen berhasil dihapus",
    });
  } catch (error) {
    console.error("Error deleting dosen:", error);
    return NextResponse.json(
      { error: "Gagal menghapus dosen" },
      { status: 500 }
    );
  }
}
