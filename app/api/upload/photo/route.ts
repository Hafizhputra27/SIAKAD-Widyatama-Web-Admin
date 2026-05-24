import { NextResponse } from "next/server";
import { adminDb } from "@/src/lib/firebase-admin";

// POST: Upload photo profile (placeholder - sebenarnya upload ke Firebase Storage)
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const npm = formData.get("npm") as string;

    if (!file || !npm) {
      return NextResponse.json({ error: "File dan NPM diperlukan" }, { status: 400 });
    }

    // Untuk sementara, return URL placeholder
    // Implementasi sebenarnya: upload ke Firebase Storage di path photos/mahasiswa/{npm}.jpg
    const placeholderUrl = `https://storage.googleapis.com/siakad-widyatama.appspot.com/photos/mahasiswa/${npm}.jpg`;

    return NextResponse.json({ url: placeholderUrl });
  } catch (error) {
    console.error("Error uploading photo:", error);
    return NextResponse.json({ error: "Gagal upload foto" }, { status: 500 });
  }
}
