"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Calendar,
  QrCode,
  GraduationCap,
  CreditCard,
  Megaphone,
  ChevronDown,
  LogOut,
  Menu,
  X,
  DoorOpen,
} from "lucide-react";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: Users, label: "Mahasiswa", href: "/mahasiswa" },
  { icon: BookOpen, label: "Mata Kuliah", href: "/mata-kuliah" },
  { icon: Calendar, label: "Jadwal", href: "/jadwal" },
  { icon: DoorOpen, label: "Ruangan", href: "/ruangan" },
  {
    icon: QrCode,
    label: "Absensi & QR",
    href: "/absensi",
    submenu: [
      { label: "Generate QR", href: "/absensi/qr" },
      { label: "Rekap Kehadiran", href: "/absensi" },
    ],
  },
  { icon: GraduationCap, label: "Nilai", href: "/nilai" },
  { icon: CreditCard, label: "Tagihan", href: "/tagihan" },
  { icon: Megaphone, label: "Pengumuman", href: "/pengumuman" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  };

  const toggleSubmenu = (label: string) => {
    setExpandedMenu((prev) => (prev === label ? null : label));
  };

  const navContent = (
    <>
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-white/10">
        <GraduationCap className="w-6 h-6 text-[#2563EB] mr-3" />
        <span className="text-white font-bold text-lg">SIAKAD</span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const active = isActive(item.href);
            const hasSubmenu = item.submenu && item.submenu.length > 0;
            const isExpanded = expandedMenu === item.label;

            return (
              <li key={item.href}>
                {hasSubmenu ? (
                  <>
                    <button
                      onClick={() => toggleSubmenu(item.label)}
                      className={cn(
                        "flex items-center w-full rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        active
                          ? "text-white"
                          : "text-slate-300 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <item.icon className="w-5 h-5 mr-3 flex-shrink-0" />
                      <span className="flex-1 text-left">{item.label}</span>
                      <ChevronDown
                        className={cn(
                          "w-4 h-4 transition-transform duration-200",
                          isExpanded && "rotate-180"
                        )}
                      />
                    </button>
                    {isExpanded && (
                      <ul className="mt-1 ml-8 space-y-1">
                        {item.submenu?.map((sub) => (
                          <li key={sub.href}>
                            <Link
                              href={sub.href}
                              onClick={() => setMobileOpen(false)}
                              className={cn(
                                "block rounded-lg px-3 py-2 text-sm transition-colors",
                                pathname === sub.href
                                  ? "bg-[#2563EB] text-white"
                                  : "text-slate-400 hover:bg-white/10 hover:text-white"
                              )}
                            >
                              {sub.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-[#2563EB] text-white"
                        : "text-slate-300 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <item.icon className="w-5 h-5 mr-3 flex-shrink-0" />
                    {item.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User info & logout */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-[#2563EB] flex items-center justify-center text-white text-sm font-medium">
            {user?.name?.charAt(0)?.toUpperCase() || "A"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user?.name || "Admin"}
            </p>
            <p className="text-xs text-slate-400 truncate">
              {user?.role || "Admin"}
            </p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center w-full rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4 mr-3" />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-[#1B2E4B] text-white shadow-lg"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:sticky left-0 top-0 h-screen w-64 bg-[#1B2E4B] flex flex-col z-40 transition-transform duration-300",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {navContent}
      </aside>
    </>
  );
}
