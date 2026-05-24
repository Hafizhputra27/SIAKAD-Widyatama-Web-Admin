import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/src/lib/firebase-admin";

export async function GET(request: Request) {
  try {
    if (!adminAuth || !adminDb) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const cookieHeader = request.headers.get("cookie") || "";
    const sessionCookie = cookieHeader
      .split(";")
      .find((c) => c.trim().startsWith("session="))
      ?.split("=")[1];

    if (!sessionCookie) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    // Verifikasi session cookie
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
    const uid = decodedToken.uid;

    // Ambil data admin dari Firestore
    const adminDoc = await adminDb.collection("admins").doc(uid).get();
    if (!adminDoc.exists) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const adminData = adminDoc.data();

    return NextResponse.json({
      user: {
        uid,
        email: decodedToken.email,
        name: adminData?.name || "",
        role: adminData?.role || "akademik",
      },
    });
  } catch {
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
