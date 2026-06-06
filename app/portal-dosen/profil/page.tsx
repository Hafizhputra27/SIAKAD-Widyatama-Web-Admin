"use client";

import { useDosenAuth } from "@/hooks/useDosenAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCircle, Mail, GraduationCap, Building } from "lucide-react";

export default function DosenProfilPage() {
  const { user } = useDosenAuth();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1B2E4B]">Profil Dosen</h2>
        <p className="text-sm text-slate-500 mt-1">Informasi akun dosen</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data Pribadi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
            <div className="w-12 h-12 rounded-full bg-[#2563EB] flex items-center justify-center text-white text-lg font-bold">
              {user?.name?.charAt(0)?.toUpperCase() || "D"}
            </div>
            <div>
              <p className="font-medium text-lg">{user?.name}</p>
              <p className="text-sm text-slate-500">{user?.title}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <GraduationCap className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">NIDN</p>
                <p className="font-medium">{user?.nidn}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <Mail className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Email</p>
                <p className="font-medium">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <Building className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Departemen</p>
                <p className="font-medium">{user?.department || "-"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <UserCircle className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Role</p>
                <p className="font-medium capitalize">{user?.role}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
