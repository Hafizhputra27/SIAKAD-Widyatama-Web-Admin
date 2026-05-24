"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "react-hot-toast";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import { Plus, Pencil, Trash2, Megaphone, Loader2, Save } from "lucide-react";

interface Pengumuman {
  id: string;
  title: string;
  content: string;
  isActive: boolean;
  createdAt: Date;
}

export default function PengumumanPage() {
  const [pengumumanList, setPengumumanList] = useState<Pengumuman[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(
      collection(db, "pengumuman"),
      (snap) => {
        const data = snap.docs
          .map((d) => {
            const dt = d.data();
            return {
              id: d.id,
              title: dt.title || "",
              content: dt.content || "",
              isActive: dt.isActive !== false,
              createdAt: dt.createdAt?.toDate?.() ? dt.createdAt.toDate() : new Date(),
            } as Pengumuman;
          })
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setPengumumanList(data);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const resetForm = () => {
    setTitle("");
    setContent("");
    setIsActive(true);
    setEditMode(false);
    setEditId("");
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (p: Pengumuman) => {
    setTitle(p.title);
    setContent(p.content);
    setIsActive(p.isActive);
    setEditId(p.id);
    setEditMode(true);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error("Judul dan konten wajib diisi");
      return;
    }

    setSaving(true);
    try {
      const url = editMode ? `/api/pengumuman/${editId}` : "/api/pengumuman";
      const method = editMode ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, isActive }),
      });

      if (res.ok) {
        toast.success(editMode ? "Pengumuman diupdate" : "Pengumuman dibuat");
        setDialogOpen(false);
        resetForm();
      } else {
        throw new Error("Gagal");
      }
    } catch {
      toast.error("Gagal menyimpan pengumuman");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: string, current: boolean) => {
    try {
      const res = await fetch(`/api/pengumuman/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !current }),
      });
      if (res.ok) {
        toast.success("Status pengumuman diupdate");
      }
    } catch {
      toast.error("Gagal mengupdate status");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus pengumuman ini?")) return;
    try {
      const res = await fetch(`/api/pengumuman/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Pengumuman dihapus");
      }
    } catch {
      toast.error("Gagal menghapus");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1B2E4B]">Pengumuman</h2>
          <p className="text-sm text-slate-500 mt-1">Kelola pengumuman kampus</p>
        </div>
        <Button className="bg-[#2563EB] hover:bg-[#1d4ed8]" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Buat Pengumuman
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" />
        </div>
      ) : pengumumanList.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Belum ada pengumuman</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pengumumanList.map((p) => (
            <div
              key={p.id}
              className={`rounded-lg border p-5 transition-shadow hover:shadow-md ${
                p.isActive ? "bg-white" : "bg-slate-50 opacity-70"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[#1B2E4B] truncate">{p.title}</h3>
                  <p className="text-sm text-slate-500 mt-1 line-clamp-2">{p.content}</p>
                  <p className="text-xs text-slate-400 mt-2">
                    {p.createdAt.toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge className={p.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}>
                    {p.isActive ? "Aktif" : "Nonaktif"}
                  </Badge>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(p)}>
                      <Pencil className="w-4 h-4 text-slate-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleToggle(p.id, p.isActive)}
                    >
                      <Megaphone className="w-4 h-4 text-blue-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleDelete(p.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editMode ? "Edit Pengumuman" : "Buat Pengumuman Baru"}</DialogTitle>
            <DialogDescription>
              {editMode ? "Ubah detail pengumuman" : "Tambahkan pengumuman baru untuk mahasiswa"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Judul</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul pengumuman" />
            </div>
            <div className="space-y-2">
              <Label>Konten</Label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Isi pengumuman..."
                rows={5}
                className="w-full px-3 py-2 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <Label className="font-normal cursor-pointer">Publish sekarang</Label>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full bg-[#2563EB] hover:bg-[#1d4ed8]">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {editMode ? "Simpan Perubahan" : "Buat Pengumuman"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
