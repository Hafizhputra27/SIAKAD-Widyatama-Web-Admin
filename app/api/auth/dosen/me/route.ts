import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/src/lib/firebase-admin";

export async function GET(request: Request) {
  try {
    if (!adminDb) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const cookieHeader = request.headers.get("cookie") || "";
    const sessionCookie = cookieHeader
      .split(";")
      .find((c) => c.trim().startsWith("dosen_session="))
      ?.split("=")[1];

    if (!sessionCookie) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    // Decode session token
    let payload: any;
    try {
      payload = JSON.parse(Buffer.from(sessionCookie, "base64").toString("utf8"));
    } catch {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const nidn = payload?.nidn;
    if (!nidn) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    // Cari dosen — by doc ID dulu, lalu by field nidn (legacy)
    let dosenDoc = await adminDb.collection("lecturers").doc(nidn).get();
    let dosenData = dosenDoc.exists ? dosenDoc.data()! : null;

    if (!dosenData) {
      const querySnap = await adminDb
        .collection("lecturers")
        .where("nidn", "==", nidn)
        .limit(1)
        .get();
      if (!querySnap.empty) {
        dosenData = querySnap.docs[0].data();
      }
    }

    if (!dosenData) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    // Legacy: anggap aktif jika isActive tidak di-set
    if (dosenData.isActive === false) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    // Generate Firebase Custom Token
    let firebaseToken = "";
    if (adminAuth) {
      try {
        firebaseToken = await adminAuth.createCustomToken(dosenData.nidn || nidn, {
          role: "dosen",
        });
      } catch (tokenErr) {
        console.error("[DOSEN ME] Failed to create custom token:", tokenErr);
      }
    }

    return NextResponse.json({
      user: {
        nidn: dosenData.nidn || nidn,
        name: dosenData.name,
        email: dosenData.email,
        title: dosenData.title,
        department: dosenData.department,
        role: "dosen",
      },
      firebaseToken,
    });
  } catch {
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
