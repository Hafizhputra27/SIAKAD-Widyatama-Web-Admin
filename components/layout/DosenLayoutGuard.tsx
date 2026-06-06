"use client";

import { useDosenAuth } from "@/components/providers/DosenAuthProvider";
import { Loader2 } from "lucide-react";
import { ReactNode } from "react";

export default function DosenLayoutGuard({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useDosenAuth();

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
