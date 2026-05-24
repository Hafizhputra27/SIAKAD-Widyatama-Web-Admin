import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { Toaster } from "react-hot-toast";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Auth guard: cek session cookie di server
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;
  const legacyCookie = cookieStore.get("siakad-auth")?.value;

  if (!sessionCookie && legacyCookie !== "authenticated") {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
        <Header />
        <main className="flex-1 p-6">{children}</main>
        <Toaster position="top-right" />
      </div>
    </div>
  );
}
