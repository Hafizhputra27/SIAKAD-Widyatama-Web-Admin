import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/src/lib/firebase-admin";
import { hashPassword } from "@/src/lib/password-utils";

// GET: List semua dosen
export async function GET() {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: "Firebase Admin SDK belum dikonfigurasi" },
        { status: 503 }
      );
    }

    const snapshot = await adminDb.collection("lecturers").orderBy("name").get();
    const dosen = snapshot.docs.map((doc) => ({
      nidn: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ data: dosen });
  } catch (error) {
    console.error("Error getting dosen:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data dosen" },
      { status: 500 }
    );
  }
}

// POST: Tambah dosen baru (gunakan NIDN sebagai Document ID via setDoc)
export async function POST(request: NextRequest) {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: "Firebase Admin SDK belum dikonfigurasi" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { nidn, name, title, email, department } = body;

    if (!nidn || !name || !email) {
      return NextResponse.json(
        { error: "NIDN, nama, dan email wajib diisi" },
        { status: 400 }
      );
    }

    // Cek apakah NIDN sudah ada
    const docRef = adminDb.collection("lecturers").doc(nidn);
    const existing = await docRef.get();
    if (existing.exists) {
      return NextResponse.json(
        { error: `Dosen dengan NIDN ${nidn} sudah ada` },
        { status: 409 }
      );
    }

    const defaultPassword = `${nidn}@widyatama`;
    const passwordHash = await hashPassword(defaultPassword);

    const data = {
      nidn,
      name,
      title: title || "",
      email,
      department: department || "",
      passwordHash,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await docRef.set(data);

    return NextResponse.json(
      { message: "Dosen berhasil ditambahkan", data },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating dosen:", error);
    return NextResponse.json(
      { error: "Gagal menambahkan dosen" },
      { status: 500 }
    );
  }
}
