import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Linking,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius, text, shadows } from '../theme';
import PressableScale from '../components/PressableScale';
import {
  getProvinces,
  getRegencies,
  getDistricts,
  getVillages,
  lookupPostalCode,
} from '../services/regionService';
import DatePickerField from '../components/DatePickerModal';
import { formatIndonesianDate } from '../utils/dateHelper';

const GENDER_OPTIONS = ['Laki-laki', 'Perempuan'];
const BLOOD_TYPE_OPTIONS = ['A', 'B', 'AB', 'O', 'Tidak Tahu'];

export default function ProfileScreen() {
  const { user, updateUser, logout, startLogout } = useAuth();

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [successToast, setSuccessToast] = useState('');

  // ─── EDIT PROFILE MODAL STATE ──────────────────────────────────────────────
  const [showEditModal, setShowEditModal] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // 15 Checklist fields + Identity Form States
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formBirthDate, setFormBirthDate] = useState('');
  const [formGender, setFormGender] = useState('');

  const [formProvince, setFormProvince] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formDistrict, setFormDistrict] = useState('');
  const [formSubdistrict, setFormSubdistrict] = useState('');
  const [formFullAddress, setFormFullAddress] = useState('');
  const [formPostalCode, setFormPostalCode] = useState('');

  // ─── CASCADING REGION PICKER STATE ─────────────────────────────────────────
  const [selectedProvince, setSelectedProvince] = useState(null);
  const [selectedRegency, setSelectedRegency] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [selectedVillage, setSelectedVillage] = useState(null);

  const [postalLookupLoading, setPostalLookupLoading] = useState(false);
  const [postalHint, setPostalHint] = useState('');

  // Searchable Region Modal State
  const [regionModalVisible, setRegionModalVisible] = useState(false);
  const [regionPickerType, setRegionPickerType] = useState(null); // 'province' | 'city' | 'district' | 'subdistrict'
  const [regionPickerTitle, setRegionPickerTitle] = useState('');
  const [regionPickerList, setRegionPickerList] = useState([]);
  const [regionPickerLoading, setRegionPickerLoading] = useState(false);
  const [regionSearch, setRegionSearch] = useState('');

  const [formEmergName1, setFormEmergName1] = useState('');
  const [formEmergRel1, setFormEmergRel1] = useState('');
  const [formEmergPhone1, setFormEmergPhone1] = useState('');

  const [formEmergName2, setFormEmergName2] = useState('');
  const [formEmergRel2, setFormEmergRel2] = useState('');
  const [formEmergPhone2, setFormEmergPhone2] = useState('');

  const [formBloodType, setFormBloodType] = useState('');
  const [formAllergies, setFormAllergies] = useState('');

  // ─── CHANGE PASSWORD MODAL STATE ───────────────────────────────────────────
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const initials =
    (user?.name || user?.username || 'U')
      .trim()
      .split(' ')
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U';

  const roleLabel = user?.roleLabel || 'User Publik';
  const roleIcon = (() => {
    const r = (user?.role || '').toLowerCase().trim();
    if (r === 'admin' || r === 'administrator') return 'shield';
    if (r === 'petugas' || r === 'satpam' || r === 'security') return 'shield-checkmark';
    return 'person';
  })();

  const completeness = user?.completeness || {
    percentage: 0,
    filledCount: 0,
    total: 15,
    level: 'danger',
    label: 'Perlu Dilengkapi (0%)',
  };

  const completenessColor =
    completeness.level === 'success' ? '#10B981' :
    completeness.level === 'warning' ? '#D97706' : '#DC2626';

  const completenessBg =
    completeness.level === 'success' ? '#ECFDF5' :
    completeness.level === 'warning' ? '#FFFBEB' : '#FEF2F2';

  const completenessBorder =
    completeness.level === 'success' ? '#A7F3D0' :
    completeness.level === 'warning' ? '#FDE68A' : '#FECACA';

  function openEditModal() {
    setFormName(user?.name || '');
    setFormPhone(user?.phone || user?.phoneNumber || '');
    setFormBirthDate(user?.birth_date || '');
    setFormGender(user?.gender || '');

    setFormProvince(user?.province || '');
    setFormCity(user?.city || '');
    setFormDistrict(user?.district || '');
    setFormSubdistrict(user?.subdistrict || '');
    setFormFullAddress(user?.full_address || '');
    setFormPostalCode(user?.postal_code || '');

    setSelectedProvince(null);
    setSelectedRegency(null);
    setSelectedDistrict(null);
    setSelectedVillage(null);
    setPostalHint(user?.postal_code ? `Kode pos tersimpan: ${user.postal_code}` : '');

    setFormEmergName1(user?.emergency_name_1 || '');
    setFormEmergRel1(user?.emergency_relation_1 || '');
    setFormEmergPhone1(user?.emergency_phone_1 || '');

    setFormEmergName2(user?.emergency_name_2 || '');
    setFormEmergRel2(user?.emergency_relation_2 || '');
    setFormEmergPhone2(user?.emergency_phone_2 || '');

    setFormBloodType(user?.blood_type || '');
    setFormAllergies(user?.allergies_condition || '');

    setEditError('');
    setShowEditModal(true);
  }

  // ─── CASCADING REGION PICKER HANDLERS ──────────────────────────────────────
  async function resolveProvinceId() {
    if (selectedProvince?.id) return selectedProvince.id;
    if (!formProvince) return null;
    const provinces = await getProvinces();
    const match = provinces.find(
      (p) =>
        p.name.toLowerCase() === formProvince.toLowerCase() ||
        p.rawName?.toLowerCase() === formProvince.toLowerCase()
    );
    if (match) {
      setSelectedProvince(match);
      return match.id;
    }
    return null;
  }

  async function resolveRegencyId(provinceId) {
    if (selectedRegency?.id) return selectedRegency.id;
    if (!provinceId || !formCity) return null;
    const regencies = await getRegencies(provinceId);
    const match = regencies.find(
      (r) =>
        r.name.toLowerCase() === formCity.toLowerCase() ||
        r.rawName?.toLowerCase() === formCity.toLowerCase()
    );
    if (match) {
      setSelectedRegency(match);
      return match.id;
    }
    return null;
  }

  async function resolveDistrictId(regencyId) {
    if (selectedDistrict?.id) return selectedDistrict.id;
    if (!regencyId || !formDistrict) return null;
    const districts = await getDistricts(regencyId);
    const match = districts.find(
      (d) =>
        d.name.toLowerCase() === formDistrict.toLowerCase() ||
        d.rawName?.toLowerCase() === formDistrict.toLowerCase()
    );
    if (match) {
      setSelectedDistrict(match);
      return match.id;
    }
    return null;
  }

  async function openProvincePicker() {
    setRegionPickerType('province');
    setRegionPickerTitle('Pilih Provinsi');
    setRegionSearch('');
    setRegionPickerLoading(true);
    setRegionModalVisible(true);
    try {
      const data = await getProvinces();
      setRegionPickerList(data || []);
    } catch (err) {
      setRegionPickerList([]);
    } finally {
      setRegionPickerLoading(false);
    }
  }

  async function openRegencyPicker() {
    if (!formProvince) {
      setEditError('Silakan pilih Provinsi terlebih dahulu.');
      return;
    }
    setEditError('');
    setRegionPickerType('city');
    setRegionPickerTitle('Pilih Kota / Kabupaten');
    setRegionSearch('');
    setRegionPickerLoading(true);
    setRegionModalVisible(true);
    try {
      const provId = await resolveProvinceId();
      if (!provId) {
        setRegionPickerList([]);
        return;
      }
      const data = await getRegencies(provId);
      setRegionPickerList(data || []);
    } catch (err) {
      setRegionPickerList([]);
    } finally {
      setRegionPickerLoading(false);
    }
  }

  async function openDistrictPicker() {
    if (!formCity) {
      setEditError('Silakan pilih Kota / Kabupaten terlebih dahulu.');
      return;
    }
    setEditError('');
    setRegionPickerType('district');
    setRegionPickerTitle('Pilih Kecamatan');
    setRegionSearch('');
    setRegionPickerLoading(true);
    setRegionModalVisible(true);
    try {
      const provId = await resolveProvinceId();
      const regId = await resolveRegencyId(provId);
      if (!regId) {
        setRegionPickerList([]);
        return;
      }
      const data = await getDistricts(regId);
      setRegionPickerList(data || []);
    } catch (err) {
      setRegionPickerList([]);
    } finally {
      setRegionPickerLoading(false);
    }
  }

  async function openVillagePicker() {
    if (!formDistrict) {
      setEditError('Silakan pilih Kecamatan terlebih dahulu.');
      return;
    }
    setEditError('');
    setRegionPickerType('subdistrict');
    setRegionPickerTitle('Pilih Kelurahan / Desa');
    setRegionSearch('');
    setRegionPickerLoading(true);
    setRegionModalVisible(true);
    try {
      const provId = await resolveProvinceId();
      const regId = await resolveRegencyId(provId);
      const distId = await resolveDistrictId(regId);
      if (!distId) {
        setRegionPickerList([]);
        return;
      }
      const data = await getVillages(distId);
      setRegionPickerList(data || []);
    } catch (err) {
      setRegionPickerList([]);
    } finally {
      setRegionPickerLoading(false);
    }
  }

  function handleSelectRegionItem(item) {
    if (regionPickerType === 'province') {
      setFormProvince(item.name);
      setSelectedProvince(item);
      // Clear downstream
      setFormCity('');
      setSelectedRegency(null);
      setFormDistrict('');
      setSelectedDistrict(null);
      setFormSubdistrict('');
      setSelectedVillage(null);
      setFormPostalCode('');
      setPostalHint('');
      setRegionModalVisible(false);
    } else if (regionPickerType === 'city') {
      setFormCity(item.name);
      setSelectedRegency(item);
      // Clear downstream
      setFormDistrict('');
      setSelectedDistrict(null);
      setFormSubdistrict('');
      setSelectedVillage(null);
      setFormPostalCode('');
      setPostalHint('');
      setRegionModalVisible(false);
    } else if (regionPickerType === 'district') {
      setFormDistrict(item.name);
      setSelectedDistrict(item);
      // Clear downstream
      setFormSubdistrict('');
      setSelectedVillage(null);
      setFormPostalCode('');
      setPostalHint('');
      setRegionModalVisible(false);
    } else if (regionPickerType === 'subdistrict') {
      setFormSubdistrict(item.name);
      setSelectedVillage(item);
      setRegionModalVisible(false);

      // Auto-lookup postal code
      setPostalLookupLoading(true);
      setPostalHint('Mencari kode pos otomatis...');
      lookupPostalCode(item.name, formDistrict)
        .then((code) => {
          if (code) {
            setFormPostalCode(code);
            setPostalHint(`✓ Kode pos otomatis terisi: ${code}`);
          } else {
            setPostalHint('Silakan isi kode pos manual jika diperlukan');
          }
        })
        .catch(() => {
          setPostalHint('Silakan isi kode pos manual jika diperlukan');
        })
        .finally(() => {
          setPostalLookupLoading(false);
        });
    }
  }

  function openPasswordModal() {
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowOldPass(false);
    setShowNewPass(false);
    setShowConfirmPass(false);
    setPasswordError('');
    setShowPasswordModal(true);
  }

  async function handleSaveProfile() {
    if (!formName.trim()) {
      setEditError('Nama lengkap wajib diisi.');
      return;
    }
    if (!formPhone.trim()) {
      setEditError('Nomor telepon / WhatsApp wajib diisi.');
      return;
    }

    setEditLoading(true);
    setEditError('');

    try {
      const updates = {
        name: formName.trim(),
        phone: formPhone.trim(),
        birth_date: formBirthDate.trim(),
        gender: formGender.trim(),
        province: formProvince.trim(),
        city: formCity.trim(),
        district: formDistrict.trim(),
        subdistrict: formSubdistrict.trim(),
        full_address: formFullAddress.trim(),
        postal_code: formPostalCode.trim(),
        emergency_name_1: formEmergName1.trim(),
        emergency_relation_1: formEmergRel1.trim(),
        emergency_phone_1: formEmergPhone1.trim(),
        emergency_name_2: formEmergName2.trim(),
        emergency_relation_2: formEmergRel2.trim(),
        emergency_phone_2: formEmergPhone2.trim(),
        blood_type: formBloodType.trim().toUpperCase(),
        allergies_condition: formAllergies.trim(),
      };

      await updateUser(updates);
      setShowEditModal(false);
      setSuccessToast('Profil berhasil diperbarui dan tersinkronisasi!');
      setTimeout(() => setSuccessToast(''), 3500);
    } catch (err) {
      setEditError(err?.message || 'Gagal menyimpan perubahan data profil.');
    } finally {
      setEditLoading(false);
    }
  }

  async function handleSavePassword() {
    if (!oldPassword) {
      setPasswordError('Password lama wajib diisi.');
      return;
    }
    if (!newPassword) {
      setPasswordError('Password baru wajib diisi.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Password baru minimal 6 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Konfirmasi password tidak cocok.');
      return;
    }
    if (oldPassword === newPassword) {
      setPasswordError('Password baru tidak boleh sama dengan password lama.');
      return;
    }

    setPasswordLoading(true);
    setPasswordError('');
    try {
      await updateUser({
        oldPassword: oldPassword,
        password: newPassword,
      });
      setShowPasswordModal(false);
      setSuccessToast('Password berhasil diperbarui!');
      setTimeout(() => setSuccessToast(''), 3500);
    } catch (err) {
      setPasswordError(err?.message || 'Gagal mengubah password.');
    } finally {
      setPasswordLoading(false);
    }
  }

  function callNumber(phone) {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`).catch(() => {});
  }

  // ─── REUSABLE UI SUB-COMPONENTS ─────────────────────────────────────────────
  function SectionCard({ icon, title, subtitle, iconColor = colors.brandNavy, children }) {
    return (
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIconWrap, { backgroundColor: `${iconColor}15` }]}>
            <Ionicons name={icon} size={18} color={iconColor} />
          </View>
          <View style={styles.sectionHeaderTextWrap}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
          </View>
        </View>
        <View style={styles.sectionDivider} />
        {children}
      </View>
    );
  }

  function InfoField({ label, value, icon, isSpanFull = false, actionBtn = null }) {
    const isUnfilled = !value || value === '-' || value === 'Belum diisi';
    return (
      <View style={[styles.infoField, isSpanFull && styles.infoFieldSpanFull]}>
        <View style={styles.infoFieldLabelRow}>
          {icon ? <Ionicons name={icon} size={13} color={colors.textSecondary} /> : null}
          <Text style={styles.infoFieldLabel}>{label}</Text>
        </View>
        <View style={styles.infoFieldValueRow}>
          <Text
            style={[styles.infoFieldValue, isUnfilled && styles.infoFieldValueEmpty]}
            numberOfLines={isSpanFull ? 3 : 1}
          >
            {value || 'Belum diisi'}
          </Text>
          {actionBtn}
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Toast Notifikasi Sukses ── */}
      {successToast ? (
        <View style={styles.toastBanner}>
          <Ionicons name="checkmark-circle" size={18} color={colors.success} />
          <Text style={styles.toastText}>{successToast}</Text>
        </View>
      ) : null}

      {/* ── 1. HEADER PROFILE CARD (Web V3 Style) ── */}
      <View style={styles.headerCard}>
        <View style={styles.headerAccentBar} />

        <View style={styles.headerTop}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <TouchableOpacity
              style={styles.avatarBadge}
              onPress={openEditModal}
              activeOpacity={0.8}
            >
              <Ionicons name="camera" size={12} color={colors.white} />
            </TouchableOpacity>
          </View>

          <View style={styles.headerInfo}>
            <View style={styles.badgeRow}>
              <View style={styles.roleBadge}>
                <Ionicons name={roleIcon} size={11} color={colors.brandNavy} />
                <Text style={styles.roleBadgeText}>{roleLabel}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: completenessBg, borderColor: completenessBorder }]}>
                <Text style={[styles.statusBadgeText, { color: completenessColor }]}>
                  {completeness.label}
                </Text>
              </View>
            </View>

            <Text style={styles.headerName} numberOfLines={1}>
              {user?.name || user?.username || 'Warga'}
            </Text>
            <View style={styles.headerContactRow}>
              <Ionicons name="mail-outline" size={13} color={colors.textSecondary} />
              <Text style={styles.headerContactText} numberOfLines={1}>
                {user?.email || '—'}
              </Text>
            </View>
            <View style={styles.headerContactRow}>
              <Ionicons name="call-outline" size={13} color={colors.textSecondary} />
              <Text style={styles.headerContactText} numberOfLines={1}>
                {user?.phone || user?.phoneNumber || '—'}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.btnEditProfile}
          onPress={openEditModal}
          activeOpacity={0.85}
        >
          <Ionicons name="create-outline" size={16} color={colors.white} />
          <Text style={styles.btnEditProfileText}>Lengkapi / Edit Profil</Text>
        </TouchableOpacity>
      </View>

      {/* ── 2. INDIKATOR KELENGKAPAN PROFIL (15 FIELD ENGINE) ── */}
      <View style={[styles.progressCard, { borderColor: completenessBorder }]}>
        <View style={styles.progressHeader}>
          <View style={styles.progressTitleRow}>
            <Ionicons name="shield-checkmark" size={16} color={completenessColor} />
            <Text style={styles.progressTitle}>Kelengkapan Profil</Text>
          </View>
          <Text style={[styles.progressPercentage, { color: completenessColor }]}>
            {completeness.percentage}%
          </Text>
        </View>

        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${completeness.percentage}%`, backgroundColor: completenessColor },
            ]}
          />
        </View>

        <Text style={styles.progressFootnote}>
          {completeness.filledCount} dari 15 data checklist profil terverifikasi.
          {completeness.percentage < 100
            ? ' Lengkapi data Anda untuk respon darurat yang lebih akurat.'
            : ' Seluruh data darurat Anda telah lengkap.'}
        </Text>
      </View>

      {/* ── 3. SEKSI 1: INFORMASI PRIBADI ── */}
      <SectionCard
        icon="id-card-outline"
        title="Informasi Pribadi"
        subtitle="Identitas diri dan kontak dasar pengguna"
        iconColor={colors.brandNavy}
      >
        <View style={styles.fieldGrid}>
          <InfoField label="Nama Lengkap" value={user?.name} icon="person-outline" />
          <InfoField label="Alamat Email" value={user?.email} icon="mail-outline" />
          <InfoField label="Nomor Telepon" value={user?.phone || user?.phoneNumber} icon="call-outline" />
          <InfoField
            label="Tanggal Lahir"
            value={user?.birth_date ? formatIndonesianDate(user.birth_date) : '-'}
            icon="calendar-outline"
          />
          <InfoField label="Jenis Kelamin" value={user?.gender} icon="male-female-outline" />
        </View>
      </SectionCard>

      {/* ── 4. SEKSI 2: INFORMASI ALAMAT ── */}
      <SectionCard
        icon="map-outline"
        title="Informasi Alamat"
        subtitle="Domisili tempat tinggal untuk respon darurat posko"
        iconColor="#10B981"
      >
        <View style={styles.fieldGrid}>
          <InfoField label="Provinsi" value={user?.province} icon="earth-outline" />
          <InfoField label="Kota / Kabupaten" value={user?.city} icon="business-outline" />
          <InfoField label="Kecamatan" value={user?.district} icon="trail-sign-outline" />
          <InfoField label="Kelurahan / Desa" value={user?.subdistrict} icon="home-outline" />
          <InfoField
            label="Alamat Lengkap"
            value={user?.full_address}
            icon="navigate-outline"
            isSpanFull
          />
          <InfoField label="Kode Pos" value={user?.postal_code} icon="mail-unread-outline" />
        </View>
      </SectionCard>

      {/* ── 5. SEKSI 3: KONTAK DARURAT (2 KONTAK) ── */}
      <SectionCard
        icon="call-outline"
        title="Kontak Darurat (Emergency)"
        subtitle="Pihak keluarga atau kerabat yang dihubungi saat situasi genting"
        iconColor="#D97706"
      >
        <View style={styles.emergencyContainer}>
          {/* Kontak 1 */}
          <View style={styles.emergencyCard}>
            <View style={styles.emergencyCardHeader}>
              <View style={[styles.emergencyBadge, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
                <Ionicons name="star" size={11} color="#2563EB" />
                <Text style={[styles.emergencyBadgeText, { color: '#1E40AF' }]}>
                  Kontak Darurat 1 (Utama)
                </Text>
              </View>
            </View>
            <View style={styles.emergencyBody}>
              <InfoField label="Nama Kontak" value={user?.emergency_name_1} />
              <InfoField label="Hubungan" value={user?.emergency_relation_1} />
              <InfoField
                label="Nomor Telepon"
                value={user?.emergency_phone_1}
                actionBtn={
                  user?.emergency_phone_1 ? (
                    <TouchableOpacity
                      style={styles.btnCallSmall}
                      onPress={() => callNumber(user?.emergency_phone_1)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="call" size={11} color={colors.white} />
                    </TouchableOpacity>
                  ) : null
                }
              />
            </View>
          </View>

          {/* Kontak 2 */}
          <View style={styles.emergencyCard}>
            <View style={styles.emergencyCardHeader}>
              <View style={[styles.emergencyBadge, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }]}>
                <Ionicons name="person-add" size={11} color="#64748B" />
                <Text style={[styles.emergencyBadgeText, { color: '#475569' }]}>
                  Kontak Darurat 2 (Sekunder)
                </Text>
              </View>
            </View>
            <View style={styles.emergencyBody}>
              <InfoField label="Nama Kontak" value={user?.emergency_name_2} />
              <InfoField label="Hubungan" value={user?.emergency_relation_2} />
              <InfoField
                label="Nomor Telepon"
                value={user?.emergency_phone_2}
                actionBtn={
                  user?.emergency_phone_2 ? (
                    <TouchableOpacity
                      style={styles.btnCallSmall}
                      onPress={() => callNumber(user?.emergency_phone_2)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="call" size={11} color={colors.white} />
                    </TouchableOpacity>
                  ) : null
                }
              />
            </View>
          </View>
        </View>
      </SectionCard>

      {/* ── 6. SEKSI 4: INFORMASI KESEHATAN & MEDIS ── */}
      <SectionCard
        icon="heart-outline"
        title="Informasi Medis & Kesehatan"
        subtitle="Catatan penanganan pertama oleh tim medis atau penyelamat"
        iconColor="#DC2626"
      >
        <View style={styles.fieldGrid}>
          <View style={styles.infoField}>
            <Text style={styles.infoFieldLabel}>Golongan Darah</Text>
            <View style={styles.bloodTypePill}>
              <Ionicons name="water" size={14} color="#DC2626" />
              <Text style={styles.bloodTypeText}>{user?.blood_type || '—'}</Text>
            </View>
          </View>

          <View style={[styles.infoField, styles.infoFieldSpanFull]}>
            <Text style={styles.infoFieldLabel}>Alergi / Kondisi Khusus / Riwayat</Text>
            <View style={styles.medicalConditionBox}>
              <Text style={styles.medicalConditionText}>
                {user?.allergies_condition || 'Tidak ada riwayat alergi / kondisi khusus yang terdata.'}
              </Text>
            </View>
          </View>
        </View>
      </SectionCard>

      {/* ── 7. SEKSI 5: PERANGKAT IOT & WILAYAH ── */}
      <SectionCard
        icon="hardware-chip-outline"
        title="Perangkat IoT & Wilayah"
        subtitle="Modul tombol darurat fisik yang terpasang"
        iconColor={colors.brandNavy}
      >
        <View style={styles.fieldGrid}>
          <InfoField
            label="ID Perangkat IoT"
            value={user?.assigned_device && user.assigned_device !== '-' ? user.assigned_device : 'Belum Ditugaskan'}
            icon="hardware-chip-outline"
          />
          <InfoField
            label="Wilayah / Zona"
            value={
              user?.assigned_zone && user.assigned_zone !== '-' && user.assigned_zone !== 'null'
                ? user.assigned_zone
                : 'Belum Ditugaskan'
            }
            icon="location-outline"
          />
        </View>
        <Text style={styles.zoneNoticeText}>
          * Zona dan perangkat ditetapkan oleh Administrator sistem posko saat modul IoT dipasangkan ke warga.
        </Text>
      </SectionCard>

      {/* ── 8. SEKSI 6: KEAMANAN & PENGATURAN AKUN ── */}
      <View style={styles.actionsCard}>
        <PressableScale
          style={styles.actionBtnOutline}
          onPress={openPasswordModal}
          activeOpacity={0.85}
        >
          <Ionicons name="lock-closed-outline" size={18} color={colors.brandNavy} />
          <Text style={styles.actionBtnOutlineText}>Ubah Password Akun</Text>
        </PressableScale>

        <PressableScale
          style={styles.actionBtnDanger}
          onPress={() => setShowLogoutModal(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="log-out-outline" size={18} color="#DC2626" />
          <Text style={styles.actionBtnDangerText}>Keluar dari Aplikasi</Text>
        </PressableScale>
      </View>

      {/* ── MODAL 1: FORM LENGKAPI / EDIT PROFIL (15 FIELD) ── */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEditModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalBackdrop}
        >
          <View style={styles.editModalContainer}>
            <View style={styles.editModalHeader}>
              <View style={styles.editModalTitleWrap}>
                <Ionicons name="create-outline" size={20} color={colors.brandNavy} />
                <Text style={styles.editModalTitle}>Edit Informasi Profil</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowEditModal(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {editError ? (
              <View style={styles.modalErrorBanner}>
                <Ionicons name="alert-circle" size={16} color="#DC2626" />
                <Text style={styles.modalErrorText}>{editError}</Text>
              </View>
            ) : null}

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Grup 1: Identitas Pribadi */}
              <Text style={styles.formGroupHeading}>1. Identitas Pribadi</Text>

              <Text style={styles.inputLabel}>Nama Lengkap *</Text>
              <TextInput
                style={styles.input}
                value={formName}
                onChangeText={setFormName}
                placeholder="Nama sesuai KTP"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.inputLabel}>Nomor WhatsApp / HP *</Text>
              <TextInput
                style={styles.input}
                value={formPhone}
                onChangeText={setFormPhone}
                placeholder="Contoh: 08123456789"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />

              <DatePickerField
                label="Tanggal Lahir"
                value={formBirthDate}
                onChange={setFormBirthDate}
                placeholder="Pilih tanggal lahir"
              />

              <Text style={styles.inputLabel}>Jenis Kelamin</Text>
              <View style={styles.choiceRow}>
                {GENDER_OPTIONS.map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.choiceBtn, formGender === g && styles.choiceBtnActive]}
                    onPress={() => setFormGender(g)}
                  >
                    <Text style={[styles.choiceBtnText, formGender === g && styles.choiceBtnTextActive]}>
                      {g}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Grup 2: Alamat Domisili */}
              <Text style={styles.formGroupHeading}>2. Alamat Domisili</Text>

              {/* Tingkat 1: Provinsi */}
              <Text style={styles.inputLabel}>Provinsi</Text>
              <TouchableOpacity
                style={styles.regionSelectBtn}
                onPress={openProvincePicker}
                activeOpacity={0.75}
              >
                <View style={styles.regionSelectLeft}>
                  <Ionicons name="earth-outline" size={16} color={colors.brandNavy} />
                  <Text style={[styles.regionSelectText, !formProvince && styles.regionSelectPlaceholder]}>
                    {formProvince || 'Pilih Provinsi...'}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
              </TouchableOpacity>

              {/* Tingkat 2: Kota / Kabupaten */}
              <Text style={styles.inputLabel}>Kota / Kabupaten</Text>
              <TouchableOpacity
                style={[styles.regionSelectBtn, !formProvince && styles.regionSelectBtnDisabled]}
                onPress={openRegencyPicker}
                disabled={!formProvince}
                activeOpacity={0.75}
              >
                <View style={styles.regionSelectLeft}>
                  <Ionicons
                    name="business-outline"
                    size={16}
                    color={formProvince ? colors.brandNavy : colors.textMuted}
                  />
                  <Text style={[styles.regionSelectText, !formCity && styles.regionSelectPlaceholder]}>
                    {formCity || (formProvince ? 'Pilih Kota / Kabupaten...' : 'Pilih provinsi terlebih dahulu')}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-down"
                  size={16}
                  color={formProvince ? colors.textSecondary : colors.textMuted}
                />
              </TouchableOpacity>

              {/* Tingkat 3: Kecamatan */}
              <Text style={styles.inputLabel}>Kecamatan</Text>
              <TouchableOpacity
                style={[styles.regionSelectBtn, !formCity && styles.regionSelectBtnDisabled]}
                onPress={openDistrictPicker}
                disabled={!formCity}
                activeOpacity={0.75}
              >
                <View style={styles.regionSelectLeft}>
                  <Ionicons
                    name="trail-sign-outline"
                    size={16}
                    color={formCity ? colors.brandNavy : colors.textMuted}
                  />
                  <Text style={[styles.regionSelectText, !formDistrict && styles.regionSelectPlaceholder]}>
                    {formDistrict || (formCity ? 'Pilih Kecamatan...' : 'Pilih kota/kabupaten terlebih dahulu')}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-down"
                  size={16}
                  color={formCity ? colors.textSecondary : colors.textMuted}
                />
              </TouchableOpacity>

              {/* Tingkat 4: Kelurahan / Desa */}
              <Text style={styles.inputLabel}>Kelurahan / Desa</Text>
              <TouchableOpacity
                style={[styles.regionSelectBtn, !formDistrict && styles.regionSelectBtnDisabled]}
                onPress={openVillagePicker}
                disabled={!formDistrict}
                activeOpacity={0.75}
              >
                <View style={styles.regionSelectLeft}>
                  <Ionicons
                    name="home-outline"
                    size={16}
                    color={formDistrict ? colors.brandNavy : colors.textMuted}
                  />
                  <Text style={[styles.regionSelectText, !formSubdistrict && styles.regionSelectPlaceholder]}>
                    {formSubdistrict || (formDistrict ? 'Pilih Kelurahan / Desa...' : 'Pilih kecamatan terlebih dahulu')}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-down"
                  size={16}
                  color={formDistrict ? colors.textSecondary : colors.textMuted}
                />
              </TouchableOpacity>

              {/* Alamat Lengkap */}
              <Text style={styles.inputLabel}>Alamat Lengkap (Jalan / RT / RW / No. Rumah)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formFullAddress}
                onChangeText={setFormFullAddress}
                placeholder="Nama jalan, nomor rumah, RT/RW, atau patokan lokasi"
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
              />

              {/* Kode Pos Auto + Manual */}
              <Text style={styles.inputLabel}>Kode Pos</Text>
              <TextInput
                style={styles.input}
                value={formPostalCode}
                onChangeText={(v) => {
                  setFormPostalCode(v);
                  if (postalHint) setPostalHint('');
                }}
                placeholder="Contoh: 55187"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
              />
              {postalLookupLoading ? (
                <View style={styles.postalHintRow}>
                  <ActivityIndicator size="small" color={colors.brandBlue} />
                  <Text style={styles.postalHintText}>Mencari kode pos otomatis...</Text>
                </View>
              ) : postalHint ? (
                <View style={styles.postalHintRow}>
                  <Ionicons name="checkmark-circle-outline" size={14} color="#2563EB" />
                  <Text style={styles.postalHintText}>{postalHint}</Text>
                </View>
              ) : (
                <Text style={styles.postalSubtext}>
                  Kode pos terisi otomatis saat memilih Kelurahan, dan dapat disunting manual.
                </Text>
              )}

              {/* Grup 3: Kontak Darurat 1 */}
              <Text style={styles.formGroupHeading}>3. Kontak Darurat 1 (Utama)</Text>

              <Text style={styles.inputLabel}>Nama Kontak 1</Text>
              <TextInput
                style={styles.input}
                value={formEmergName1}
                onChangeText={setFormEmergName1}
                placeholder="Nama keluarga / kerabat utama"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.inputLabel}>Hubungan Kontak 1</Text>
              <TextInput
                style={styles.input}
                value={formEmergRel1}
                onChangeText={setFormEmergRel1}
                placeholder="Contoh: Istri, Suami, Orang Tua"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.inputLabel}>Nomor Telepon Kontak 1</Text>
              <TextInput
                style={styles.input}
                value={formEmergPhone1}
                onChangeText={setFormEmergPhone1}
                placeholder="Nomor telepon yang dapat dihubungi"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />

              {/* Grup 4: Kontak Darurat 2 */}
              <Text style={styles.formGroupHeading}>4. Kontak Darurat 2 (Sekunder)</Text>

              <Text style={styles.inputLabel}>Nama Kontak 2</Text>
              <TextInput
                style={styles.input}
                value={formEmergName2}
                onChangeText={setFormEmergName2}
                placeholder="Nama kerabat sekunder"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.inputLabel}>Hubungan Kontak 2</Text>
              <TextInput
                style={styles.input}
                value={formEmergRel2}
                onChangeText={setFormEmergRel2}
                placeholder="Contoh: Saudara Kandung, Anak"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.inputLabel}>Nomor Telepon Kontak 2</Text>
              <TextInput
                style={styles.input}
                value={formEmergPhone2}
                onChangeText={setFormEmergPhone2}
                placeholder="Nomor telepon kontak 2"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />

              {/* Grup 5: Informasi Medis */}
              <Text style={styles.formGroupHeading}>5. Informasi Medis & Kesehatan</Text>

              <Text style={styles.inputLabel}>Golongan Darah</Text>
              <View style={styles.choiceRow}>
                {BLOOD_TYPE_OPTIONS.map((bt) => (
                  <TouchableOpacity
                    key={bt}
                    style={[styles.choiceBtn, formBloodType === bt && styles.choiceBtnActive]}
                    onPress={() => setFormBloodType(bt)}
                  >
                    <Text style={[styles.choiceBtnText, formBloodType === bt && styles.choiceBtnTextActive]}>
                      {bt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Alergi / Kondisi Medis Khusus</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formAllergies}
                onChangeText={setFormAllergies}
                placeholder="Contoh: Alergi Penisilin, Asma, Riwayat Jantung"
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
              />
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={() => setShowEditModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalBtnCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtnSave}
                onPress={handleSaveProfile}
                disabled={editLoading}
                activeOpacity={0.85}
              >
                {editLoading ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={16} color={colors.white} />
                    <Text style={styles.modalBtnSaveText}>Simpan Perubahan</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── MODAL 2: UBAH PASSWORD (ISOLASI) ── */}
      <Modal
        visible={showPasswordModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalBackdrop}
        >
          <View style={styles.passwordModalCard}>
            <View style={styles.editModalHeader}>
              <View style={styles.editModalTitleWrap}>
                <Ionicons name="lock-closed" size={20} color={colors.brandNavy} />
                <Text style={styles.editModalTitle}>Ubah Password</Text>
              </View>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {passwordError ? (
              <View style={styles.modalErrorBanner}>
                <Ionicons name="alert-circle" size={16} color="#DC2626" />
                <Text style={styles.modalErrorText}>{passwordError}</Text>
              </View>
            ) : null}

            <Text style={styles.inputLabel}>Password Lama *</Text>
            <View style={styles.passwordWrap}>
              <TextInput
                style={styles.passwordInput}
                value={oldPassword}
                onChangeText={setOldPassword}
                placeholder="Masukkan password saat ini"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showOldPass}
              />
              <TouchableOpacity onPress={() => setShowOldPass(!showOldPass)}>
                <Ionicons name={showOldPass ? 'eye-off' : 'eye'} size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Password Baru * (Min. 6 Karakter)</Text>
            <View style={styles.passwordWrap}>
              <TextInput
                style={styles.passwordInput}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Masukkan password baru"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showNewPass}
              />
              <TouchableOpacity onPress={() => setShowNewPass(!showNewPass)}>
                <Ionicons name={showNewPass ? 'eye-off' : 'eye'} size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Konfirmasi Password Baru *</Text>
            <View style={styles.passwordWrap}>
              <TextInput
                style={styles.passwordInput}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Ulangi password baru"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showConfirmPass}
              />
              <TouchableOpacity onPress={() => setShowConfirmPass(!showConfirmPass)}>
                <Ionicons name={showConfirmPass ? 'eye-off' : 'eye'} size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={() => setShowPasswordModal(false)}
              >
                <Text style={styles.modalBtnCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtnSave}
                onPress={handleSavePassword}
                disabled={passwordLoading}
              >
                {passwordLoading ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.modalBtnSaveText}>Update Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── MODAL 3: KONFIRMASI LOGOUT (WEB V3 SWEETALERT2 STYLED) ── */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.logoutModalCard}>
            <View style={styles.logoutIconGlow}>
              <View style={styles.logoutIconCircle}>
                <Ionicons name="log-out-outline" size={26} color="#DC2626" />
              </View>
            </View>
            <Text style={styles.logoutTitle}>Konfirmasi Keluar</Text>
            <Text style={styles.logoutMessage}>
              Apakah Anda yakin ingin mengakhiri sesi ini? Anda harus memasukkan kredensial lagi untuk masuk.
            </Text>
            <View style={styles.logoutBtnRow}>
              <TouchableOpacity
                style={styles.logoutBtnCancel}
                onPress={() => setShowLogoutModal(false)}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={18} color="#64748B" />
                <Text style={styles.logoutBtnCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.logoutBtnConfirm}
                onPress={() => {
                  setShowLogoutModal(false);
                  if (typeof startLogout === 'function') {
                    startLogout();
                  } else {
                    logout();
                  }
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="log-out-outline" size={18} color={colors.white} />
                <Text style={styles.logoutBtnConfirmText}>Ya, Keluar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL 4: PILIH DAERAH (SEARCHABLE CASCADING REGION PICKER) ── */}
      <Modal
        visible={regionModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRegionModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.regionModalCard}>
            <View style={styles.regionModalHead}>
              <View style={styles.regionModalTitleRow}>
                <Ionicons name="location" size={18} color={colors.brandNavy} />
                <Text style={styles.regionModalTitle}>{regionPickerTitle}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setRegionModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.regionSearchRow}>
              <Ionicons name="search" size={16} color={colors.textMuted} />
              <TextInput
                style={styles.regionSearchInput}
                value={regionSearch}
                onChangeText={setRegionSearch}
                placeholder="Ketik untuk mencari nama daerah..."
                placeholderTextColor={colors.textMuted}
                autoCorrect={false}
              />
              {regionSearch ? (
                <TouchableOpacity onPress={() => setRegionSearch('')}>
                  <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>

            {regionPickerLoading ? (
              <View style={styles.regionLoadingBox}>
                <ActivityIndicator size="small" color={colors.brandNavy} />
                <Text style={styles.regionLoadingText}>Memuat data wilayah...</Text>
              </View>
            ) : (
              <FlatList
                data={regionPickerList.filter((item) =>
                  !regionSearch || item.name.toLowerCase().includes(regionSearch.toLowerCase())
                )}
                keyExtractor={(item) => String(item.id)}
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled"
                initialNumToRender={20}
                maxToRenderPerBatch={25}
                windowSize={10}
                style={styles.regionFlatList}
                ListEmptyComponent={
                  <View style={styles.regionEmptyBox}>
                    <Ionicons name="alert-circle-outline" size={24} color={colors.textMuted} />
                    <Text style={styles.regionEmptyText}>
                      {regionSearch
                        ? `Tidak ada daerah yang cocok dengan "${regionSearch}".`
                        : 'Tidak ada data daerah yang tersedia.'}
                    </Text>
                  </View>
                }
                renderItem={({ item }) => {
                  const isCurrent =
                    (regionPickerType === 'province' && formProvince === item.name) ||
                    (regionPickerType === 'city' && formCity === item.name) ||
                    (regionPickerType === 'district' && formDistrict === item.name) ||
                    (regionPickerType === 'subdistrict' && formSubdistrict === item.name);

                  return (
                    <TouchableOpacity
                      style={[styles.regionItem, isCurrent && styles.regionItemActive]}
                      onPress={() => handleSelectRegionItem(item)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.regionItemText, isCurrent && styles.regionItemTextActive]}>
                        {item.name}
                      </Text>
                      {isCurrent ? (
                        <Ionicons name="checkmark-circle" size={18} color={colors.brandNavy} />
                      ) : (
                        <Ionicons name="chevron-forward" size={14} color="#CBD5E1" />
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F6F8FC',
  },
  content: {
    padding: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 120 : 100,
  },

  // Toast
  toastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    gap: 8,
  },
  toastText: {
    fontSize: text.xs,
    color: '#065F46',
    fontWeight: text.semibold,
    flex: 1,
  },

  // 1. Header Card (Web V3 Style)
  headerCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: spacing.md,
    marginBottom: spacing.md,
    position: 'relative',
    overflow: 'hidden',
    ...shadows.sm,
  },
  headerAccentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: colors.brandNavy,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
    marginTop: 4,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatarContainer: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.brandNavy,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.navy,
  },
  avatarText: {
    color: colors.white,
    fontSize: 24,
    fontWeight: text.bold,
  },
  avatarBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  headerInfo: {
    flex: 1,
    gap: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    marginBottom: 2,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    gap: 4,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: text.bold,
    color: '#1E40AF',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: text.bold,
  },
  headerName: {
    fontSize: text.base,
    fontWeight: text.bold,
    color: '#1E293B',
  },
  headerContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerContactText: {
    fontSize: text.xs,
    color: '#64748B',
  },
  btnEditProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brandNavy,
    paddingVertical: 10,
    borderRadius: radius.md,
    gap: 6,
    ...shadows.navy,
  },
  btnEditProfileText: {
    color: colors.white,
    fontSize: text.xs,
    fontWeight: text.bold,
  },

  // 2. Completeness Progress Card
  progressCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressTitle: {
    fontSize: text.xs,
    fontWeight: text.bold,
    color: '#1E293B',
  },
  progressPercentage: {
    fontSize: text.xs,
    fontWeight: text.bold,
  },
  progressBarBg: {
    height: 7,
    backgroundColor: '#F1F5F9',
    borderRadius: 3.5,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3.5,
  },
  progressFootnote: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },

  // 3. Section Cards
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderTextWrap: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: text.sm,
    fontWeight: text.bold,
    color: '#1E293B',
  },
  sectionSubtitle: {
    fontSize: 10,
    color: '#64748B',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: spacing.sm,
  },
  fieldGrid: {
    gap: spacing.sm,
  },
  infoField: {
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    paddingVertical: 6,
  },
  infoFieldSpanFull: {},
  infoFieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  infoFieldLabel: {
    fontSize: 10,
    color: '#64748B',
  },
  infoFieldValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoFieldValue: {
    fontSize: 12,
    fontWeight: text.semibold,
    color: '#1E293B',
  },
  infoFieldValueEmpty: {
    color: '#94A3B8',
    fontStyle: 'italic',
    fontWeight: text.normal,
  },

  // Emergency Cards
  emergencyContainer: {
    gap: spacing.sm,
  },
  emergencyCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: spacing.sm,
  },
  emergencyCardHeader: {
    marginBottom: 6,
  },
  emergencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  emergencyBadgeText: {
    fontSize: 10,
    fontWeight: text.bold,
  },
  emergencyBody: {
    gap: 4,
  },
  btnCallSmall: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Medical Box
  bloodTypePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  bloodTypeText: {
    fontSize: 12,
    fontWeight: text.bold,
    color: '#DC2626',
  },
  medicalConditionBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginTop: 4,
  },
  medicalConditionText: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 16,
  },

  // Actions Card
  actionsCard: {
    gap: spacing.sm,
    marginTop: 4,
  },
  actionBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 12,
    borderRadius: radius.md,
    ...shadows.sm,
  },
  actionBtnOutlineText: {
    fontSize: text.xs,
    fontWeight: text.bold,
    color: colors.brandNavy,
  },
  actionBtnDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  actionBtnDangerText: {
    fontSize: text.xs,
    fontWeight: text.bold,
    color: '#DC2626',
  },

  // ── Modals ──
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  editModalContainer: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '90%',
    padding: spacing.md,
  },
  editModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  editModalTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editModalTitle: {
    fontSize: text.base,
    fontWeight: text.bold,
    color: '#1E293B',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginVertical: spacing.sm,
    gap: 6,
  },
  modalErrorText: {
    fontSize: text.xs,
    color: '#DC2626',
    flex: 1,
  },
  modalScroll: {
    marginVertical: spacing.sm,
  },
  modalScrollContent: {
    paddingBottom: spacing.lg,
  },
  formGroupHeading: {
    fontSize: 11,
    fontWeight: text.bold,
    color: colors.brandNavy,
    textTransform: 'uppercase',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    letterSpacing: 0.5,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: text.semibold,
    color: '#334155',
    marginTop: spacing.sm,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    fontSize: 12,
    color: '#1E293B',
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  choiceRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  choiceBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  choiceBtnActive: {
    backgroundColor: colors.brandNavy,
    borderColor: colors.brandNavy,
  },
  choiceBtnText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: text.medium,
  },
  choiceBtnTextActive: {
    color: colors.white,
    fontWeight: text.bold,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  modalBtnCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnCancelText: {
    fontSize: text.xs,
    fontWeight: text.bold,
    color: '#475569',
  },
  modalBtnSave: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brandNavy,
    paddingVertical: 12,
    borderRadius: radius.md,
    gap: 6,
    ...shadows.navy,
  },
  modalBtnSaveText: {
    fontSize: text.xs,
    fontWeight: text.bold,
    color: colors.white,
  },

  // Password Modal
  passwordModalCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    margin: spacing.md,
    alignSelf: 'center',
    width: '90%',
    ...shadows.lg,
  },
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 12,
    color: '#1E293B',
  },

  // Logout Modal (Web V3 SweetAlert2 Style)
  logoutModalCard: {
    backgroundColor: colors.bgSurface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    margin: spacing.md,
    alignSelf: 'center',
    width: '90%',
    maxWidth: 340,
    alignItems: 'center',
    ...shadows.lg,
  },
  logoutIconGlow: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  logoutIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutTitle: {
    fontSize: text.lg,
    fontWeight: text.extrabold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  logoutMessage: {
    fontSize: text.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  logoutBtnRow: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: spacing.xs,
  },
  logoutBtnCancel: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
  },
  logoutBtnCancelText: {
    fontSize: text.sm,
    fontWeight: text.bold,
    color: '#475569',
    marginLeft: 6,
  },
  logoutBtnConfirm: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: '#DC2626',
    paddingHorizontal: 8,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  logoutBtnConfirmText: {
    fontSize: text.sm,
    fontWeight: text.bold,
    color: colors.white,
    marginLeft: 6,
  },

  // Zone notice
  zoneNoticeText: {
    fontSize: 11,
    color: '#64748B',
    fontStyle: 'italic',
    marginTop: spacing.xs,
    paddingHorizontal: 4,
    lineHeight: 16,
  },

  // Cascading Region Selector in Edit Modal
  regionSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 10,
    marginBottom: spacing.sm,
  },
  regionSelectBtnDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    opacity: 0.6,
  },
  regionSelectLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  regionSelectText: {
    fontSize: 12,
    color: '#1E293B',
    fontWeight: text.medium,
    flex: 1,
  },
  regionSelectPlaceholder: {
    color: '#94A3B8',
    fontWeight: text.normal,
  },

  // Postal hint
  postalHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
    marginBottom: spacing.xs,
  },
  postalHintText: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: text.medium,
  },
  postalSubtext: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 3,
    marginBottom: spacing.sm,
    lineHeight: 14,
  },

  // Searchable Region Modal
  regionModalCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.md,
    margin: spacing.md,
    alignSelf: 'center',
    width: '92%',
    maxHeight: '80%',
    ...shadows.lg,
  },
  regionModalHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  regionModalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  regionModalTitle: {
    fontSize: text.sm,
    fontWeight: text.bold,
    color: colors.brandNavy,
  },
  regionSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    height: 40,
    marginBottom: spacing.sm,
  },
  regionSearchInput: {
    flex: 1,
    fontSize: 12,
    color: '#1E293B',
    marginLeft: 6,
    paddingVertical: 4,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  regionLoadingBox: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  regionLoadingText: {
    fontSize: 12,
    color: '#64748B',
  },
  regionFlatList: {
    maxHeight: 360,
  },
  regionEmptyBox: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  regionEmptyText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: spacing.md,
  },
  regionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  regionItemActive: {
    backgroundColor: '#EFF6FF',
    borderRadius: radius.sm,
  },
  regionItemText: {
    fontSize: 13,
    color: '#1E293B',
    flex: 1,
  },
  regionItemTextActive: {
    color: colors.brandNavy,
    fontWeight: text.bold,
  },
});
