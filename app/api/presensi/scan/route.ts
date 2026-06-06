import { NextResponse } from "next/server";
import { adminDb } from "@/src/lib/firebase-admin";

// POST: Submit presensi via QR Scan (REST API)
export async function POST(request: Request) {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { success: false, error: "Firebase Admin SDK belum dikonfigurasi" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { token, courseId, pertemuanId, npm } = body;

    if (!token || !courseId || !pertemuanId || !npm) {
      return NextResponse.json(
        { success: false, error: "Field tidak lengkap" },
        { status: 400 }
      );
    }

    // STEP 1: Ambil dokumen pertemuan
    const pertemuanDoc = await adminDb.collection("pertemuan").doc(pertemuanId).get();
    if (!pertemuanDoc.exists) {
      return NextResponse.json(
        { success: false, error: "Pertemuan tidak ditemukan" },
        { status: 404 }
      );
    }

    const pertemuanData = pertemuanDoc.data()!;

    // VALIDASI 0: courseId dari payload cocok dengan pertemuan?
    if (pertemuanData.courseId !== courseId) {
      return NextResponse.json(
        { success: false, error: "courseId tidak cocok dengan pertemuan" },
        { status: 403 }
      );
    }

    // VALIDASI 1: QR masih aktif?
    if (!pertemuanData.isQrActive) {
      return NextResponse.json(
        { success: false, error: "QR Code sudah tidak aktif" },
        { status: 401 }
      );
    }

    // VALIDASI 2: Token cocok?
    if (pertemuanData.qrToken !== token) {
      return NextResponse.json(
        { success: false, error: "QR Code tidak valid atau sudah expired" },
        { status: 403 }
      );
    }

    // VALIDASI 3: QR belum expired?
    const now = new Date();
    const expiresAt = pertemuanData.qrExpiresAt?.toDate
      ? pertemuanData.qrExpiresAt.toDate()
      : new Date(pertemuanData.qrExpiresAt);
    if (now > expiresAt) {
      return NextResponse.json(
        { success: false, error: "QR Code sudah kedaluwarsa" },
        { status: 403 }
      );
    }

    // VALIDASI 4: Mahasiswa terdaftar?
    const enrolledNpms: string[] = pertemuanData.enrolledNpms || [];
    if (!enrolledNpms.includes(npm)) {
      return NextResponse.json(
        { success: false, error: "Anda tidak terdaftar di mata kuliah ini" },
        { status: 403 }
      );
    }

    // VALIDASI 5: Cek duplikat
    const duplicateSnap = await adminDb
      .collection("presensi")
      .where("pertemuanId", "==", pertemuanId)
      .where("npm", "==", npm)
      .get();

    if (!duplicateSnap.empty) {
      return NextResponse.json(
        { success: false, error: "Anda sudah tercatat hadir di pertemuan ini" },
        { status: 409 }
      );
    }

    // STEP 2: Ambil nama mahasiswa untuk denormalisasi
    const mhsDoc = await adminDb.collection("mahasiswa").doc(npm).get();
    const mahasiswaName = mhsDoc.exists ? mhsDoc.data()?.name || npm : npm;

    // STEP 3: Tulis presensi
    const presensiRef = adminDb.collection("presensi").doc();
    await presensiRef.set({
      id: presensiRef.id,
      npm,
      mahasiswaName,
      mataKuliahId: courseId,
      courseId,
      pertemuanId,
      status: "HADIR",
      scanMethod: "QR_SCAN",
      timestamp: new Date(),
      createdAt: new Date(),
    });

    // STEP 4: Increment attendance count di courses
    const courseRef = adminDb.collection("courses").doc(courseId);
    const courseDoc = await courseRef.get();
    if (courseDoc.exists) {
      const currentAttendance = courseDoc.data()?.attendance || 0;
      await courseRef.update({
        attendance: currentAttendance + 1,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Absensi berhasil dicatat",
      status: "HADIR",
      presensiId: presensiRef.id,
      mahasiswaName,
    });
  } catch (error) {
    console.error("Error scanning QR:", error);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
