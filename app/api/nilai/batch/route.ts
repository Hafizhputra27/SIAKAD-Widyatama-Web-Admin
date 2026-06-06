import { NextResponse } from "next/server";
import { adminDb } from "@/src/lib/firebase-admin";

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

// POST: Input nilai batch untuk satu mata kuliah
export async function POST(request: Request) {
  try {
    if (!adminDb) {
      return NextResponse.json({ error: "Firebase Admin SDK belum dikonfigurasi" }, { status: 503 });
    }

    const body = await request.json();
    const { courseId, semester, nilaiList } = body;

    if (!courseId || !nilaiList || !Array.isArray(nilaiList)) {
      return NextResponse.json({ error: "Field wajib tidak lengkap" }, { status: 400 });
    }

    // Ambil info mata kuliah
    const courseDoc = await adminDb.collection("courses").doc(courseId).get();
    const courseData = courseDoc.exists ? courseDoc.data() : null;

    const batch = adminDb.batch();
    const updatedNpms: string[] = [];

    for (const item of nilaiList) {
      const { npm, nilaiAngka } = item;
      if (!npm || nilaiAngka === undefined) continue;

      const nilaiHuruf = nilaiAngkaToHuruf(parseFloat(nilaiAngka));
      const mutu = nilaiHurufToMutu(nilaiHuruf);
      const status = nilaiHuruf !== "E" ? "LULUS" : "TIDAK_LULUS";

      const docRef = adminDb
        .collection("mahasiswa")
        .doc(npm)
        .collection("academic_results")
        .doc(courseId);

      batch.set(
        docRef,
        {
          mataKuliahId: courseId,
          mataKuliahName: courseData?.name || courseId,
          sks: courseData?.sks || 0,
          nilaiAngka: parseFloat(nilaiAngka),
          nilaiHuruf,
          mutu,
          semester: parseInt(semester) || (courseData?.semester || 0),
          status,
          updatedAt: new Date(),
        },
        { merge: true }
      );

      updatedNpms.push(npm);
    }

    await batch.commit();

    // Update IPK untuk semua mahasiswa yang diupdate
    await Promise.all(updatedNpms.map((npm) => updateIpk(npm)));

    return NextResponse.json({
      message: `${nilaiList.length} nilai berhasil disimpan`,
    });
  } catch (error) {
    console.error("Error batch nilai:", error);
    return NextResponse.json({ error: "Gagal menyimpan nilai batch" }, { status: 500 });
  }
}
