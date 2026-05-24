"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "react-hot-toast";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import { Loader2, Plus, Trash2, Save, CheckCircle, AlertCircle, XCircle, Clock, FileSpreadsheet } from "lucide-react";

interface TagihanItem {
  nama: string;
  jumlah: number;
}

interface TagihanRow {
  id: string;
  npm: string;
  mahasiswaName: string;
  semester: number;
  total: number;
  status: "LUNAS" | "BELUM_LUNAS" | "PROSES";
  jatuhTempo: Date;
  items: TagihanItem[];
}

const STATUS_COLORS: Record<string, string> = {
  LUNAS: "bg-green-100 text-green-700",
  BELUM_LUNAS: "bg-red-100 text-red-700",
  PROSES: "bg-yellow-100 text-yellow-700",
};

export default function TagihanPage() {
  const [tagihanList, setTagihanList] = useState<TagihanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSemester, setFilterSemester] = useState("");
  const [summary, setSummary] = useState({ totalLunas: 0, totalBelumLunas: 0, totalProses: 0, totalNominal: 0 });

  // Form buat tagihan
  const [semester, setSemester] = useState("1");
  const [items, setItems] = useState<TagihanItem[]>([{ nama: "SPP", jumlah: 3500000 }]);
  const [jatuhTempo, setJatuhTempo] = useState("");
  const [target, setTarget] = useState<"single" | "all">("all");
  const [targetNpm, setTargetNpm] = useState("");
  const [creating, setCreating] = useState(false);

  // Update dialog
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [selectedTagihan, setSelectedTagihan] = useState<TagihanRow | null>(null);
  const [newStatus, setNewStatus] = useState("");

  useEffect(() => {
    setLoading(true);
    // Fetch dari API
    fetch("/api/tagihan")
      .then((res) => res.json())
      .then((data) => {
        setTagihanList(data.data || []);
        setSummary(data.summary || { totalLunas: 0, totalBelumLunas: 0, totalProses: 0, totalNominal: 0 });
        setLoading(false);
      })
      .catch(() => {
        setTagihanList([]);
        setLoading(false);
      });
  }, []);

  const filteredTagihan = tagihanList.filter((t) => {
    if (filterStatus && filterStatus !== "all" && t.status !== filterStatus) return false;
    if (filterSemester && filterSemester !== "all" && t.semester !== parseInt(filterSemester)) return false;
    return true;
  });

  const totalItems = items.reduce((sum, item) => sum + (item.jumlah || 0), 0);

  const addItem = () => setItems([...items, { nama: "", jumlah: 0 }]);
  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));
  const updateItem = (index: number, field: keyof TagihanItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleCreate = async () => {
    if (items.some((i) => !i.nama || !i.jumlah)) {
      toast.error("Semua item harus diisi");
      return;
    }

    setCreating(true);
    try {
      if (target === "all") {
        const res = await fetch("/api/tagihan/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ semester: parseInt(semester), items, jatuhTempo }),
        });
        if (res.ok) {
          const data = await res.json();
          toast.success(data.message);
        } else {
          throw new Error("Gagal");
        }
      } else {
        const res = await fetch(`/api/tagihan/${targetNpm}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ semester: parseInt(semester), items, jatuhTempo, total: totalItems }),
        });
        if (res.ok) {
          toast.success("Tagihan berhasil dibuat");
        } else {
          throw new Error("Gagal");
        }
      }
    } catch {
      toast.error("Gagal membuat tagihan");
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedTagihan || !newStatus) return;
    try {
      const res = await fetch(`/api/tagihan/${selectedTagihan.npm}/${selectedTagihan.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        toast.success("Status tagihan diupdate");
        setUpdateDialogOpen(false);
      } else {
        throw new Error("Gagal");
      }
    } catch {
      toast.error("Gagal mengupdate status");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1B2E4B]">Manajemen Tagihan</h2>
          <p className="text-sm text-slate-500 mt-1">Kelola tagihan dan pembayaran mahasiswa</p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="overview">Overview Tagihan</TabsTrigger>
          <TabsTrigger value="create">Buat Tagihan Baru</TabsTrigger>
        </TabsList>

        {/* Tab 1: Overview */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-600">Lunas</p>
                    <p className="text-2xl font-bold text-green-700">{summary.totalLunas}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-red-600">Belum Lunas</p>
                    <p className="text-2xl font-bold text-red-700">{summary.totalBelumLunas}</p>
                  </div>
                  <XCircle className="w-8 h-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-yellow-600">Proses</p>
                    <p className="text-2xl font-bold text-yellow-700">{summary.totalProses}</p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Total Nominal</p>
                    <p className="text-2xl font-bold text-[#1B2E4B]">
                      Rp {(summary.totalNominal / 1000000).toFixed(1)}M
                    </p>
                  </div>
                  <AlertCircle className="w-8 h-8 text-slate-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex gap-3">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="LUNAS">Lunas</SelectItem>
                <SelectItem value="BELUM_LUNAS">Belum Lunas</SelectItem>
                <SelectItem value="PROSES">Proses</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterSemester} onValueChange={setFilterSemester}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Semester" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                {Array.from({ length: 8 }, (_, i) => (
                  <SelectItem key={i + 1} value={(i + 1).toString()}>
                    Semester {i + 1}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tabel */}
          <div className="rounded-lg border bg-white">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">NPM</th>
                      <th className="px-4 py-3 text-left font-medium">Nama</th>
                      <th className="px-4 py-3 text-left font-medium">Semester</th>
                      <th className="px-4 py-3 text-left font-medium">Total</th>
                      <th className="px-4 py-3 text-left font-medium">Status</th>
                      <th className="px-4 py-3 text-left font-medium">Jatuh Tempo</th>
                      <th className="px-4 py-3 text-left font-medium">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredTagihan.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                          Tidak ada data tagihan
                        </td>
                      </tr>
                    ) : (
                      filteredTagihan.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50">
                          <td className="px-4 py-2 font-mono">{t.npm}</td>
                          <td className="px-4 py-2">{t.mahasiswaName}</td>
                          <td className="px-4 py-2">Semester {t.semester}</td>
                          <td className="px-4 py-2">Rp {t.total.toLocaleString()}</td>
                          <td className="px-4 py-2">
                            <Badge className={STATUS_COLORS[t.status] || ""}>{t.status}</Badge>
                          </td>
                          <td className="px-4 py-2">
                            {t.jatuhTempo ? new Date(t.jatuhTempo).toLocaleDateString("id-ID") : "-"}
                          </td>
                          <td className="px-4 py-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedTagihan(t);
                                setNewStatus(t.status);
                                setUpdateDialogOpen(true);
                              }}
                            >
                              Update
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Tab 2: Buat Tagihan */}
        <TabsContent value="create" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Form Buat Tagihan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Semester</Label>
                  <Select value={semester} onValueChange={setSemester}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 8 }, (_, i) => (
                        <SelectItem key={i + 1} value={(i + 1).toString()}>
                          Semester {i + 1}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Jatuh Tempo</Label>
                  <Input type="date" value={jatuhTempo} onChange={(e) => setJatuhTempo(e.target.value)} />
                </div>
              </div>

              {/* Items */}
              <div className="space-y-2">
                <Label>Items Tagihan</Label>
                {items.map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="Nama item (e.g. SPP)"
                      value={item.nama}
                      onChange={(e) => updateItem(index, "nama", e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      placeholder="Nominal"
                      value={item.jumlah}
                      onChange={(e) => updateItem(index, "jumlah", parseInt(e.target.value) || 0)}
                      className="w-40"
                    />
                    <Button variant="ghost" size="sm" onClick={() => removeItem(index)} disabled={items.length === 1}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addItem}>
                  <Plus className="w-4 h-4 mr-1" />
                  Tambah Item
                </Button>
              </div>

              {/* Total */}
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="font-medium">
                  Total: <span className="text-[#2563EB]">Rp {totalItems.toLocaleString()}</span>
                </p>
              </div>

              {/* Target */}
              <div className="space-y-2">
                <Label>Target</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={target === "all"}
                      onChange={() => setTarget("all")}
                    />
                    <span>Semua Mahasiswa Aktif</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={target === "single"}
                      onChange={() => setTarget("single")}
                    />
                    <span>Satu Mahasiswa</span>
                  </label>
                </div>
                {target === "single" && (
                  <Input
                    placeholder="Masukkan NPM"
                    value={targetNpm}
                    onChange={(e) => setTargetNpm(e.target.value)}
                  />
                )}
              </div>

              <Button
                onClick={handleCreate}
                disabled={creating}
                className="w-full bg-[#2563EB] hover:bg-[#1d4ed8]"
              >
                {creating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {target === "all" ? "Buat Tagihan untuk Semua Mahasiswa" : "Buat Tagihan"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Update Dialog */}
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Status Tagihan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-slate-500">
              {selectedTagihan?.mahasiswaName} — Rp {selectedTagihan?.total.toLocaleString()}
            </p>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LUNAS">Lunas</SelectItem>
                <SelectItem value="BELUM_LUNAS">Belum Lunas</SelectItem>
                <SelectItem value="PROSES">Proses</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleUpdateStatus} className="w-full bg-[#2563EB]">
              Update Status
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
