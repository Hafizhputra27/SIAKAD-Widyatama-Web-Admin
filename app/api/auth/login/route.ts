import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/src/lib/firebase-admin";

const SESSION_COOKIE_NAME = "session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 hari

function createSessionCookie(token: string): string {
  const expires = new Date(Date.now() + SESSION_MAX_AGE * 1000);
  return `${SESSION_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}; Expires=${expires.toUTCString()}`;
}

export async function POST(request: Request) {
  try {
    if (!adminAuth || !adminDb) {
      return NextResponse.json(
        { error: "Firebase Admin SDK belum dikonfigurasi." },
        { status: 503 }
      );
    }

    const { idToken } = await request.json();

    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json({ error: "ID token diperlukan" }, { status: 400 });
    }

    // Verifikasi ID Token dengan Firebase Admin
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // Cek apakah user ada di koleksi admins
    const adminDoc = await adminDb.collection("admins").doc(uid).get();
    if (!adminDoc.exists) {
      return NextResponse.json(
        { error: "Akses ditolak. Anda bukan admin." },
        { status: 403 }
      );
    }

    const adminData = adminDoc.data();
    if (!adminData?.isActive) {
      return NextResponse.json(
        { error: "Akun tidak aktif." },
        { status: 403 }
      );
    }

    // Buat session cookie
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_MAX_AGE * 1000,
    });

    // Generate Firebase Custom Token
    let firebaseToken = "";
    if (adminAuth) {
      try {
        firebaseToken = await adminAuth.createCustomToken(uid);
      } catch (tokenErr) {
        console.error("[ADMIN LOGIN] Failed to create custom token:", tokenErr);
      }
    }

    const response = NextResponse.json({
      success: true,
      user: {
        uid,
        email: decodedToken.email,
        name: adminData.name,
        role: adminData.role,
      },
      firebaseToken,
    });

    response.headers.set("Set-Cookie", createSessionCookie(sessionCookie));

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Email atau password salah." },
      { status: 401 }
    );
  }
}
