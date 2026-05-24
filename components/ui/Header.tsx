"use client";

import { Bell, Search, LogOut, User } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useRouter } from "next/navigation";

export default function Header() {
  const { logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <header className="fixed top-0 right-0 h-16 glass-light z-30 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="w-4 h-4 text-white/50 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search..."
            className="h-9 pl-10 pr-4 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-orange/50 focus:bg-white/10 transition-all w-64"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:text-orange hover:border-orange/50 transition-all">
          <Bell className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-white/10" />

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-orange/20 border border-orange/30 flex items-center justify-center">
            <User className="w-4 h-4 text-orange" />
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-white">Admin</p>
            <p className="text-xs text-white/50">Administrator</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:text-red-400 hover:border-red-400/50 transition-all"
          title="Logout"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}