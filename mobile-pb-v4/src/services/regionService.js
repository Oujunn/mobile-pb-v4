/*
|--------------------------------------------------------------------------
| Region Service — Indonesian Cascading Administrative Divisions
|--------------------------------------------------------------------------
| 100% Free & Open-Source Indonesian Administrative Dataset (emsifa/api-wilayah-indonesia)
| License: MIT (Zero cost, no API keys, static JSON served over CDN)
| Includes offline fallbacks, in-memory caching, and postal code auto-lookup.
*/

const BASE_URL = 'https://www.emsifa.com/api-wilayah-indonesia/api';
const POSTAL_API_URL = 'https://kodepos.vercel.app/search';

// In-memory cache to guarantee instant response and reduce network calls
const cache = {
  provinces: null,
  regencies: {},
  districts: {},
  villages: {},
  postalCodes: {},
};

// Embedded 34 Indonesian Provinces as offline fallback
const FALLBACK_PROVINCES = [
  { id: '11', name: 'ACEH' },
  { id: '12', name: 'SUMATERA UTARA' },
  { id: '13', name: 'SUMATERA BARAT' },
  { id: '14', name: 'RIAU' },
  { id: '15', name: 'JAMBI' },
  { id: '16', name: 'SUMATERA SELATAN' },
  { id: '17', name: 'BENGKULU' },
  { id: '18', name: 'LAMPUNG' },
  { id: '19', name: 'KEPULAUAN BANGKA BELITUNG' },
  { id: '21', name: 'KEPULAUAN RIAU' },
  { id: '31', name: 'DKI JAKARTA' },
  { id: '32', name: 'JAWA BARAT' },
  { id: '33', name: 'JAWA TENGAH' },
  { id: '34', name: 'DI YOGYAKARTA' },
  { id: '35', name: 'JAWA TIMUR' },
  { id: '36', name: 'BANTEN' },
  { id: '51', name: 'BALI' },
  { id: '52', name: 'NUSA TENGGARA BARAT' },
  { id: '53', name: 'NUSA TENGGARA TIMUR' },
  { id: '61', name: 'KALIMANTAN BARAT' },
  { id: '62', name: 'KALIMANTAN TENGAH' },
  { id: '63', name: 'KALIMANTAN SELATAN' },
  { id: '64', name: 'KALIMANTAN TIMUR' },
  { id: '65', name: 'KALIMANTAN UTARA' },
  { id: '71', name: 'SULAWESI UTARA' },
  { id: '72', name: 'SULAWESI TENGAH' },
  { id: '73', name: 'SULAWESI SELATAN' },
  { id: '74', name: 'SULAWESI TENGGARA' },
  { id: '75', name: 'GORONTALO' },
  { id: '76', name: 'SULAWESI BARAT' },
  { id: '81', name: 'MALUKU' },
  { id: '82', name: 'MALUKU UTARA' },
  { id: '91', name: 'PAPUA BARAT' },
  { id: '94', name: 'PAPUA' },
];

/**
 * Format ALL CAPS strings into clean Title Case
 * e.g. "KABUPATEN BANTUL" -> "Kabupaten Bantul"
 * "DI YOGYAKARTA" -> "DI Yogyakarta"
 */
