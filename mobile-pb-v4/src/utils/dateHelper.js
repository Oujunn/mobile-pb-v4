/*
|--------------------------------------------------------------------------
| Date Helper Utilities — Format Indonesia & Kompatibilitas Web V3
|--------------------------------------------------------------------------
*/

export const INDONESIAN_MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

/**
 * Format string tanggal YYYY-MM-DD ke format Indonesia (contoh: "3 November 2004")
 */
export function formatIndonesianDate(dateString) {
  if (!dateString || typeof dateString !== 'string') return '';
  const trimmed = dateString.trim();
  if (!trimmed || trimmed === '-' || trimmed === 'null' || trimmed === 'Belum diisi') {
    return '';
  }

  // Cek format YYYY-MM-DD
  const parts = trimmed.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day) && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${day} ${INDONESIAN_MONTHS[month - 1]} ${year}`;
    }
  }

  // Fallback: parse via Date object
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    const day = d.getDate();
    const month = d.getMonth();
    const year = d.getFullYear();
    return `${day} ${INDONESIAN_MONTHS[month]} ${year}`;
  }

  return trimmed;
}

/**
 * Konversi Date object atau string ke format YYYY-MM-DD (format standar Web V3 & database)
 */
export function toYYYYMMDD(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Parse string tanggal ke Date object yang aman (default ke tahun 2000 jika kosong/invalid)
 */
export function parseDateSafe(dateString, defaultYear = 2000) {
  if (!dateString || typeof dateString !== 'string') {
    return new Date(defaultYear, 0, 1);
  }
  const parts = dateString.trim().split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      const dt = new Date(y, m, d);
      if (!isNaN(dt.getTime())) return dt;
    }
  }
  const fallback = new Date(dateString);
  return isNaN(fallback.getTime()) ? new Date(defaultYear, 0, 1) : fallback;
}

