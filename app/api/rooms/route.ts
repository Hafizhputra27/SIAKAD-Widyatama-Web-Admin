import { NextResponse } from "next/server";
import { adminDb } from "@/src/lib/firebase-admin";

// GET: List semua ruangan (untuk dropdown)
export async function GET() {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: "Firebase Admin SDK belum dikonfigurasi" },
        { status: 503 }
      );
    }

    const snapshot = await adminDb.collection("rooms").get();
    const rooms = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ data: rooms });
  } catch (error) {
    console.error("Error getting rooms:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data ruangan" },
      { status: 500 }
    );
  }
}

// POST: Tambah ruangan baru
export async function POST(request: Request) {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: "Firebase Admin SDK belum dikonfigurasi" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { id, roomName, building, floor } = body;

    // Validasi input
    if (!id || !roomName || !building || floor === undefined) {
      return NextResponse.json(
        { error: "Semua field wajib diisi (id, roomName, building, floor)" },
        { status: 400 }
      );
    }

    const floorNum = Number(floor);
    if (isNaN(floorNum)) {
      return NextResponse.json(
        { error: "Lantai harus berupa angka" },
        { status: 400 }
      );
    }

    // Cek jika ID ruangan sudah terdaftar
    const roomRef = adminDb.collection("rooms").doc(id);
    const roomDoc = await roomRef.get();
    if (roomDoc.exists) {
      return NextResponse.json(
        { error: `Ruangan dengan kode ${id} sudah terdaftar` },
        { status: 409 }
      );
    }

    // Simpan ke Firestore
    await roomRef.set({
      roomName,
      building,
      floor: floorNum,
    });

    return NextResponse.json(
      {
        message: "Ruangan berhasil ditambahkan",
        data: { id, roomName, building, floor: floorNum },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating room:", error);
    return NextResponse.json(
      { error: "Gagal menambahkan ruangan" },
      { status: 500 }
    );
  }
}
