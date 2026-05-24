# Penjelasan Proyek SIAKAD Web Admin

SIAKAD Web Admin adalah aplikasi dashboard administrasi akademik berbasis web untuk pengelolaan data mahasiswa, jadwal perkuliahan, dan modul akademik lainnya. Dibangun menggunakan framework **Next.js 16** (App Router) dengan **React 19** dan **Firebase Firestore** sebagai database.

---

## 1. Struktur File Proyek

```
siakad-web-admin/
├── app/                          # Next.js App Router (routing & halaman)
│   ├── globals.css               # Global styles + Tailwind v4 + variabel tema
│   ├── layout.tsx                # Root layout, wrap AuthProvider
│   ├── page.tsx                  # Root page → redirect ke /dashboard
│   ├── favicon.ico
│   ├── login/
│   │   └── page.tsx              # Halaman login (client component)
│   └── dashboard/
│       ├── layout.tsx            # Dashboard layout: Sidebar + Header + main
│       ├── page.tsx              # Dashboard home (statistik cards)
│       ├── mahasiswa/
│       │   └── page.tsx          # CRUD data mahasiswa (full, 427 baris)
│       ├── jadwal/
│       │   └── page.tsx          # CRUD data jadwal/courses (full, 444 baris)
│       ├── courses/
│       │   └── page.tsx          # Placeholder "Coming Soon"
│       ├── dosen/
│       │   └── page.tsx          # Placeholder "Coming Soon"
│       ├── room/
│       │   └── page.tsx          # Placeholder "Coming Soon"
│       └── administrasi/
│           └── page.tsx          # Placeholder "Coming Soon"
├── components/                   # Komponen UI & providers
│   ├── providers/
│   │   └── AuthProvider.tsx      # React Context untuk autentikasi (cookie-based)
│   └── ui/
│       ├── Header.tsx            # Top bar: search, notifikasi, user menu, logout
│       ├── Sidebar.tsx           # Navigasi samping (collapsible, 7 menu item)
│       ├── Modal.tsx             # Modal animasi (Framer Motion) untuk form CRUD
│       └── Skeleton.tsx          # Komponen loading (SkeletonCard, SkeletonTableRow)
├── src/                          # Kode shared
│   ├── lib/
│   │   ├── firebase.ts           # Inisialisasi Firebase (Firestore + Auth)
│   │   └── hooks/                # (kosong, belum digunakan)
│   ├── components/               # (kosong, cadangan komponen)
│   └── types/
│       ├── index.ts              # Definisi tipe: Student, Course, NavItem
│       └── types.ts              # Versi alternatif tipe (parsial overlap)
├── public/                       # Static assets (SVG ikon)
├── proxy.ts                      # Middleware custom: auth guard + redirect
├── next.config.ts                # Konfigurasi Next.js
├── tsconfig.json                 # Konfigurasi TypeScript (path alias @/*)
├── postcss.config.mjs            # PostCSS dengan plugin @tailwindcss/postcss
├── eslint.config.mjs             # ESLint 9 flat config
├── .env.local                    # Environment variables (Firebase credentials)
├── package.json
├── AGENTS.md
└── README.md
```

### Penjelasan Direktori Utama

#### `app/` — Next.js App Router

Semua routing berbasis file. Menggunakan App Router (Next.js 13+), bukan Pages Router. Setiap folder merepresentasikan route, dan file `page.tsx` adalah halaman utama route tersebut. File `layout.tsx` digunakan untuk layout bersama (shared layout pattern).

Route | Halaman | Status | Otentikasi
--- | --- | --- | ---
`/` | Redirect ke `/dashboard` | Aktif | Tidak
`/login` | Form login | Aktif | Tidak
`/dashboard` | Dashboard utama (statistik) | Aktif | Ya
`/dashboard/mahasiswa` | CRUD data mahasiswa | **Aktif (full)** | Ya
`/dashboard/jadwal` | CRUD jadwal perkuliahan | **Aktif (full)** | Ya
`/dashboard/courses` | Placeholder | Coming Soon | Ya
`/dashboard/dosen` | Placeholder | Coming Soon | Ya
`/dashboard/room` | Placeholder | Coming Soon | Ya
`/dashboard/administrasi` | Placeholder | Coming Soon | Ya

#### `components/` — Komponen UI & Provider

