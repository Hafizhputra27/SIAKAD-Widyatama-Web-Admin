import { adminDb } from "@/src/lib/firebase-admin";
import {
  Mahasiswa,
  MataKuliah,
  Pertemuan,
  Presensi,
  AcademicResult,
  Tagihan,
  Pengumuman,
} from "@/src/types";

// ========== MAHASISWA ==========

export async function getAllMahasiswa(): Promise<Mahasiswa[]> {
  try {
    const snapshot = await adminDb.collection("mahasiswa").get();
    return snapshot.docs.map((doc) => ({
      npm: doc.id,
      ...doc.data(),
    })) as Mahasiswa[];
  } catch (error) {
    console.error("Error getting all mahasiswa:", error);
    throw new Error("Failed to get mahasiswa");
  }
}

export async function getMahasiswaByNpm(npm: string): Promise<Mahasiswa | null> {
  try {
    const doc = await adminDb.collection("mahasiswa").doc(npm).get();
    if (!doc.exists) return null;
    return { npm: doc.id, ...doc.data() } as Mahasiswa;
  } catch (error) {
    console.error(`Error getting mahasiswa ${npm}:`, error);
    throw new Error("Failed to get mahasiswa");
  }
}

export type CreateMahasiswaInput = Omit<Mahasiswa, "npm"> & { npm: string };

