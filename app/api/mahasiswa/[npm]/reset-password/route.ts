import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/src/lib/firebase-admin";
import { hashPassword } from "@/src/lib/password-utils";

// POST: Reset password mahasiswa
export async function POST(
  request: Request,
  { params }: { params: Promise<{ npm: string }> }
) {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: "Firebase Admin SDK belum dikonfigurasi" },
        { status: 503 }
      );
    }

    const { npm } = await params;
    const { newPassword } = await request.json();

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password baru minimal 8 karakter" },
        { status: 400 }
      );
    }

    // Hash password baru
    const passwordHash = await hashPassword(newPassword);

    // Update Firestore
    await adminDb.collection("mahasiswa").doc(npm).update({
      passwordHash,
      updatedAt: new Date(),
    });

    // Update Firebase Auth jika tersedia
    if (adminAuth) {
      try {
        await adminAuth.updateUser(npm, {
          password: newPassword,
        });
      } catch (authError) {
        console.warn("Gagal update Firebase Auth password:", authError);
      }
    }

    return NextResponse.json({ message: "Password berhasil direset" });
  } catch (error) {
    console.error(`Error resetting password:`, error);
    return NextResponse.json(
      { error: "Gagal mereset password" },
      { status: 500 }
    );
  }
}
