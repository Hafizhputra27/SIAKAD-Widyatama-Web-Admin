import { NextResponse } from "next/server";
import { adminDb } from "@/src/lib/firebase-admin";
import type { MataKuliah } from "@/src/types";

// GET: List semua matkul dengan filter
export async function GET(request: Request) {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: "Firebase Admin SDK belum dikonfigurasi" },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const semester = searchParams.get("semester");
    const type = searchParams.get("type");
    const isActive = searchParams.get("isActive");
    const search = searchParams.get("search");

    let query: FirebaseFirestore.Query = adminDb.collection("courses");

    if (semester) {
      query = query.where("semester", "==", parseInt(semester));
    }
    if (type) {
      query = query.where("type", "==", type);
    }
    if (isActive !== null && isActive !== undefined && isActive !== "") {
      query = query.where("isActive", "==", isActive === "true");
    }

    const snapshot = await query.get();
    let matkul = snapshot.docs.map((doc) => ({
      code: doc.id,
      ...doc.data(),
    })) as (MataKuliah & { code: string; id?: string })[];

    if (search) {
      const q = search.toLowerCase();
      matkul = matkul.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.code.toLowerCase().includes(q) ||
          m.lecturer.toLowerCase().includes(q)
      );
    }

    return NextResponse.json({ data: matkul, total: matkul.length });
  } catch (error) {
    console.error("Error getting matkul:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data mata kuliah" },
      { status: 500 }
    );
  }
}

// POST: Buat matkul baru
export async function POST(request: Request) {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: "Firebase Admin SDK belum dikonfigurasi" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const {
      code,
      name,
      sks,
      semester,
      type,
      hari,
      jamMulai,
      jamSelesai,
      room,
      lecturerId,
      lecturer,
      totalAttendance,
      isActive,
    } = body;

    if (!code || !name || !sks || !semester || !type || !hari || !jamMulai || !room) {
      return NextResponse.json(
        { error: "Field wajib tidak lengkap" },
        { status: 400 }
      );
    }

    // Cek kode sudah ada
    const existingDoc = await adminDb.collection("courses").doc(code).get();
    if (existingDoc.exists) {
      return NextResponse.json(
        { error: `Mata kuliah dengan kode ${code} sudah ada` },
        { status: 409 }
      );
    }

    // Hitung jamSelesai otomatis dari SKS jika tidak disediakan
    const finalJamSelesai =
      jamSelesai || calculateJamSelesai(jamMulai, parseInt(sks));

    // Format jamDisplay untuk kompatibilitas Mobile App
    const jamDisplay = `${jamMulai} - ${finalJamSelesai} WIB`;

    const matkulData: Omit<MataKuliah, "code"> & { code: string } = {
      code,
      name,
      sks: parseInt(sks),
      type: type as "WAJIB" | "PILIHAN",
      semester: parseInt(semester),
      hari,
      jamMulai,
      jamSelesai: finalJamSelesai,
      jamDisplay, // Kompatibilitas Mobile App
      room,
      lecturerId: lecturerId || "",
      lecturer: lecturer || "",
      enrolledCount: 0,
      totalAttendance: parseInt(totalAttendance) || 14,
      isActive: isActive !== false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await adminDb.collection("courses").doc(code).set(matkulData);

    return NextResponse.json(
      { message: "Mata kuliah berhasil ditambahkan", data: { code, name } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating matkul:", error);
    return NextResponse.json(
      { error: "Gagal menambahkan mata kuliah" },
      { status: 500 }
    );
  }
}

function calculateJamSelesai(jamMulai: string, sks: number): string {
  const [hours, minutes] = jamMulai.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes + sks * 50;
  const endHours = Math.floor(totalMinutes / 60);
  const endMinutes = totalMinutes % 60;
  return `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`;
}
