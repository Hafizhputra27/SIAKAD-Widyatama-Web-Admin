import { NextResponse } from "next/server";
import { adminDb } from "@/src/lib/firebase-admin";

const HARI_ORDER = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

// GET: Ambil jadwal terorganisir per hari
export async function GET(request: Request) {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: "Firebase Admin SDK belum dikonfigurasi" },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const semester = searchParams.get("semester");

    let query: FirebaseFirestore.Query = adminDb.collection("courses").where("isActive", "==", true);

    if (semester) {
      query = query.where("semester", "==", parseInt(semester));
    }

    const snapshot = await query.get();
    const courses = snapshot.docs.map((doc) => ({
      code: doc.id,
      ...doc.data(),
    })) as Record<string, unknown>[];

    // Organize by day
    const jadwal: Record<string, typeof courses> = {};
    HARI_ORDER.forEach((hari) => {
      jadwal[hari] = [];
    });

    courses.forEach((course) => {
      const hari = course.hari as string;
      if (jadwal[hari]) {
        jadwal[hari].push(course);
      }
    });

    // Sort each day by jamMulai
    HARI_ORDER.forEach((hari) => {
      jadwal[hari].sort((a, b) => {
        const timeA = a.jamMulai as string;
        const timeB = b.jamMulai as string;
        return timeA.localeCompare(timeB);
      });
    });

    return NextResponse.json({ data: jadwal });
  } catch (error) {
    console.error("Error getting jadwal:", error);
    return NextResponse.json(
      { error: "Gagal mengambil jadwal" },
      { status: 500 }
    );
  }
}
