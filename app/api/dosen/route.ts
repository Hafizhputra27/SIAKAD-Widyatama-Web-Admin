import { NextResponse } from "next/server";
import { adminDb } from "@/src/lib/firebase-admin";

// GET: List semua dosen (untuk dropdown)
export async function GET() {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: "Firebase Admin SDK belum dikonfigurasi" },
        { status: 503 }
      );
    }

    const snapshot = await adminDb.collection("lecturers").get();
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