- **`providers/AuthProvider.tsx`** — React Context provider yang mengelola state autentikasi (login/logout) dan menyimpan token di cookie browser (`siakad-auth`). Kredensial hardcoded: `admin` / `admin123`.
- **`ui/Sidebar.tsx`** — Sidebar navigasi collapsible (hover to expand) dengan 7 item menu dan indikator active route menggunakan `layoutId` dari Framer Motion.
- **`ui/Header.tsx`** — Header bar dengan search input, ikon notifikasi (bell), avatar user, dan tombol logout.
- **`ui/Modal.tsx`** — Modal animasi reusable menggunakan Framer Motion, digunakan untuk form tambah/edit data.
- **`ui/Skeleton.tsx`** — Komponen loading skeleton (card, table row, spinner) untuk UX saat data di-fetch.

#### `src/` — Kode Shared

- **`lib/firebase.ts`** — Inisialisasi Firebase App dengan konfigurasi dari environment variables. Mengekspor instance `db` (Firestore) dan `auth` (Firebase Auth, belum digunakan untuk login).
- **`types/index.ts`** — Definisi interface TypeScript untuk model data utama (`Student`, `Course`, `NavItem`) dan type union (`StudentStatus`, `DayOfWeek`).

---

## 2. Tech Stack

| Kategori | Teknologi | Versi |
| --- | --- | --- |
| **Framework** | Next.js (App Router) | 16.2.6 |
| **UI Library** | React | 19.2.4 |
| **Bahasa** | TypeScript | ^5 |
| **CSS Framework** | Tailwind CSS | ^4 |
| **CSS Plugin** | @tailwindcss/postcss | ^4 |
| **Database** | Firebase Firestore (NoSQL) | ^12.13.0 |
| **Autentikasi** | Firebase Auth (inisialisasi) + Cookie custom | ^12.13.0 |
| **Animasi** | Framer Motion | ^12.38.0 |
| **Ikon** | Lucide React | ^1.16.0 |
| **Linting** | ESLint 9 (flat config) | ^9 |

### Tidak Ada Library Berikut

- **Tidak ada ORM / SQL** (Prisma, Drizzle, TypeORM, Sequelize)
- **Tidak ada state management** (Redux, Zustand, Jotai) — hanya React Context
- **Tidak ada form library** (React Hook Form, Formik) — form menggunakan controlled component React biasa
- **Tidak ada HTTP client** (fetch, axios, ky) — data diakses langsung via Firebase SDK
- **Tidak ada data-fetching library** (React Query / TanStack Query, SWR) — menggunakan listener real-time `onSnapshot` dari Firestore
- **Tidak ada Next.js API routes** (`app/api/` tidak ada)

---

## 3. Integrasi Database (Firebase Firestore)

### 3.1 Konfigurasi Firebase

**File:** `src/lib/firebase.ts`

Aplikasi menggunakan Firebase Web SDK v9+ dengan modular API. Inisialisasi dilakukan sekali dengan pola singleton (`getApps().length === 0`), mencegah multiple initialization di development (Next.js Fast Refresh).

```typescript
import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);    // Instance Firestore
export const auth = getAuth(app);        // Instance Auth (belum digunakan utk login)
```

### 3.2 Environment Variables

**File:** `.env.local`

Semua variabel menggunakan prefix `NEXT_PUBLIC_` karena diakses dari client-side (browser).

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDrx-NZs-8ZTsE0q4u5bsUKYcVaKvz5Fps
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=siakad-widyatama.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=siakad-widyatama
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=siakad-widyatama.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=776966816976
NEXT_PUBLIC_FIREBASE_APP_ID=1:776966816976:web:b2862d38a9fc8850b7cad5
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://siakad-widyatama.firebaseio.com
```

### 3.3 Koleksi Firestore

| Koleksi | Document Key | Deskripsi |
| --- | --- | --- |
| `mahasiswa` | `npm` (NPM mahasiswa, 10 digit) | Data mahasiswa — di-CRUD di halaman `/dashboard/mahasiswa` |
| `courses` | `code` (kode mata kuliah) | Data jadwal perkuliahan — di-CRUD di halaman `/dashboard/jadwal` |
| `dosen` | - | Dibaca real-time untuk statistik jumlah dosen di dashboard |
| `room` | - | Dibaca real-time untuk statistik jumlah ruangan di dashboard |

### 3.4 Model Data (TypeScript)

**File:** `src/types/index.ts`

```typescript
// Status mahasiswa
type StudentStatus = "AKTIF" | "NONAKTIF" | "CUTI" | "LULUS";

