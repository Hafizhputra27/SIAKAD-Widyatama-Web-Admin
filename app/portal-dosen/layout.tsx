import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import DosenSidebar from "@/components/layout/DosenSidebar";
import { Toaster } from "react-hot-toast";
import DosenLayoutGuard from "@/components/layout/DosenLayoutGuard";

export default async function DosenLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Auth guard: cek dosen session cookie di server
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("dosen_session")?.value;

  if (!sessionCookie) {
    redirect("/login-dosen");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <DosenSidebar />
      <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
        <main className="flex-1 p-6">
          <DosenLayoutGuard>{children}</DosenLayoutGuard>
        </main>
        <Toaster position="top-right" />
      </div>
    </div>
  );
}
