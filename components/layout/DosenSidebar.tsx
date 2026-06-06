"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDosenAuth } from "@/hooks/useDosenAuth";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Calendar,
  GraduationCap,
  Users,
  UserCircle,
  LogOut,
  Menu,
  X,
} from "lucide-react";

interface MenuItem {
  icon: React.ElementType;
  label: string;
  href: string;
  exact?: boolean;
}

const menuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/portal-dosen", exact: true },
  { icon: Calendar, label: "Jadwal", href: "/portal-dosen/jadwal" },
  { icon: GraduationCap, label: "Pertemuan", href: "/portal-dosen/pertemuan" },
  { icon: GraduationCap, label: "Nilai", href: "/portal-dosen/nilai" },
  { icon: Users, label: "Presensi", href: "/portal-dosen/presensi" },
  { icon: UserCircle, label: "Profil", href: "/portal-dosen/profil", exact: true },
];

export default function DosenSidebar() {
  const pathname = usePathname();
  const { user, logout } = useDosenAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  };

  const navContent = (
    <>
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-white/10">
        <GraduationCap className="w-6 h-6 text-[#2563EB] mr-3" />
        <span className="text-white font-bold text-lg">SIAKAD Dosen</span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const active = isActive(item.href, item.exact);
            return (
              <li key={item.href}>
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
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User info & logout */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-[#2563EB] flex items-center justify-center text-white text-sm font-medium">
            {user?.name?.charAt(0)?.toUpperCase() || "D"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user?.name || "Dosen"}
            </p>
            <p className="text-xs text-slate-400 truncate">
              {user?.nidn || "NIDN"}
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
