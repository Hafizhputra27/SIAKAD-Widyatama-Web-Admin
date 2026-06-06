import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/src/lib/firebase-admin";
import { verifyPassword, hashPassword } from "@/src/lib/password-utils";

const DOSEN_SESSION_COOKIE_NAME = "dosen_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 hari

function createDosenSessionCookie(token: string): string {
  const expires = new Date(Date.now() + SESSION_MAX_AGE * 1000);
  return `${DOSEN_SESSION_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}; Expires=${expires.toUTCString()}`;
}

export async function POST(request: Request) {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: "Firebase Admin SDK belum dikonfigurasi." },
        { status: 503 }
      );
    }

    const { nidn, password } = await request.json();
    console.error("[DOSEN LOGIN] Attempt:", { nidn, passwordLength: password?.length });

    if (!nidn || !password) {
      return NextResponse.json(
        { error: "NIDN dan password diperlukan" },
        { status: 400 }
      );
    }

    // Cari dosen — coba by doc ID dulu (fast path), lalu by field nidn (legacy)
    let dosenDoc = await adminDb.collection("lecturers").doc(nidn).get();
    let dosenData = dosenDoc.exists ? dosenDoc.data()! : null;
    let docId = nidn;

    if (!dosenData) {
      console.error("[DOSEN LOGIN] Not found by doc ID, trying query by nidn field...");
      const querySnap = await adminDb
        .collection("lecturers")
        .where("nidn", "==", nidn)
        .limit(1)
        .get();

      if (!querySnap.empty) {
        dosenDoc = querySnap.docs[0];
        dosenData = dosenDoc.data()!;
        docId = dosenDoc.id;
        console.error("[DOSEN LOGIN] Found by nidn field, docId:", docId);
      }
    }

    if (!dosenData) {
      console.error("[DOSEN LOGIN] NIDN not found:", nidn);
      return NextResponse.json(
        { error: "NIDN atau password salah." },
        { status: 401 }
      );
    }

    console.error("[DOSEN LOGIN] Doc found:", {
      docId,
      nidn: dosenData.nidn || docId,
      name: dosenData.name,
      hasPasswordHash: !!dosenData.passwordHash,
      isActive: dosenData.isActive,
    });

    // Legacy: dosen lama mungkin tidak punya field isActive — anggap aktif
    const isActive = dosenData.isActive !== false;
    if (!isActive) {
      console.error("[DOSEN LOGIN] Account inactive");
      return NextResponse.json(
        { error: "Akun tidak aktif." },
        { status: 403 }
      );
    }

    let passwordValid = false;

    if (dosenData.passwordHash) {
      // Hash tersimpan — verifikasi normal
      console.error("[DOSEN LOGIN] Verifying stored hash...");
      passwordValid = await verifyPassword(password, dosenData.passwordHash);
      console.error("[DOSEN LOGIN] Stored hash verification result:", passwordValid);
    } else {
      // Legacy: dosen lama belum punya passwordHash — cek dengan default password
      const defaultPassword = `${nidn}@widyatama`;
      console.error("[DOSEN LOGIN] No hash, checking default password:", defaultPassword);
      if (password === defaultPassword) {
        passwordValid = true;
        // Auto-generate dan simpan hash untuk login berikutnya
        console.error("[DOSEN LOGIN] Default password matched, generating hash...");
        const newHash = await hashPassword(defaultPassword);
        await adminDb.collection("lecturers").doc(docId).update({
          passwordHash: newHash,
          isActive: true,
          updatedAt: new Date(),
        });
        console.error("[DOSEN LOGIN] Hash saved to Firestore");
      } else {
        console.error("[DOSEN LOGIN] Default password mismatch. Expected:", defaultPassword, "Got:", password);
      }
    }

    if (!passwordValid) {
      console.error("[DOSEN LOGIN] Password invalid");
      return NextResponse.json(
        { error: "NIDN atau password salah." },
        { status: 401 }
      );
    }

    // Buat session token
    const sessionPayload = {
      nidn: dosenData.nidn || docId,
      name: dosenData.name,
      email: dosenData.email,
      role: "dosen",
      iat: Date.now(),
    };
    const sessionToken = Buffer.from(JSON.stringify(sessionPayload)).toString("base64");

    // Generate Firebase Custom Token
    let firebaseToken = "";
    if (adminAuth) {
      try {
        firebaseToken = await adminAuth.createCustomToken(dosenData.nidn || docId, {
          role: "dosen",
        });
      } catch (tokenErr) {
        console.error("[DOSEN LOGIN] Failed to create custom token:", tokenErr);
      }
    }

    const response = NextResponse.json({
      success: true,
      user: {
        nidn: dosenData.nidn || docId,
        name: dosenData.name,
        email: dosenData.email,
        title: dosenData.title,
        department: dosenData.department,
        role: "dosen",
      },
      firebaseToken,
    });

    response.headers.set("Set-Cookie", createDosenSessionCookie(sessionToken));
    console.error("[DOSEN LOGIN] SUCCESS for:", dosenData.nidn || docId);

    return response;
  } catch (error) {
    console.error("[DOSEN LOGIN] CRITICAL ERROR:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat login." },
      { status: 500 }
    );
  }
}
