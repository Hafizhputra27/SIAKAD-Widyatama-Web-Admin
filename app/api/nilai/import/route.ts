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

// POST: Import nilai dari CSV
export async function POST(request: Request) {
  try {
    if (!adminDb) {
      return NextResponse.json({ error: "Firebase Admin SDK belum dikonfigurasi" }, { status: 503 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split("\n").filter((line) => line.trim());
    const dataLines = lines.slice(1); // Skip header

    const results = { success: 0, failed: 0, errors: [] as string[] };
    const batch = adminDb.batch();

    for (let i = 0; i < dataLines.length; i++) {
      const cols = dataLines[i].split(",").map((c) => c.trim());
      if (cols.length < 3) {
        results.failed++;
        results.errors.push(`Baris ${i + 2}: Format tidak valid`);
        continue;
      }

      const [npm, mataKuliahId, nilaiAngkaStr, semesterStr] = cols;
      const nilaiAngka = parseFloat(nilaiAngkaStr);

      if (!npm || !mataKuliahId || isNaN(nilaiAngka)) {
        results.failed++;
        continue;
      }

      const nilaiHuruf = nilaiAngkaToHuruf(nilaiAngka);
      const mutu = nilaiHurufToMutu(nilaiHuruf);
      const status = nilaiHuruf !== "E" ? "LULUS" : "MENGULANG";

      const courseDoc = await adminDb.collection("courses").doc(mataKuliahId).get();
      const courseData = courseDoc.exists ? courseDoc.data() : null;

      const docRef = adminDb
        .collection("mahasiswa")
        .doc(npm)
        .collection("academic_results")
        .doc(mataKuliahId);

      batch.set(
        docRef,
        {
          mataKuliahId,
          mataKuliahName: courseData?.name || mataKuliahId,
          sks: courseData?.sks || 0,
          nilaiAngka,
          nilaiHuruf,
          mutu,
          semester: parseInt(semesterStr) || (courseData?.semester || 0),
          status,
          updatedAt: new Date(),
        },
        { merge: true }
      );

      results.success++;
    }

    await batch.commit();

    // Update IPK untuk semua
    const uniqueNpms = [...new Set(dataLines.map((l) => l.split(",")[0]?.trim()).filter(Boolean))];
    await Promise.all(uniqueNpms.map((npm) => updateIpk(npm)));

    return NextResponse.json({ message: "Import selesai", ...results });
  } catch (error) {
    console.error("Error importing nilai:", error);
    return NextResponse.json({ error: "Gagal mengimport nilai" }, { status: 500 });
  }
}
