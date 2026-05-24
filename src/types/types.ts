export interface Student {
  id: string;
  name: string;
  npm: string;
  major: string;
  campusEmail: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Course {
  code: string;
  name: string;
  sks: number;
  day: string;
  time: string;
  room: string;
  lecturer: string;
}

export type DayOfWeek = "Senin" | "Selasa" | "Rabu" | "Kamis" | "Jumat" | "Sabtu" | "Minggu";

export interface NavItem {
  label: string;
  href: string;
  icon: string;
}