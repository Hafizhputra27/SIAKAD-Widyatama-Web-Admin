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

async function seedMahasiswa() {
  console.log("🌱 Seeding mahasiswa...");
  const mahasiswaRef = adminDb.collection("mahasiswa");
  const existing = await mahasiswaRef.limit(1).get();

  if (!existing.empty) {
    console.log("   ⚠️  Mahasiswa sudah ada, skip.");
    return;
  }

  const mahasiswaData = [
    {
      npm: "241111011",
      name: "Budi Santoso",
      major: "Teknik Informatika",
      campusEmail: "241111011@student.widyatama.ac.id",
      passwordHash: "",
      status: "AKTIF",
      kelas: "REGULER",
      angkatan: 2024,
      ipkKumulatif: 3.75,
      totalSksLulus: 36,
      totalSksTarget: 144,
      semesterBerjalan: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      npm: "241111012",
      name: "Ani Wulandari",
      major: "Sistem Informasi",
      campusEmail: "241111012@student.widyatama.ac.id",
      passwordHash: "",
      status: "AKTIF",
      kelas: "REGULER",
      angkatan: 2024,
      ipkKumulatif: 3.45,
      totalSksLulus: 36,
      totalSksTarget: 144,
      semesterBerjalan: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      npm: "241111013",
      name: "Cahyo Nugroho",
      major: "Teknik Informatika",
      campusEmail: "241111013@student.widyatama.ac.id",
      passwordHash: "",
      status: "AKTIF",
      kelas: "KARYAWAN",
      angkatan: 2023,
      ipkKumulatif: 3.2,
      totalSksLulus: 72,
      totalSksTarget: 144,
      semesterBerjalan: 4,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      npm: "231111021",
      name: "Dewi Kusuma",
      major: "Manajemen Informatika",
      campusEmail: "231111021@student.widyatama.ac.id",
      passwordHash: "",
      status: "AKTIF",
      kelas: "REGULER",
      angkatan: 2023,
      ipkKumulatif: 2.85,
      totalSksLulus: 72,
      totalSksTarget: 144,
      semesterBerjalan: 4,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      npm: "221111031",
      name: "Eko Prasetyo",
      major: "Komputerisasi Akuntansi",
      campusEmail: "221111031@student.widyatama.ac.id",
      passwordHash: "",
      status: "LULUS",
      kelas: "REGULER",
      angkatan: 2022,
      ipkKumulatif: 3.65,
      totalSksLulus: 144,
      totalSksTarget: 144,
      semesterBerjalan: 8,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  for (const data of mahasiswaData) {
    await mahasiswaRef.doc(data.npm).set(data);
    console.log(`   ✅ Mahasiswa ${data.npm} - ${data.name} berhasil ditambahkan.`);
  }
}

async function seedPengumuman() {
  console.log("🌱 Seeding pengumuman...");
  const pengumumanRef = adminDb.collection("pengumuman");
  const existing = await pengumumanRef.limit(1).get();

  if (!existing.empty) {
    console.log("   ⚠️  Pengumuman sudah ada, skip.");
    return;
  }

  const pengumumanData = [
    {
      title: "Jadwal UTS Semester Genap 2025/2026",
      content: "UTS akan dilaksanakan tanggal 15-20 Juni 2026. Mohon persiapkan diri dengan baik.",
      isActive: true,
      priority: "HIGH",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      title: "Pembayaran Uang Khusus Praktikum",
      content: "Pembayaran praktikum semester genap dapat dilakukan hingga 30 Juni 2026.",
      isActive: true,
      priority: "NORMAL",
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      title: "Libur Nasional Hari Raya",
      content: "Kampus libur pada tanggal 17-18 Juni 2026 dalam rangka Hari Raya.",
      isActive: true,
      priority: "LOW",
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
  ];

  for (const data of pengumumanData) {
    const docRef = pengumumanRef.doc();
    await docRef.set({ ...data, id: docRef.id });
    console.log(`   ✅ Pengumuman "${data.title}" berhasil ditambahkan.`);
  }
}

async function seedTagihan() {
  console.log("🌱 Seeding tagihan...");
  const mahasiswaSnap = await adminDb.collection("mahasiswa").get();

  if (mahasiswaSnap.empty) {
    console.log("   ⚠️  Tidak ada mahasiswa, skip tagihan.");
    return;
  }

  for (const mDoc of mahasiswaSnap.docs) {
    const npm = mDoc.id;
    const semester = mDoc.data().semesterBerjalan || 1;

    const tagihanData = [
      {
        npm,
        judul: `SPP Semester ${semester}`,
        tipe: "SPP",
        total: 3500000,
        status: "BELUM_LUNAS",
        isLunas: false,
        jatuhTempo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        tanggalBayar: null,
        paymentMethod: null,
        tahunAjaran: "2025/2026",
        semester,
        diskon: 0,
        items: [
          { nama: "SPP", jumlah: 3500000 },
        ],
        createdAt: new Date(),
      },
      {
        npm,
        judul: `UKT Semester ${semester}`,
        tipe: "UKT",
        total: 1500000,
        status: "BELUM_LUNAS",
        isLunas: false,
        jatuhTempo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        tanggalBayar: null,
        paymentMethod: null,
        tahunAjaran: "2025/2026",
        semester,
        diskon: 0,
        items: [
          { nama: "UKT", jumlah: 1500000 },
        ],
        createdAt: new Date(),
      },
    ];

    for (const data of tagihanData) {
      const docRef = adminDb.collection("mahasiswa").doc(npm).collection("tagihan").doc();
      await docRef.set({ ...data, id: docRef.id });
    }
    console.log(`   ✅ ${tagihanData.length} tagihan untuk ${npm} berhasil ditambahkan.`);
  }
}

async function seedAcademicResults() {
  console.log("🌱 Seeding academic_results...");

  const results = [
    { npm: "241111011", code: "IF101", name: "Algoritma & Pemrograman", sks: 3, semester: 1, nilaiAngka: 85, nilaiHuruf: "A", mutu: 4.0, status: "LULUS" },
    { npm: "241111011", code: "IF102", name: "Struktur Data", sks: 3, semester: 1, nilaiAngka: 78, nilaiHuruf: "B", mutu: 3.0, status: "LULUS" },
    { npm: "241111011", code: "IF103", name: "Basis Data", sks: 3, semester: 2, nilaiAngka: 92, nilaiHuruf: "A", mutu: 4.0, status: "LULUS" },
    { npm: "241111011", code: "IF104", name: "Pemrograman Web", sks: 3, semester: 2, nilaiAngka: 88, nilaiHuruf: "A", mutu: 4.0, status: "LULUS" },
    { npm: "241111012", code: "IF101", name: "Algoritma & Pemrograman", sks: 3, semester: 1, nilaiAngka: 72, nilaiHuruf: "B", mutu: 3.0, status: "LULUS" },
    { npm: "241111012", code: "IF102", name: "Struktur Data", sks: 3, semester: 1, nilaiAngka: 68, nilaiHuruf: "C", mutu: 2.0, status: "LULUS" },
    { npm: "241111012", code: "IF103", name: "Basis Data", sks: 3, semester: 2, nilaiAngka: 55, nilaiHuruf: "C", mutu: 2.0, status: "LULUS" },
    { npm: "241111012", code: "IF105", name: "Jaringan Komputer", sks: 3, semester: 2, nilaiAngka: 35, nilaiHuruf: "E", mutu: 0.0, status: "TIDAK_LULUS" },
    { npm: "241111013", code: "IF201", name: "Pemrograman Mobile", sks: 3, semester: 3, nilaiAngka: 90, nilaiHuruf: "A", mutu: 4.0, status: "LULUS" },
    { npm: "241111013", code: "IF202", name: "Kecerdasan Buatan", sks: 3, semester: 3, nilaiAngka: 82, nilaiHuruf: "B", mutu: 3.0, status: "LULUS" },
  ];

  for (const r of results) {
    const docRef = adminDb.collection("mahasiswa").doc(r.npm).collection("academic_results").doc(r.code);
    await docRef.set({
      mataKuliahId: r.code,
      mataKuliahName: r.name,
      sks: r.sks,
      semester: r.semester,
      nilaiAngka: r.nilaiAngka,
      nilaiHuruf: r.nilaiHuruf,
      mutu: r.mutu,
      status: r.status,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  console.log(`   ✅ ${results.length} academic_results berhasil ditambahkan.`);
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
    await seedMahasiswa();
    await seedPengumuman();
    await seedTagihan();
    await seedAcademicResults();
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
