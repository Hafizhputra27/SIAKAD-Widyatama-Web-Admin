import { NextResponse } from "next/server";
import { adminDb } from "@/src/lib/firebase-admin";

// GET: Detail matkul + daftar mahasiswa enrolled
export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: "Firebase Admin SDK belum dikonfigurasi" },
        { status: 503 }
      );
    }

    const { code } = await params;
    const doc = await adminDb.collection("courses").doc(code).get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: "Mata kuliah tidak ditemukan" },
        { status: 404 }
      );
    }

    const matkulData = doc.data();

    // Ambil daftar pertemuan untuk dapatkan enrolledNpms
    const pertemuanSnap = await adminDb
      .collection("pertemuan")
      .where("courseId", "==", code)
      .limit(1)
      .get();

    let enrolledNpms: string[] = [];
    if (!pertemuanSnap.empty) {
      enrolledNpms = pertemuanSnap.docs[0].data().enrolledNpms || [];
    }

    // Ambil detail mahasiswa yang enrolled
    const enrolledMahasiswa = [] as Record<string, unknown>[];
    if (enrolledNpms.length > 0) {
      // Firestore tidak mendukung IN query dengan >10 items di free tier
      // Jadi kita ambil per batch
      const batches = [] as Promise<void>[];
      for (let i = 0; i < enrolledNpms.length; i += 10) {
        const batch = enrolledNpms.slice(i, i + 10);
        const query = adminDb
          .collection("mahasiswa")
          .where("npm", "in", batch)
          .get();
        batches.push(
          query.then((snap) => {
            snap.docs.forEach((d) => {
              enrolledMahasiswa.push({ npm: d.id, ...d.data() });
            });
          })
        );
      }
      await Promise.all(batches);
    }

    return NextResponse.json({
      data: {
        code: doc.id,
        ...matkulData,
        enrolledMahasiswa,
        enrolledCount: enrolledMahasiswa.length,
      },
    });
  } catch (error) {
    console.error(`Error getting matkul:`, error);
    return NextResponse.json(
      { error: "Gagal mengambil detail mata kuliah" },
      { status: 500 }
    );
  }
}

// PUT: Update matkul
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: "Firebase Admin SDK belum dikonfigurasi" },
        { status: 503 }
      );
    }

    const { code } = await params;
    const body = await request.json();

    // Jangan izinkan ubah code
    delete body.code;

    // Update jamDisplay jika jam berubah
    if (body.jamMulai && body.jamSelesai) {
      body.jamDisplay = `${body.jamMulai} - ${body.jamSelesai} WIB`;
    }

    await adminDb
      .collection("courses")
      .doc(code)
      .update({
        ...body,
        updatedAt: new Date(),
      });

    return NextResponse.json({ message: "Mata kuliah berhasil diupdate" });
  } catch (error) {
    console.error(`Error updating matkul:`, error);
    return NextResponse.json(
      { error: "Gagal mengupdate mata kuliah" },
      { status: 500 }
    );
  }
}

// DELETE: Soft delete (isActive: false)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: "Firebase Admin SDK belum dikonfigurasi" },
        { status: 503 }
      );
    }

    const { code } = await params;

    await adminDb.collection("courses").doc(code).update({
      isActive: false,
      updatedAt: new Date(),
    });

    return NextResponse.json({ message: "Mata kuliah berhasil dinonaktifkan" });
  } catch (error) {
    console.error(`Error deactivating matkul:`, error);
    return NextResponse.json(
      { error: "Gagal menonaktifkan mata kuliah" },
      { status: 500 }
    );
  }
}
