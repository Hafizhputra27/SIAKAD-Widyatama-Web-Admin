/**
 * Hitung 16 tanggal pertemuan berurutan berdasarkan hari dan jam.
 * Mengasumsikan semester mulai dari tanggal tertentu (default: hari ini + offset ke hari yang diminta).
 */

const DAY_MAP: Record<string, number> = {
  Minggu: 0,
  Senin: 1,
  Selasa: 2,
  Rabu: 3,
  Kamis: 4,
  Jumat: 5,
  Sabtu: 6,
};

function getNextDayDate(targetDayName: string, fromDate: Date = new Date()): Date {
  const targetDay = DAY_MAP[targetDayName];
  if (targetDay === undefined) {
    throw new Error(`Nama hari tidak valid: ${targetDayName}`);
  }

  const result = new Date(fromDate);
  result.setHours(0, 0, 0, 0);

  const currentDay = result.getDay();
  let daysUntilTarget = targetDay - currentDay;
  if (daysUntilTarget <= 0) {
    daysUntilTarget += 7; // mulai dari minggu depan jika hari ini sudah lewat atau sama
  }

  result.setDate(result.getDate() + daysUntilTarget);
  return result;
}

/**
 * Generate 16 tanggal pertemuan.
 * @param hari - Nama hari dalam bahasa Indonesia (Senin, Selasa, ...)
 * @param jamMulai - Jam mulai dalam format "HH:mm"
 * @param jamSelesai - Jam selesai dalam format "HH:mm"
 * @param startDate - Tanggal mulai semester (opsional, default hari ini)
 * @returns Array of { tanggal: Date, jamMulai: string, jamSelesai: string }
 */
export function generatePertemuanDates(
  hari: string,
  jamMulai: string,
  jamSelesai: string,
  startDate?: Date
): Array<{ tanggal: Date; jamMulai: string; jamSelesai: string }> {
  const firstDate = getNextDayDate(hari, startDate || new Date());
  const [startHour, startMinute] = jamMulai.split(":").map(Number);
  const [endHour, endMinute] = jamSelesai.split(":").map(Number);

  const results = [];
  for (let i = 0; i < 16; i++) {
    const pertemuanDate = new Date(firstDate);
    pertemuanDate.setDate(firstDate.getDate() + i * 7);

    const tanggalMulai = new Date(pertemuanDate);
    tanggalMulai.setHours(startHour, startMinute, 0, 0);

    results.push({
      tanggal: tanggalMulai,
      jamMulai,
      jamSelesai,
    });
  }

  return results;
}
