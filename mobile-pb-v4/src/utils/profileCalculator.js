/*
|--------------------------------------------------------------------------
| Profile Calculator & Normalizer
|--------------------------------------------------------------------------
| 100% synchronized with Web Panic Button implementation:
| - public/js/users/profil.js (lines 213-258)
| - public/js/users/sidebar.js (lines 110-135)
|
| 15 Official Checklist Fields:
| 1. birth_date, 2. gender
| 3. province, 4. city, 5. district, 6. subdistrict, 7. full_address, 8. postal_code
| 9. emergency_name_1, 10. emergency_relation_1, 11. emergency_phone_1
| 12. emergency_name_2, 13. emergency_relation_2, 14. emergency_phone_2
| 15. blood_type
*/

export const PROFILE_CHECKLIST_FIELDS = [
  'birth_date',
  'gender',
  'province',
  'city',
  'district',
  'subdistrict',
  'full_address',
  'postal_code',
  'emergency_name_1',
  'emergency_relation_1',
  'emergency_phone_1',
  'emergency_name_2',
  'emergency_relation_2',
  'emergency_phone_2',
  'blood_type',
];

/**
 * Calculates profile completeness percentage (0 - 100%)
 * Matches web formula: Math.round((filledCount / 15) * 100)
 */
export function calculateProfileCompleteness(userData = {}) {
  if (!userData || typeof userData !== 'object') {
    return {
      percentage: 0,
      filledCount: 0,
      total: PROFILE_CHECKLIST_FIELDS.length,
      level: 'danger',
      label: 'Perlu Dilengkapi (0%)',
      badgeClass: 'badge-danger',
      isComplete: false,
    };
  }

  const checkFields = PROFILE_CHECKLIST_FIELDS.map((field) => userData[field]);
  const filledCount = checkFields.filter(
    (val) => val !== null && val !== undefined && String(val).trim() !== ''
  ).length;
  const total = PROFILE_CHECKLIST_FIELDS.length; // 15
  const percentage = Math.round((filledCount / total) * 100);

  let level = 'danger';
  let label = `Perlu Dilengkapi (${percentage}%)`;
  let badgeClass = 'badge-danger';
  let isComplete = false;

  if (percentage >= 100) {
    level = 'success';
    label = 'Profil Lengkap (100%)';
    badgeClass = 'badge-success';
    isComplete = true;
  } else if (percentage >= 50) {
    level = 'warning';
    label = `Belum Lengkap (${percentage}%)`;
    badgeClass = 'badge-warning';
  }

  return {
    percentage,
    filledCount,
    total,
    level,
    label,
    badgeClass,
    isComplete,
  };
}

/**
 * Maps raw database role to official web display role
 * Identical to web views (User Publik, Petugas Lapangan, Administrator)
 */
export function getRoleLabel(role = '') {
  const r = String(role || '').toLowerCase().trim();
  if (r === 'admin' || r === 'administrator') return 'Administrator';
  if (r === 'petugas' || r === 'satpam' || r === 'security') return 'Petugas Lapangan';
  return 'User Publik';
}

/**
 * Sanitizes and normalizes full user profile data.
 * Guarantees NO null or undefined values to prevent UI crash in React Native.
 */
export function formatProfileData(userId, rawData = {}) {
  const data = rawData && typeof rawData === 'object' ? rawData : {};

  // Strictly assigned_device only (no legacy fallbacks)
  const rawDevice = data.assigned_device;
  const cleanDevice =
    rawDevice &&
    rawDevice !== '-' &&
    rawDevice !== 'null' &&
    rawDevice !== 'undefined' &&
    rawDevice !== 'NONE'
      ? String(rawDevice).trim()
      : '';

  // Strictly assigned_zone only (no legacy 'zone' or 'zona' fallbacks, no 'Umum / Warga Baru')
  const rawZone = data.assigned_zone;
  const cleanZone =
    rawZone &&
    rawZone !== '-' &&
    rawZone !== 'null' &&
    rawZone !== 'undefined' &&
    rawZone !== 'NONE'
      ? String(rawZone).trim()
      : '';

  const rawRole = data.role || 'user';

  const profile = {
    id: String(userId || data.id || ''),
    name: String(data.name || '').trim(),
    username: String(data.username || (data.email ? String(data.email).split('@')[0] : '')).trim(),
    email: String(data.email || '').toLowerCase().trim(),
    phone: String(data.phone || data.phoneNumber || '').trim(),
    phoneNumber: String(data.phone || data.phoneNumber || '').trim(),
    role: rawRole,
    roleLabel: getRoleLabel(rawRole),
    birth_date: String(data.birth_date || '').trim(),
    gender: String(data.gender || '').trim(),
    province: String(data.province || '').trim(),
    city: String(data.city || '').trim(),
    district: String(data.district || '').trim(),
    subdistrict: String(data.subdistrict || '').trim(),
    full_address: String(data.full_address || '').trim(),
    postal_code: String(data.postal_code || '').trim(),
    emergency_name_1: String(data.emergency_name_1 || '').trim(),
    emergency_relation_1: String(data.emergency_relation_1 || '').trim(),
    emergency_phone_1: String(data.emergency_phone_1 || '').trim(),
    emergency_name_2: String(data.emergency_name_2 || '').trim(),
    emergency_relation_2: String(data.emergency_relation_2 || '').trim(),
    emergency_phone_2: String(data.emergency_phone_2 || '').trim(),
    blood_type: String(data.blood_type || '').trim().toUpperCase(),
    allergies_condition: String(data.allergies_condition || '').trim(),
    photo: String(data.photo || '').trim(),
    assigned_device: cleanDevice,
    assigned_zone: cleanZone,
    status: String(data.status || 'active').trim(),
    created_at: data.created_at || data.createdAt || '',
    updated_at: data.updated_at || data.updatedAt || '',
  };

  profile.completeness = calculateProfileCompleteness(profile);

  return profile;
}
