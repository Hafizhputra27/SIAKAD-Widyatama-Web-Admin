import { NextResponse } from "next/server";
import { adminDb } from "@/src/lib/firebase-admin";

// POST: Enroll mahasiswa ke matkul (batch)
export async function POST(
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
    const { npms } = await request.json();

    if (!npms || !Array.isArray(npms) || npms.length === 0) {
      return NextResponse.json(
        { error: "Daftar NPM diperlukan" },
        { status: 400 }
      );
    }

    // Ambil semua pertemuan untuk matkul ini
    const pertemuanSnap = await adminDb
      .collection("pertemuan")
      .where("courseId", "==", code)
      .get();

    const batch = adminDb.batch();

    // Tambah NPM ke semua pertemuan
    pertemuanSnap.docs.forEach((doc) => {
      const currentEnrolled = doc.data().enrolledNpms || [];
      const newEnrolled = [...new Set([...currentEnrolled, ...npms])];
      batch.update(doc.ref, { enrolledNpms: newEnrolled });
    });

    // Update enrolledCount di courses
    const courseRef = adminDb.collection("courses").doc(code);
    const courseDoc = await courseRef.get();
    const currentCount = courseDoc.data()?.enrolledCount || 0;
    batch.update(courseRef, {
      enrolledCount: currentCount + npms.length,
      updatedAt: new Date(),
    });

    // Buat academic_result placeholder untuk setiap mahasiswa
    npms.forEach((npm: string) => {
      const academicRef = adminDb
        .collection("mahasiswa")
        .doc(npm)
        .collection("academic_results")
        .doc(code);
      batch.set(
        academicRef,
        {
          mataKuliahId: code,
          mataKuliahName: courseDoc.data()?.name || "",
          sks: courseDoc.data()?.sks || 0,
          nilaiAngka: 0,
          nilaiHuruf: "E",
          mutu: 0,
          semester: courseDoc.data()?.semester || 0,
          status: "TIDAK_LULUS",
          createdAt: new Date(),
        },
        { merge: true }
      );
    });

    await batch.commit();

    return NextResponse.json({
      message: `${npms.length} mahasiswa berhasil dienroll`,
      enrolledCount: currentCount + npms.length,
    });
  } catch (error) {
    console.error(`Error enrolling mahasiswa:`, error);
    return NextResponse.json(
      { error: "Gagal enroll mahasiswa" },
      { status: 500 }
    );
  }
}

// DELETE: Unenroll mahasiswa
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
    const { npm } = await request.json();

    if (!npm) {
      return NextResponse.json(
        { error: "NPM diperlukan" },
        { status: 400 }
      );
    }

    // Ambil semua pertemuan untuk matkul ini
    const pertemuanSnap = await adminDb
      .collection("pertemuan")
      .where("courseId", "==", code)
      .get();

    const batch = adminDb.batch();

    // Hapus NPM dari semua pertemuan
    pertemuanSnap.docs.forEach((doc) => {
      const currentEnrolled = doc.data().enrolledNpms || [];
      const newEnrolled = currentEnrolled.filter((n: string) => n !== npm);
      batch.update(doc.ref, { enrolledNpms: newEnrolled });
    });

    // Update enrolledCount di courses
    const courseRef = adminDb.collection("courses").doc(code);
    const courseDoc = await courseRef.get();
    const currentCount = courseDoc.data()?.enrolledCount || 0;
    const newCount = Math.max(0, currentCount - 1);
    batch.update(courseRef, {
      enrolledCount: newCount,
      updatedAt: new Date(),
    });

    // Hapus academic_result placeholder
    const academicRef = adminDb
      .collection("mahasiswa")
      .doc(npm)
      .collection("academic_results")
      .doc(code);
    batch.delete(academicRef);

    await batch.commit();

    return NextResponse.json({
      message: "Mahasiswa berhasil di-unenroll",
      enrolledCount: newCount,
    });
  } catch (error) {
    console.error(`Error unenrolling mahasiswa:`, error);
    return NextResponse.json(
      { error: "Gagal unenroll mahasiswa" },
      { status: 500 }
    );
  }
}
