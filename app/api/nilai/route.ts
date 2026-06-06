import { NextResponse } from "next/server";
import { adminDb } from "@/src/lib/firebase-admin";

// Helper functions
function nilaiAngkaToHuruf(nilai: number): "A" | "B" | "C" | "D" | "E" {
  if (nilai >= 85) return "A";
  if (nilai >= 70) return "B";
  if (nilai >= 55) return "C";
  if (nilai >= 40) return "D";
  return "E";
}

function nilaiHurufToMutu(huruf: string): number {
  const map: Record<string, number> = { A: 4.0, B: 3.0, C: 2.0, D: 1.0, E: 0.0 };
  return map[huruf] ?? 0.0;
}

async function updateIpk(npm: string) {
  const snapshot = await adminDb
    .collection("mahasiswa")
    .doc(npm)
    .collection("academic_results")
    .get();

  let totalSks = 0;
  let totalMutu = 0;

  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    if (data.status === "LULUS") {
      totalSks += data.sks || 0;
      totalMutu += (data.sks || 0) * (data.mutu || 0);
    }
  });

  const ipk = totalSks > 0 ? totalMutu / totalSks : 0;

  await adminDb.collection("mahasiswa").doc(npm).update({
    ipkKumulatif: parseFloat(ipk.toFixed(2)),
    totalSksLulus: totalSks,
    updatedAt: new Date(),
  });
}

// GET: List nilai dengan filter
export async function GET(request: Request) {
  try {
    if (!adminDb) {
      return NextResponse.json({ error: "Firebase Admin SDK belum dikonfigurasi" }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const npm = searchParams.get("npm");
    const courseId = searchParams.get("courseId");
    const semester = searchParams.get("semester");

    if (npm) {
      // Ambil semua nilai mahasiswa
      const snapshot = await adminDb
        .collection("mahasiswa")
        .doc(npm)
        .collection("academic_results")
        .get();
      const nilai = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      return NextResponse.json({ data: nilai });
    }

    if (courseId) {
      // Ambil semua nilai untuk mata kuliah ini (scan semua mahasiswa)
      const mahasiswaSnap = await adminDb.collection("mahasiswa").get();
      const allNilai: Record<string, unknown>[] = [];

      for (const mDoc of mahasiswaSnap.docs) {
        const nDoc = await adminDb
          .collection("mahasiswa")
          .doc(mDoc.id)
          .collection("academic_results")
          .doc(courseId)
          .get();
        if (nDoc.exists) {
          allNilai.push({
            npm: mDoc.id,
            mahasiswaName: mDoc.data().name,
            ...nDoc.data(),
          });
        }
      }
      return NextResponse.json({ data: allNilai });
    }

    return NextResponse.json({ data: [] });
  } catch (error) {
    console.error("Error getting nilai:", error);
    return NextResponse.json({ error: "Gagal mengambil data nilai" }, { status: 500 });
  }
}

// POST: Input/update nilai
export async function POST(request: Request) {
  try {
    if (!adminDb) {
      return NextResponse.json({ error: "Firebase Admin SDK belum dikonfigurasi" }, { status: 503 });
    }

    const body = await request.json();
    const { npm, mataKuliahId, nilaiAngka, semester } = body;

    if (!npm || !mataKuliahId || nilaiAngka === undefined) {
      return NextResponse.json({ error: "Field wajib tidak lengkap" }, { status: 400 });
    }

    // Hitung nilai huruf, mutu, status
    const nilaiHuruf = nilaiAngkaToHuruf(parseFloat(nilaiAngka));
    const mutu = nilaiHurufToMutu(nilaiHuruf);
    const status = nilaiHuruf !== "E" ? "LULUS" : "TIDAK_LULUS";

    // Ambil info mata kuliah
    const courseDoc = await adminDb.collection("courses").doc(mataKuliahId).get();
    const courseData = courseDoc.exists ? courseDoc.data() : null;

    const nilaiData = {
      mataKuliahId,
      mataKuliahName: courseData?.name || mataKuliahId,
      sks: courseData?.sks || 0,
      nilaiAngka: parseFloat(nilaiAngka),
      nilaiHuruf,
      mutu,
      semester: parseInt(semester) || (courseData?.semester || 0),
      status,
      updatedAt: new Date(),
    };

    // Upsert ke academic_results
    const docRef = adminDb
      .collection("mahasiswa")
      .doc(npm)
      .collection("academic_results")
      .doc(mataKuliahId);

    await docRef.set(nilaiData, { merge: true });

    // Hitung ulang IPK
    await updateIpk(npm);

    return NextResponse.json({
      message: "Nilai berhasil disimpan",
      data: { nilaiHuruf, mutu, status },
    });
  } catch (error) {
    console.error("Error saving nilai:", error);
    return NextResponse.json({ error: "Gagal menyimpan nilai" }, { status: 500 });
  }
}