export function toTitleCase(str) {
  if (!str) return '';
  const s = String(str).trim();
  // Special acronyms
  if (/^DKI\b/i.test(s)) return s.replace(/^DKI\s+/i, 'DKI ');
  if (/^DI\b/i.test(s)) return s.replace(/^DI\s+/i, 'DI ');

  return s
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * 1. Fetch Provinces
 */
export async function getProvinces() {
  if (cache.provinces && cache.provinces.length > 0) {
    return cache.provinces;
  }

  try {
    const res = await fetch(`${BASE_URL}/provinces.json`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const formatted = data.map((item) => ({
      id: String(item.id),
      name: toTitleCase(item.name),
      rawName: item.name,
    }));
    cache.provinces = formatted;
    return formatted;
  } catch (err) {
    console.warn('[getProvinces] network failed, using embedded fallback:', err?.message);
    const fallback = FALLBACK_PROVINCES.map((p) => ({
      id: p.id,
      name: toTitleCase(p.name),
      rawName: p.name,
    }));
    cache.provinces = fallback;
    return fallback;
  }
}

/**
 * 2. Fetch Regencies (Kabupaten / Kota) for a selected province
 */
export async function getRegencies(provinceId) {
  if (!provinceId) return [];
  if (cache.regencies[provinceId]) {
    return cache.regencies[provinceId];
  }

  try {
    const res = await fetch(`${BASE_URL}/regencies/${provinceId}.json`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const formatted = data.map((item) => ({
      id: String(item.id),
      provinceId: String(item.province_id),
      name: toTitleCase(item.name),
      rawName: item.name,
    }));
    cache.regencies[provinceId] = formatted;
    return formatted;
  } catch (err) {
    console.warn(`[getRegencies] error for prov ${provinceId}:`, err?.message);
    return [];
  }
}

/**
 * 3. Fetch Districts (Kecamatan) for a selected regency
 */
export async function getDistricts(regencyId) {
  if (!regencyId) return [];
  if (cache.districts[regencyId]) {
    return cache.districts[regencyId];
  }

  try {
    const res = await fetch(`${BASE_URL}/districts/${regencyId}.json`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const formatted = data.map((item) => ({
      id: String(item.id),
      regencyId: String(item.regency_id),
      name: toTitleCase(item.name),
      rawName: item.name,
    }));
    cache.districts[regencyId] = formatted;
    return formatted;
  } catch (err) {
    console.warn(`[getDistricts] error for regency ${regencyId}:`, err?.message);
    return [];
  }
}

/**
 * 4. Fetch Villages (Kelurahan / Desa) for a selected district
 */
export async function getVillages(districtId) {
  if (!districtId) return [];
  if (cache.villages[districtId]) {
    return cache.villages[districtId];
  }

  try {
    const res = await fetch(`${BASE_URL}/villages/${districtId}.json`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const formatted = data.map((item) => ({
      id: String(item.id),
      districtId: String(item.district_id),
      name: toTitleCase(item.name),
      rawName: item.name,
    }));
    cache.villages[districtId] = formatted;
    return formatted;
  } catch (err) {
    console.warn(`[getVillages] error for district ${districtId}:`, err?.message);
    return [];
  }
}

/**
 * 5. Lookup Postal Code by Village / Subdistrict Name
 * Looks up free public postal directory and returns 5-digit postal code string or null.
 */
export async function lookupPostalCode(villageName, districtName = '') {
  if (!villageName) return null;
  const q = String(villageName).trim().toLowerCase();
  const cacheKey = `${q}_${String(districtName).trim().toLowerCase()}`;

  if (cache.postalCodes[cacheKey] !== undefined) {
    return cache.postalCodes[cacheKey];
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`${POSTAL_API_URL}/?q=${encodeURIComponent(q)}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const json = await res.json();
    if (!json || !json.data || !Array.isArray(json.data) || json.data.length === 0) {
      cache.postalCodes[cacheKey] = null;
      return null;
    }

    // Best match: match district if provided
    let match = json.data[0];
    if (districtName) {
      const dNameClean = districtName.toLowerCase().replace(/^(kecamatan|kec\.)\s+/i, '').trim();
      const districtMatch = json.data.find(
        (item) => item.district && item.district.toLowerCase().includes(dNameClean)
      );
      if (districtMatch) match = districtMatch;
    }

    const code = match.code ? String(match.code).trim() : null;
    cache.postalCodes[cacheKey] = code;
    return code;
  } catch (err) {
    console.warn('[lookupPostalCode] lookup skipped/timed out:', err?.message);
    return null;
  }
}

