"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { Loader2 } from "lucide-react";
import { ReactNode } from "react";

export default function AdminLayoutGuard({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] w-full">
        <Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
