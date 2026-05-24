import { NextResponse } from "next/server";
import { adminDb } from "@/src/lib/firebase-admin";

// GET: List semua pengumuman
export async function GET() {
  try {
    if (!adminDb) {
      return NextResponse.json({ error: "Firebase Admin SDK belum dikonfigurasi" }, { status: 503 });
    }

    const snapshot = await adminDb
      .collection("pengumuman")
      .orderBy("createdAt", "desc")
      .get();

    const pengumuman = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ data: pengumuman });
  } catch (error) {
    console.error("Error getting pengumuman:", error);
    return NextResponse.json({ error: "Gagal mengambil pengumuman" }, { status: 500 });
  }
}

// POST: Buat pengumuman baru
export async function POST(request: Request) {
  try {
    if (!adminDb) {
      return NextResponse.json({ error: "Firebase Admin SDK belum dikonfigurasi" }, { status: 503 });
    }

    const body = await request.json();
    const { title, content, isActive = true } = body;

    if (!title || !content) {
      return NextResponse.json({ error: "Judul dan konten wajib diisi" }, { status: 400 });
    }

    const docRef = adminDb.collection("pengumuman").doc();
    await docRef.set({
      id: docRef.id,
      title,
      content,
      isActive,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json(
      { message: "Pengumuman berhasil dibuat", id: docRef.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating pengumuman:", error);
    return NextResponse.json({ error: "Gagal membuat pengumuman" }, { status: 500 });
  }
}
