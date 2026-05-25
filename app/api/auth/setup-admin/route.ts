import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/src/lib/firebase-admin";

/**
 * POST /api/auth/setup-admin
 * 
 * Endpoint sekali-panggil untuk setup akun admin.
 * - Membuat user di Firebase Authentication (jika belum ada)
 * - Menyinkronkan dokumen di Firestore koleksi "admins"
 * 
 * Hanya bisa dijalankan jika belum ada admin dengan email ini.
 */
export async function POST() {
  try {
    if (!adminAuth || !adminDb) {
      return NextResponse.json(
        { error: "Firebase Admin SDK belum dikonfigurasi." },
        { status: 503 }
      );
    }

    const email = "admin@widyatama.ac.id";
    const password = "admin123";
    const name = "Super Admin SIAKAD";
    const role = "super_admin";

    let uid: string;
    let isNewUser = false;

    // Step 1: Cek apakah user sudah ada di Firebase Authentication
    try {
      const existingUser = await adminAuth.getUserByEmail(email);
      uid = existingUser.uid;
      console.log(`User ${email} sudah ada di Firebase Auth (UID: ${uid}).`);
    } catch (error: any) {
      if (error.code === "auth/user-not-found") {
        // Step 2: Buat user baru di Firebase Authentication
        const newUser = await adminAuth.createUser({
          email,
          password,
          displayName: name,
        });
        uid = newUser.uid;
        isNewUser = true;
        console.log(`User ${email} berhasil dibuat di Firebase Auth (UID: ${uid}).`);
      } else {
        throw error;
      }
    }

    // Step 3: Cek dan update dokumen di Firestore
    const adminDocRef = adminDb.collection("admins").doc(uid);
    const adminDoc = await adminDocRef.get();

    if (adminDoc.exists) {
      // Update jika sudah ada (pastikan isActive: true)
      await adminDocRef.update({
        email,
        name,
        role,
        isActive: true,
        updatedAt: new Date().toISOString(),
      });
      console.log(`Dokumen admins/${uid} diperbarui.`);
    } else {
      // Buat dokumen baru
      await adminDocRef.set({
        uid,
        email,
        name,
        role,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      console.log(`Dokumen admins/${uid} dibuat.`);
    }

    // Step 4: Hapus dokumen lama jika masih ada (dari seed-data lama dengan ID manual)
    try {
      const oldDocRef = adminDb.collection("admins").doc("admin_superadmin_001");
      const oldDoc = await oldDocRef.get();
      if (oldDoc.exists) {
        // Hanya hapus jika UID-nya beda (dokumen lama dari seed-data yang salah)
        const oldData = oldDoc.data();
        if (oldData?.uid !== uid) {
          await oldDocRef.delete();
          console.log(`Dokumen lama admins/admin_superadmin_001 dihapus.`);
        }
      }
    } catch {
      // Silent fail - tidak masalah kalau dokumen lama tidak ada
    }

    return NextResponse.json({
      success: true,
      message: isNewUser
        ? "Akun admin berhasil dibuat dan disinkronkan."
        : "Akun admin sudah ada, dokumen Firestore diperbarui.",
      user: {
        uid,
        email,
        name,
        role,
      },
      credentials: {
        email,
        password: isNewUser ? password : "(sudah ada sebelumnya)",
      },
    });
  } catch (error: any) {
    console.error("Setup admin error:", error);
    return NextResponse.json(
      {
        error: "Gagal setup admin.",
        detail: error.message,
      },
      { status: 500 }
    );
  }
}
