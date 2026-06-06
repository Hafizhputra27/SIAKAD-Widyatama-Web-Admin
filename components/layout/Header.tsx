"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Bell, ChevronRight } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const pageTitleMap: Record<string, string> = {
  "/": "Dashboard",
  "/mahasiswa": "Data Mahasiswa",
  "/mata-kuliah": "Mata Kuliah",
  "/absensi": "Rekap Absensi",
  "/absensi/qr": "Generate QR Absensi",
  "/nilai": "Nilai Mahasiswa",
  "/tagihan": "Tagihan Mahasiswa",
  "/pengumuman": "Pengumuman Kampus",
};

function getPageTitle(pathname: string): string {
  if (pageTitleMap[pathname]) return pageTitleMap[pathname];
  // Handle dynamic routes
  if (pathname.startsWith("/mahasiswa/")) return "Detail Mahasiswa";
  if (pathname.startsWith("/mata-kuliah/")) return "Detail Mata Kuliah";
  return "Dashboard";
}

interface BreadcrumbItem {
  label: string;
  href?: string;
}

function getBreadcrumb(pathname: string): BreadcrumbItem[] {
  const crumbs: BreadcrumbItem[] = [{ label: "Dashboard", href: "/" }];
  const parts = pathname.split("/").filter(Boolean);

  if (parts.length === 0) return [{ label: "Dashboard" }];

  const section = parts[0];
  const sectionLabels: Record<string, string> = {
    mahasiswa: "Mahasiswa",
    "mata-kuliah": "Mata Kuliah",
    absensi: "Absensi",
    nilai: "Nilai",
    tagihan: "Tagihan",
    pengumuman: "Pengumuman",
  };

  if (sectionLabels[section]) {
    crumbs.push({ label: sectionLabels[section] });
  }

  // If dynamic route, show last part
  if (parts.length > 1 && parts[1] !== "qr") {
    crumbs.push({ label: parts[parts.length - 1] });
  }

  return crumbs;
}

export default function Header() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const title = getPageTitle(pathname);
  const breadcrumbs = getBreadcrumb(pathname);

  return (
    <header className="h-16 bg-white border-b flex items-center justify-between px-6 lg:ml-0">
      <div>
        <h1 className="text-lg font-semibold text-[#1B2E4B]">{title}</h1>
        <nav className="flex items-center text-xs text-slate-400 mt-0.5">
          {breadcrumbs.map((crumb, index) => (
            <span key={index} className="flex items-center">
              {index > 0 && <ChevronRight className="w-3 h-3 mx-1" />}
              {crumb.href ? (
                <a href={crumb.href} className="hover:text-[#2563EB]">
                  {crumb.label}
                </a>
              ) : (
                <span>{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-4">
        {/* Notification bell */}
        <button className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors">
          <Bell className="w-5 h-5 text-slate-500" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
              <div className="w-8 h-8 rounded-full bg-[#2563EB] flex items-center justify-center text-white text-sm font-medium">
                {user?.name?.charAt(0)?.toUpperCase() || "A"}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-slate-700">
                  {user?.name || "Admin"}
                </p>
                <p className="text-xs text-slate-400">
                  {user?.role || "Admin"}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={logout} className="text-red-600 cursor-pointer">
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
