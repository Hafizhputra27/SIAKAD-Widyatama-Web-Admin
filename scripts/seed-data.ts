import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

let adminDb: any;

async function seedAdmins() {
  console.log("🌱 Seeding admins...");
  const adminRef = adminDb.collection("admins").doc("admin_superadmin_001");
  const doc = await adminRef.get();

  if (doc.exists) {
    console.log("   ⚠️  Admin sudah ada, skip.");
    return;
  }

  await adminRef.set({
    uid: "admin_superadmin_001",
    email: "admin@widyatama.ac.id",
    name: "Super Admin SIAKAD",
    role: "super_admin",
    isActive: true,
    createdAt: new Date(),
  });
  console.log("   ✅ Admin default berhasil ditambahkan.");
}

async function seedPertemuan() {
  console.log("🌱 Seeding pertemuan...");
  const pertemuanRef = adminDb.collection("pertemuan");
  const existing = await pertemuanRef.limit(1).get();

  if (!existing.empty) {
    console.log("   ⚠️  Pertemuan sudah ada, skip.");
    return;
  }

  const pertemuanData = [
    {
      courseId: "IF301",
      courseName: "Mobile Programming",
      nomorPertemuan: 1,
      tanggal: new Date("2026-05-17"),
      jamMulai: "09:45",
      jamSelesai: "11:25",
      qrToken: "token_pertemuan_1_expired",
      qrExpiresAt: new Date("2026-05-17T08:15:00"),
      isQrActive: false,
      enrolledNpms: ["241111011", "241111012", "241111013"],
      createdBy: "admin_superadmin_001",
      createdAt: new Date("2025-05-17"),
    },
    {
      courseId: "IF301",
      courseName: "Mobile Programming",
      nomorPertemuan: 2,
      tanggal: new Date("2026-05-20"),
      jamMulai: "09:45",
      jamSelesai: "11:25",
      qrToken: "token_pertemuan_2_expired",
      qrExpiresAt: new Date("2026-05-20T08:15:00"),
      isQrActive: false,
      enrolledNpms: ["241111011", "241111012", "241111013"],
      createdBy: "admin_superadmin_001",
      createdAt: new Date("2025-05-20"),
    },
    {
      courseId: "IF301",
      courseName: "Mobile Programming",
      nomorPertemuan: 3,
      tanggal: new Date(),
      jamMulai: "09:45",
      jamSelesai: "11:25",
      qrToken: "token_pertemuan_3_active",
      qrExpiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 jam dari sekarang
      isQrActive: true,
      enrolledNpms: ["241111011", "241111012", "241111013"],
      createdBy: "admin_superadmin_001",
      createdAt: new Date(),
    },
  ];

  for (const data of pertemuanData) {
    const docRef = pertemuanRef.doc();
    await docRef.set({ ...data, id: docRef.id });
    console.log(`   ✅ Pertemuan ${data.nomorPertemuan} berhasil ditambahkan (ID: ${docRef.id})`);
  }
}

async function migratePresensi() {
  console.log("🔄 Migrating presensi...");
  const snapshot = await adminDb.collection("presensi").get();

  if (snapshot.empty) {
    console.log("   ℹ️  Koleksi presensi kosong, tidak ada yang perlu di-migrate.");
    return;
  }

  let updated = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const updates: Record<string, unknown> = {};

    if (!data.courseId) updates.courseId = "";
    if (!data.scanMethod) updates.scanMethod = "MANUAL";
    if (!data.pertemuanId) updates.pertemuanId = "";

    if (Object.keys(updates).length > 0) {
      await doc.ref.update(updates);
      updated++;
    }
  }

  console.log(`   ✅ ${updated} dokumen presensi di-update.`);
}

async function migrateCourses() {
  console.log("🔄 Migrating courses...");
  const snapshot = await adminDb.collection("courses").get();

  if (snapshot.empty) {
    console.log("   ℹ️  Koleksi courses kosong, tidak ada yang perlu di-migrate.");
    return;
  }

  let updated = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();

    // Jika sudah punya jamMulai dan jamSelesai, skip
    if (data.jamMulai && data.jamSelesai) continue;

    // Parse field `time` jika ada (format: "08:00 - 10:30 WIB" atau "08:00 - 10:30")
    if (data.time && typeof data.time === "string") {
      const timeParts = data.time
        .replace(/\s*WIB\s*/i, "")
        .split(" - ");

      if (timeParts.length === 2) {
        const jamMulai = timeParts[0].trim();
        const jamSelesai = timeParts[1].trim();

        await doc.ref.update({
          jamMulai,
          jamSelesai,
        });
        updated++;
      }
    }
  }

  console.log(`   ✅ ${updated} dokumen courses di-update.`);
}

async function seedLecturers() {
  console.log("🌱 Seeding lecturers...");
  const lecturersRef = adminDb.collection("lecturers");
  const existing = await lecturersRef.limit(1).get();

  if (!existing.empty) {
    console.log("   ⚠️  Lecturers sudah ada, skip.");
    return;
  }

  const lecturersData = [
    {
      nidn: "001",
      name: "Dani Hamdani, S.Kom., M.T.",
      title: "S.Kom., M.T.",
      email: "dani@widyatama.ac.id",
      department: "Pemrograman Mobile",
    },
    {
      nidn: "002",
      name: "IR. Sri Lestari, M.T.",
      title: "M.T.",
      email: "sri@widyatama.ac.id",
      department: "Statistika",
    },
    {
      nidn: "003",
      name: "Rosalin Samihardjo, S.T., M.Kom.",
      title: "S.T., M.Kom.",
      email: "rosalin@widyatama.ac.id",
      department: "Analisis dan Perancangan Sistem Informasi",
    },
    {
      nidn: "004",
      name: "DR. R.A.E. Virgana Targa Sapanji, S.Kom., M.T.",
      title: "S.Kom., M.T.",
      email: "virgana@widyatama.ac.id",
      department: "Keamanan Sistem Informasi",
    },
    {
      nidn: "005",
      name: "Ir. Ucu Nugraha, S.T., M.Kom., IPM., MOS",
      title: "S.T., M.Kom., IPM., MOS",
      email: "ucu@widyatama.ac.id",
      department: "Manajemen Resiko TI",
    },
  ];

  for (const data of lecturersData) {
    const docRef = lecturersRef.doc(data.nidn);
    await docRef.set({
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    console.log(`   ✅ Dosen ${data.nidn} - ${data.name} berhasil ditambahkan.`);
  }
}

async function main() {
  console.log("🚀 SIAKAD Seeder Started\n");

  try {
    const adminModule = await import("../src/lib/firebase-admin");
    adminDb = adminModule.adminDb;
    if (!adminDb) {
      throw new Error("Firebase Admin SDK failed to initialize. Check .env.local credentials.");
    }

    await seedAdmins();
    await seedLecturers();
    await seedPertemuan();
    await migratePresensi();
    await migrateCourses();

    console.log("\n✨ Seeding selesai!");
    console.log("\n📋 Catatan:");
    console.log("   - Buka Firebase Console → Firestore untuk memverifikasi data.");
    console.log("   - Untuk login admin: jalankan POST /api/auth/setup-admin lalu login dengan:");
    console.log("     Email: admin@widyatama.ac.id");
    console.log("     Password: admin123");
  } catch (error) {
    console.error("\n❌ Seeding gagal:", error);
    process.exit(1);
  }
}

main();
