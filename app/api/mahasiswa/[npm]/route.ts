import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/src/lib/firebase-admin";
import { hashPassword } from "@/src/lib/password-utils";

// GET: Ambil data mahasiswa by NPM + subcollections
export async function GET(
  request: Request,
  { params }: { params: Promise<{ npm: string }> }
) {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: "Firebase Admin SDK belum dikonfigurasi" },
        { status: 503 }
      );
    }

    const { npm } = await params;
    const doc = await adminDb.collection("mahasiswa").doc(npm).get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: "Mahasiswa tidak ditemukan" },
        { status: 404 }
      );
    }

    // Ambil subcollections
    const [nilaiSnap, tagihanSnap, transkripSnap] = await Promise.all([
      adminDb.collection("mahasiswa").doc(npm).collection("academic_results").get(),
      adminDb.collection("mahasiswa").doc(npm).collection("tagihan").get(),
      adminDb.collection("mahasiswa").doc(npm).collection("transkrip").get(),
    ]);

    const mahasiswa = {
      npm: doc.id,
      ...doc.data(),
      academicResults: nilaiSnap.docs.map((d) => d.data()),
      tagihan: tagihanSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      transkrip: transkripSnap.docs.map((d) => d.data()),
    };

    return NextResponse.json({ data: mahasiswa });
  } catch (error) {
    console.error(`Error getting mahasiswa:`, error);
    return NextResponse.json(
      { error: "Gagal mengambil data mahasiswa" },
      { status: 500 }
    );
  }
}

// PUT: Update data mahasiswa
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ npm: string }> }
) {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: "Firebase Admin SDK belum dikonfigurasi" },
        { status: 503 }
      );
    }

    const { npm } = await params;
    const body = await request.json();

    // Jangan izinkan ubah NPM
    delete body.npm;
    delete body.passwordHash; // Password diubah via endpoint terpisah

    await adminDb
      .collection("mahasiswa")
      .doc(npm)
      .update({
        ...body,
        updatedAt: new Date(),
      });

    return NextResponse.json({ message: "Data mahasiswa berhasil diupdate" });
  } catch (error) {
    console.error(`Error updating mahasiswa:`, error);
    return NextResponse.json(
      { error: "Gagal mengupdate data mahasiswa" },
      { status: 500 }
    );
  }
}

// DELETE: Soft delete — set status NONAKTIF
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ npm: string }> }
) {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: "Firebase Admin SDK belum dikonfigurasi" },
        { status: 503 }
      );
    }

    const { npm } = await params;

    await adminDb
      .collection("mahasiswa")
      .doc(npm)
      .update({
        status: "NONAKTIF",
        updatedAt: new Date(),
      });

    return NextResponse.json({ message: "Mahasiswa berhasil dinonaktifkan" });
  } catch (error) {
    console.error(`Error deactivating mahasiswa:`, error);
    return NextResponse.json(
      { error: "Gagal menonaktifkan mahasiswa" },
      { status: 500 }
    );
  }
}