// Model Mahasiswa
interface Student {
  npm: string;             // Nomor Pokok Mahasiswa (document ID)
  name: string;             // Nama lengkap
  major: string;            // Program studi / jurusan
  campusEmail: string;      // Email kampus
  status: StudentStatus;    // Status akademik
  semesterBerjalan: number; // Semester saat ini
  ipkKumulatif: number;     // IPK kumulatif
  createdAt?: Date;         // Timestamp pembuatan
  updatedAt?: Date;         // Timestamp update terakhir
}

// Hari perkuliahan
type DayOfWeek = "Senin" | "Selasa" | "Rabu" | "Kamis" | "Jumat" | "Sabtu";

// Model Mata Kuliah / Jadwal
interface Course {
  code: string;      // Kode mata kuliah (document ID)
  name: string;      // Nama mata kuliah
  sks: number;       // Jumlah SKS
  day: DayOfWeek;    // Hari perkuliahan
  time: string;      // Jam perkuliahan (format: "HH:MM - HH:MM")
  room: string;      // Ruangan
  lecturer: string;  // Nama dosen pengampu
}
```

### 3.5 Pola Akses Data

Semua operasi data dilakukan **langsung dari client components** menggunakan Firebase SDK, tanpa perantara API routes.

#### Membaca Data (Real-time)

Menggunakan `onSnapshot()` — listener real-time yang otomatis memperbarui UI setiap kali ada perubahan di Firestore:

```typescript
const unsub = onSnapshot(collection(db, "mahasiswa"), (snapshot) => {
  const data = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
  setStudents(data);
});
return () => unsub(); // Cleanup saat komponen unmount
```

#### Menulis Data

- **Create:** `setDoc(doc(db, "mahasiswa", formData.npm), data)`
- **Update:** `updateDoc(doc(db, "mahasiswa", editingStudent.npm), { ...data, updatedAt: new Date() })`
- **Delete:** `deleteDoc(doc(db, "mahasiswa", npm))`

#### Pola yang Sama untuk Semua Koleksi

Semua halaman CRUD (`mahasiswa`, `jadwal`) menggunakan pola yang identik:
1. `useEffect` untuk subscribe ke `onSnapshot` saat mount
2. `FormData` state untuk form input (controlled components)
3. Fungsi handler terpisah: `handleSubmit`, `handleEdit`, `handleDelete`, `handleCancel`
4. Loading state (`setLoading(true)` sebelum fetch, `false` setelah data diterima)
5. Skeleton UI ditampilkan saat loading

### 3.6 Keamanan Data

- **Tidak ada Firestore Security Rules** — kredensial Firebase diekspos ke client (`NEXT_PUBLIC_`), dan semua operasi baca/tulis Firestore dilakukan langsung dari browser tanpa autentikasi Firebase yang sesungguhnya.
- **Autentikasi hanya di level UI** — cookie `siakad-auth` dicek oleh `proxy.ts` untuk membatasi akses halaman, tapi tidak memvalidasi di sisi Firestore.
- Ini berarti siapa pun yang memiliki API key Firebase dapat membaca/menulis data secara langsung jika mereka melewati proxy.

---

## 4. Autentikasi

### 4.1 Sistem Login

Autentikasi menggunakan sistem cookie-based sederhana, **bukan Firebase Authentication**.

**File:** `components/providers/AuthProvider.tsx`

- Kredensial: **username:** `admin`, **password:** `admin123` (hardcoded)
- Token disimpan di cookie browser: `siakad-auth=authenticated`
- Cookie berlaku 24 jam (`max-age=86400`)
- State `isAuthenticated` disimpan di React Context dan bisa diakses komponen mana pun via hook `useAuth()`

### 4.2 Middleware Auth Guard

**File:** `proxy.ts`

Middleware ini mencegat semua request dan melakukan redirect berdasarkan cookie auth:

| Kondisi | Aksi |
| --- | --- |
| User belum login, akses `/dashboard/*` | Redirect ke `/login` |
| User sudah login, akses `/login` | Redirect ke `/dashboard` |
| Akses `/` (root) | Redirect ke `/dashboard` |
| Route public (`/login`) | Izinkan akses |

### 4.3 Catatan: Firebase Auth

Instance `auth` dari Firebase Auth (`getAuth(app)`) diinisialisasi di `src/lib/firebase.ts` tetapi **tidak digunakan untuk proses login**. Saat ini hanya inisialisasi saja — potensi pengembangan di masa depan.

---

## 5. Routing & Navigasi

### 5.1 Layout Hierarchy

```
RootLayout (app/layout.tsx)
  └── <AuthProvider>
      └── page (login, dashboard, dll)
      └── DashboardLayout (app/dashboard/layout.tsx)
          ├── <Sidebar />    — Navigasi kiri (collapsible)
          ├── <Header />     — Header atas (search, notif, user)
          └── <main>{children}</main>  — Konten halaman
```

### 5.2 Sidebar Navigasi

Sidebar memiliki 7 item menu dengan ikon dari Lucide React:

1. **Dashboard** (`/dashboard`) — `LayoutDashboard`
2. **Mahasiswa** (`/dashboard/mahasiswa`) — `GraduationCap`
3. **Jadwal** (`/dashboard/jadwal`) — `CalendarClock`
4. **Courses** (`/dashboard/courses`) — `BookOpen`
5. **Dosen** (`/dashboard/dosen`) — `Users`
6. **Room** (`/dashboard/room`) — `DoorOpen`
7. **Administrasi** (`/dashboard/administrasi`) — `Settings`

Sidebar bersifat **collapsible**: saat tidak di-hover lebarnya 64px (hanya ikon), saat di-hover animasi melebar ke 256px menampilkan label teks. Indikator halaman aktif menggunakan animasi `layoutId` dari Framer Motion untuk transisi yang smooth.

---

## 6. Design System

### 6.1 Tema Warna (Glassmorphism)

Aplikasi memiliki tema glassmorphism dengan palet warna navy-orange yang didefinisikan sebagai CSS custom properties di `app/globals.css`:

| Variabel | Warna | Penggunaan |
| --- | --- | --- |
| `--navy-dark` | `#152a45` | Background utama (gradient) |
| `--navy` | `#1e3a5f` | Mid-point gradient |
| `--navy-light` | `#2d4a6f` | Gradient akhir |
| `--orange` | `#f97316` | Aksen: active nav, button, highlight |
| `--orange-light` | `#fb923c` | Variasi aksen |

### 6.2 Efek Glass

Tiga kelas CSS untuk efek glassmorphism:

- **`.glass`** — Background transparan + blur + border subtle (untuk card, modal, table)
- **`.glass-dark`** — Background navy semi-transparan + blur (untuk sidebar)
- **`.glass-light`** — Background putih transparan + blur (untuk elemen input, header)

### 6.3 Animasi (Framer Motion)

- **Sidebar**: Animasi lebar (spring) saat hover
- **Active Nav Indicator**: `layoutId` untuk animasi perpindahan indikator
- **Dashboard Cards**: Animasi staggered fade-in saat load
- **Modal**: Animasi scale + fade saat buka/tutup
- **Loading Skeleton**: Pulse animation

### 6.4 Custom Scrollbar

Scrollbar di-styling dengan warna orange transparan, mengikuti tema aplikasi (lebar 6px, track gelap, thumb oranye).

---

## 7. Alur Kerja Pengembangan

### 7.1 Script yang Tersedia

| Perintah | Deskripsi |
| --- | --- |
| `npm run dev` | Menjalankan development server Next.js |
| `npm run build` | Build produksi |
| `npm run start` | Menjalankan build produksi |
| `npm run lint` | Menjalankan ESLint |

### 7.2 Path Alias

TypeScript dikonfigurasi dengan path alias `@/*` yang merujuk ke root direktori proyek (bukan `src/`). Semua komponen di `components/` diakses dengan:

```typescript
import { AuthProvider } from "@/components/providers/AuthProvider";
import Sidebar from "@/components/ui/Sidebar";
```

### 7.3 Konvensi Komponen

- Semua komponen interaktif menggunakan direktif `"use client"`
- Halaman placeholder (Coming Soon) adalah server component (tanpa `"use client"`)
- State form dikelola dengan `useState` untuk setiap field (controlled components)

---

## 8. Potensi Pengembangan

1. **Firebase Authentication** — Sudah diinisialisasi tapi belum digunakan. Bisa diimplementasikan untuk login multi-user dengan role-based access.
2. **Firestore Security Rules** — Perlu ditambahkan untuk membatasi akses data langsung dari client.
3. **Halaman placeholder** — 4 dari 7 halaman dashboard (`courses`, `dosen`, `room`, `administrasi`) masih berupa placeholder "Coming Soon".
4. **Form validation** — Saat ini belum ada validasi form (misal: NPM harus 10 digit, email harus format valid). Bisa ditambahkan library seperti React Hook Form + Zod.
5. **State management** — Jika aplikasi berkembang besar, pertimbangkan TanStack Query untuk caching dan state management data server.
6. **Error handling** — Wrap operasi Firestore dengan try/catch yang lebih robust dan tampilkan toast/notifikasi error.
