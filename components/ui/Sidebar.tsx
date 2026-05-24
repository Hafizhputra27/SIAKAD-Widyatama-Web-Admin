"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  CalendarClock,
  Users,
  DoorOpen,
  Settings,
  ChevronRight,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Mahasiswa", href: "/dashboard/mahasiswa", icon: GraduationCap },
  { label: "Jadwal", href: "/dashboard/jadwal", icon: CalendarClock },
  { label: "Courses", href: "/dashboard/courses", icon: BookOpen },
  { label: "Dosen", href: "/dashboard/dosen", icon: Users },
  { label: "Room", href: "/dashboard/room", icon: DoorOpen },
  { label: "Administrasi", href: "/dashboard/administrasi", icon: Settings },
];

export default function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const pathname = usePathname();

  return (
    <motion.aside
      initial={false}
      animate={{ width: isExpanded ? 256 : 64 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      className="fixed left-0 top-0 h-screen glass-dark z-40 flex flex-col"
    >
      <div className="h-16 flex items-center justify-center border-b border-white/10">
        <motion.div
          animate={{ opacity: isExpanded ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          className="absolute"
        >
          <span className="text-orange font-bold text-lg">SIAKAD</span>
        </motion.div>
        <div className="w-8 h-8 rounded-lg bg-orange flex items-center justify-center">
          <span className="text-white font-bold text-sm">S</span>
        </div>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`
                    flex items-center h-12 rounded-lg transition-all duration-200 relative group
                    ${isActive
                      ? "bg-orange/20 text-orange"
                      : "text-white/70 hover:text-white hover:bg-white/5"
                    }
                  `}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-orange rounded-r-full"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <div className="w-12 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <motion.span
                    animate={{ opacity: isExpanded ? 1 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-sm font-medium whitespace-nowrap overflow-hidden"
                  >
                    {item.label}
                  </motion.span>
                  {!isExpanded && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-navy-dark text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 border border-white/10">
                      {item.label}
                    </div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="h-16 flex items-center justify-center border-t border-white/10">
        <ChevronRight
          className={`w-4 h-4 text-white/50 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
        />
      </div>
    </motion.aside>
  );
}