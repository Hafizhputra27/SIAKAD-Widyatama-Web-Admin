"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "react-hot-toast";
import {
  Loader2,
  Plus,
  Search,
  Pencil,
  Trash2,
  DoorOpen,
} from "lucide-react";
import RoomFormDialog from "@/components/rooms/RoomFormDialog";

interface Room {
  id: string;
  roomName: string;
  building: string;
  floor: number;
}

export default function RuanganPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog States
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [selectedRoom, setSelectedRoom] = useState<Room | undefined>(undefined);

  // Fetch rooms data in real-time
  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(
      collection(db, "rooms"),
      (snapshot) => {
        const list = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Room[];
        // Sort rooms by building, then floor, then name
        list.sort((a, b) => {
          const bCompare = a.building.localeCompare(b.building);
          if (bCompare !== 0) return bCompare;
          const fCompare = a.floor - b.floor;
          if (fCompare !== 0) return fCompare;
          return a.roomName.localeCompare(b.roomName);
        });
        setRooms(list);
        setLoading(false);
      },
      (error) => {
        console.error("Firestore snapshot error:", error);
        toast.error("Gagal memuat data ruangan");
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // Filtered rooms based on search query
  const filteredRooms = useMemo(() => {
    if (!searchQuery) return rooms;
    const query = searchQuery.toLowerCase();
    return rooms.filter(
      (room) =>
        room.id.toLowerCase().includes(query) ||
        room.roomName.toLowerCase().includes(query) ||
        room.building.toLowerCase().includes(query)
    );
  }, [rooms, searchQuery]);

  // Handle room deletion
  const handleDelete = async (id: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus ruangan ${id}?`)) return;

    try {
      const res = await fetch(`/api/rooms/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Ruangan berhasil dihapus");
      } else {
        const error = await res.json();
        throw new Error(error.error || "Gagal menghapus");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan");
    }
  };

  const openCreateDialog = () => {
    setSelectedRoom(undefined);
    setDialogMode("create");
    setDialogOpen(true);
  };

  const openEditDialog = (room: Room) => {
    setSelectedRoom(room);
    setDialogMode("edit");
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1B2E4B]">Data Ruangan</h2>
          <p className="text-sm text-slate-500 mt-1">
            Kelola data ruangan kelas dan gedung perkuliahan
          </p>
        </div>
        <Button onClick={openCreateDialog} className="bg-[#2563EB] hover:bg-[#1d4ed8]">
          <Plus className="w-4 h-4 mr-2" />
          Tambah Ruangan
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex items-center gap-3 bg-white p-4 rounded-lg border">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Cari kode, nama, atau gedung..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-lg border bg-white overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" />
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 space-y-2">
            <DoorOpen className="w-12 h-12 opacity-30" />
            <p>Tidak ada data ruangan</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50 border-b">
              <TableRow>
                <TableHead className="w-[150px] font-semibold text-[#1B2E4B]">
                  Kode Ruangan
                </TableHead>
                <TableHead className="font-semibold text-[#1B2E4B]">
                  Nama Ruangan
                </TableHead>
                <TableHead className="font-semibold text-[#1B2E4B]">
                  Gedung
                </TableHead>
                <TableHead className="font-semibold text-[#1B2E4B]">
                  Lantai
                </TableHead>
                <TableHead className="w-[120px] text-right font-semibold text-[#1B2E4B]">
                  Aksi
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRooms.map((room) => (
                <TableRow key={room.id} className="hover:bg-slate-50/50">
                  <TableCell className="font-mono font-medium text-slate-900">
                    {room.id}
                  </TableCell>
                  <TableCell className="text-slate-700">{room.roomName}</TableCell>
                  <TableCell className="text-slate-700">{room.building}</TableCell>
                  <TableCell className="text-slate-700">Lantai {room.floor}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => openEditDialog(room)}
                      >
                        <Pencil className="h-4 w-4 text-slate-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleDelete(room.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <RoomFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        initialData={selectedRoom}
        onSuccess={() => {
          // data is updated in real-time via onSnapshot
        }}
      />
    </div>
  );
}