export async function createMahasiswa(data: CreateMahasiswaInput): Promise<void> {
  try {
    await adminDb
      .collection("mahasiswa")
      .doc(data.npm)
      .set({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
  } catch (error) {
    console.error("Error creating mahasiswa:", error);
    throw new Error("Failed to create mahasiswa");
  }
}

export async function updateMahasiswa(
  npm: string,
  data: Partial<Mahasiswa>
): Promise<void> {
  try {
    await adminDb
      .collection("mahasiswa")
      .doc(npm)
      .update({
        ...data,
        updatedAt: new Date(),
      });
  } catch (error) {
    console.error(`Error updating mahasiswa ${npm}:`, error);
    throw new Error("Failed to update mahasiswa");
  }
}

export async function deleteMahasiswa(npm: string): Promise<void> {
  try {
    await adminDb.collection("mahasiswa").doc(npm).delete();
  } catch (error) {
    console.error(`Error deleting mahasiswa ${npm}:`, error);
    throw new Error("Failed to delete mahasiswa");
  }
}

export async function searchMahasiswa(query: string): Promise<Mahasiswa[]> {
  try {
    const snapshot = await adminDb.collection("mahasiswa").get();
    const q = query.toLowerCase();
    return snapshot.docs
      .map((doc) => ({ npm: doc.id, ...doc.data() }) as Mahasiswa)
      .filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.npm.includes(q) ||
          m.major.toLowerCase().includes(q)
      );
  } catch (error) {
    console.error("Error searching mahasiswa:", error);
    throw new Error("Failed to search mahasiswa");
  }
}

// ========== MATA KULIAH ==========

export async function getAllMataKuliah(): Promise<MataKuliah[]> {
  try {
    const snapshot = await adminDb.collection("courses").get();
    return snapshot.docs.map((doc) => ({
      code: doc.id,
      ...doc.data(),
    })) as MataKuliah[];
  } catch (error) {
    console.error("Error getting all mata kuliah:", error);
    throw new Error("Failed to get mata kuliah");
  }
}

export async function getMataKuliahByCode(code: string): Promise<MataKuliah | null> {
  try {
    const doc = await adminDb.collection("courses").doc(code).get();
    if (!doc.exists) return null;
    return { code: doc.id, ...doc.data() } as MataKuliah;
  } catch (error) {
    console.error(`Error getting mata kuliah ${code}:`, error);
    throw new Error("Failed to get mata kuliah");
  }
}

export async function createMataKuliah(data: MataKuliah): Promise<void> {
  try {
    await adminDb
      .collection("courses")
      .doc(data.code)
      .set({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
  } catch (error) {
    console.error("Error creating mata kuliah:", error);
    throw new Error("Failed to create mata kuliah");
  }
}

export async function updateMataKuliah(
  code: string,
  data: Partial<MataKuliah>
): Promise<void> {
  try {
    await adminDb
      .collection("courses")
      .doc(code)
      .update({
        ...data,
        updatedAt: new Date(),
      });
  } catch (error) {
    console.error(`Error updating mata kuliah ${code}:`, error);
    throw new Error("Failed to update mata kuliah");
  }
}

// ========== PERTEMUAN & QR ==========

export type CreatePertemuanInput = Omit<Pertemuan, "id">;

export async function createPertemuan(data: CreatePertemuanInput): Promise<string> {
  try {
    const docRef = adminDb.collection("pertemuan").doc();
    await docRef.set({
      ...data,
      id: docRef.id,
      createdAt: new Date(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error creating pertemuan:", error);
    throw new Error("Failed to create pertemuan");
  }
}

export async function getPertemuanByCourse(courseId: string): Promise<Pertemuan[]> {
  try {
    const snapshot = await adminDb
      .collection("pertemuan")
      .where("courseId", "==", courseId)
      .orderBy("nomorPertemuan")
      .get();
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Pertemuan[];
  } catch (error) {
    console.error(`Error getting pertemuan for course ${courseId}:`, error);
    throw new Error("Failed to get pertemuan");
  }
}

export async function generateQrToken(
  pertemuanId: string,
  durasiMenit: number
): Promise<string> {
  try {
    const token = `${pertemuanId}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    const expiresAt = new Date(Date.now() + durasiMenit * 60 * 1000);

    await adminDb.collection("pertemuan").doc(pertemuanId).update({
      qrToken: token,
      qrExpiresAt: expiresAt,
      isQrActive: true,
      updatedAt: new Date(),
    });

    return token;
  } catch (error) {
    console.error(`Error generating QR token for ${pertemuanId}:`, error);
    throw new Error("Failed to generate QR token");
  }
}

export async function deactivateQr(pertemuanId: string): Promise<void> {
  try {
    await adminDb.collection("pertemuan").doc(pertemuanId).update({
      isQrActive: false,
      qrExpiresAt: new Date(),
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error(`Error deactivating QR for ${pertemuanId}:`, error);
    throw new Error("Failed to deactivate QR");
  }
}

// ========== PRESENSI ==========

export async function getPresensiByPertemuan(pertemuanId: string): Promise<Presensi[]> {
  try {
    const snapshot = await adminDb
      .collection("presensi")
      .where("pertemuanId", "==", pertemuanId)
      .get();
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Presensi[];
  } catch (error) {
    console.error(`Error getting presensi for pertemuan ${pertemuanId}:`, error);
    throw new Error("Failed to get presensi");
  }
}

export async function getPresensiByMahasiswa(
  npm: string,
  courseId?: string
): Promise<Presensi[]> {
  try {
    let query = adminDb.collection("presensi").where("npm", "==", npm);
    if (courseId) {
      query = query.where("courseId", "==", courseId);
    }
    const snapshot = await query.get();
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Presensi[];
  } catch (error) {
    console.error(`Error getting presensi for mahasiswa ${npm}:`, error);
    throw new Error("Failed to get presensi");
  }
}

export async function updateStatusPresensi(
  presensiId: string,
  status: Presensi["status"]
): Promise<void> {
  try {
    await adminDb.collection("presensi").doc(presensiId).update({
      status,
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error(`Error updating presensi ${presensiId}:`, error);
    throw new Error("Failed to update presensi");
  }
}

export async function createPresensiManual(data: Omit<Presensi, "id">): Promise<void> {
  try {
    const docRef = adminDb.collection("presensi").doc();
    await docRef.set({
      ...data,
      id: docRef.id,
      scanMethod: "MANUAL",
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Error creating presensi:", error);
    throw new Error("Failed to create presensi");
  }
}

// ========== NILAI ==========

export async function getNilaiMahasiswa(
  npm: string,
  semester?: number
): Promise<AcademicResult[]> {
  try {
    let query = adminDb
      .collection("mahasiswa")
      .doc(npm)
      .collection("academic_results");
    if (semester) {
      query = query.where("semester", "==", semester) as typeof query;
    }
    const snapshot = await query.get();
    return snapshot.docs.map((doc) => doc.data() as AcademicResult);
  } catch (error) {
    console.error(`Error getting nilai for ${npm}:`, error);
    throw new Error("Failed to get nilai");
  }
}

export async function upsertNilai(npm: string, data: AcademicResult): Promise<void> {
  try {
    const docRef = adminDb
      .collection("mahasiswa")
      .doc(npm)
      .collection("academic_results")
      .doc(data.mataKuliahId);
    await docRef.set(data, { merge: true });
    await updateIpk(npm);
  } catch (error) {
    console.error(`Error upserting nilai for ${npm}:`, error);
    throw new Error("Failed to upsert nilai");
  }
}

export async function updateIpk(npm: string): Promise<void> {
  try {
    const snapshot = await adminDb
      .collection("mahasiswa")
      .doc(npm)
      .collection("academic_results")
      .get();

    let totalSks = 0;
    let totalMutu = 0;

    snapshot.docs.forEach((doc) => {
      const data = doc.data() as AcademicResult;
      totalSks += data.sks;
      totalMutu += data.sks * data.mutu;
    });

    const ipk = totalSks > 0 ? totalMutu / totalSks : 0;

    await adminDb.collection("mahasiswa").doc(npm).update({
      ipkKumulatif: parseFloat(ipk.toFixed(2)),
      totalSksLulus: totalSks,
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error(`Error updating IPK for ${npm}:`, error);
    throw new Error("Failed to update IPK");
  }
}

// ========== TAGIHAN ==========

export async function getTagihanMahasiswa(npm: string): Promise<Tagihan[]> {
  try {
    const snapshot = await adminDb
      .collection("mahasiswa")
      .doc(npm)
      .collection("tagihan")
      .get();
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Tagihan[];
  } catch (error) {
    console.error(`Error getting tagihan for ${npm}:`, error);
    throw new Error("Failed to get tagihan");
  }
}

export async function createTagihan(
  npm: string,
  data: Omit<Tagihan, "id">
): Promise<void> {
  try {
    const docRef = adminDb
      .collection("mahasiswa")
      .doc(npm)
      .collection("tagihan")
      .doc();
    await docRef.set({
      ...data,
      id: docRef.id,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error(`Error creating tagihan for ${npm}:`, error);
    throw new Error("Failed to create tagihan");
  }
}

export async function updateStatusTagihan(
  npm: string,
  tagihanId: string,
  status: Tagihan["status"]
): Promise<void> {
  try {
    await adminDb
      .collection("mahasiswa")
      .doc(npm)
      .collection("tagihan")
      .doc(tagihanId)
      .update({
        status,
        updatedAt: new Date(),
      });
  } catch (error) {
    console.error(`Error updating tagihan ${tagihanId}:`, error);
    throw new Error("Failed to update tagihan");
  }
}

// ========== PENGUMUMAN ==========

export async function getAllPengumuman(): Promise<Pengumuman[]> {
  try {
    const snapshot = await adminDb
      .collection("pengumuman")
      .orderBy("createdAt", "desc")
      .get();
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Pengumuman[];
  } catch (error) {
    console.error("Error getting all pengumuman:", error);
    throw new Error("Failed to get pengumuman");
  }
}

export async function createPengumuman(data: Omit<Pengumuman, "id">): Promise<void> {
  try {
    const docRef = adminDb.collection("pengumuman").doc();
    await docRef.set({
      ...data,
      id: docRef.id,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("Error creating pengumuman:", error);
    throw new Error("Failed to create pengumuman");
  }
}

export async function updatePengumuman(
  id: string,
  data: Partial<Pengumuman>
): Promise<void> {
  try {
    await adminDb
      .collection("pengumuman")
      .doc(id)
      .update({
        ...data,
        updatedAt: new Date(),
      });
  } catch (error) {
    console.error(`Error updating pengumuman ${id}:`, error);
    throw new Error("Failed to update pengumuman");
  }
}

export async function deletePengumuman(id: string): Promise<void> {
  try {
    await adminDb.collection("pengumuman").doc(id).delete();
  } catch (error) {
    console.error(`Error deleting pengumuman ${id}:`, error);
    throw new Error("Failed to delete pengumuman");
  }
}
