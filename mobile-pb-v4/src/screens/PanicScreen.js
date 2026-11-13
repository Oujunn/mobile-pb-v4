import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Easing,
  ScrollView,
  Platform,
  Linking,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import {
  sendPanic,
  checkUserHasDevice,
  getDeviceFromDB2,
  PANIC_CATEGORIES,
  CATEGORY_CONFIG,
} from '../services/panicService';
import {
  listenToIoTDeviceStatus,
  listenToDashboardStats,
} from '../services/dashboardService';
import { getCurrentLocation, getAddressFromCoordinates } from '../services/locationService';
import { colors, spacing, radius, text, shadows } from '../theme';
import PressableScale from '../components/PressableScale';

/*
|--------------------------------------------------------------------------
| 4 Kategori Kejadian Resmi (Definisi Kompatibel Web V3)
|--------------------------------------------------------------------------
*/
const INCIDENT_CATEGORIES = [
  {
    id: PANIC_CATEGORIES.UMUM,
    label: CATEGORY_CONFIG.umum.label,
    iconName: CATEGORY_CONFIG.umum.iconName,
    color: CATEGORY_CONFIG.umum.color,
    bg: CATEGORY_CONFIG.umum.bg,
    border: CATEGORY_CONFIG.umum.border,
    description: CATEGORY_CONFIG.umum.description,
  },
  {
    id: PANIC_CATEGORIES.MEDIS,
    label: CATEGORY_CONFIG.medis.label,
    iconName: CATEGORY_CONFIG.medis.iconName,
    color: CATEGORY_CONFIG.medis.color,
    bg: CATEGORY_CONFIG.medis.bg,
    border: CATEGORY_CONFIG.medis.border,
    description: CATEGORY_CONFIG.medis.description,
  },
  {
    id: PANIC_CATEGORIES.KEBAKARAN,
    label: CATEGORY_CONFIG.kebakaran.label,
    iconName: CATEGORY_CONFIG.kebakaran.iconName,
    color: CATEGORY_CONFIG.kebakaran.color,
    bg: CATEGORY_CONFIG.kebakaran.bg,
    border: CATEGORY_CONFIG.kebakaran.border,
    description: CATEGORY_CONFIG.kebakaran.description,
  },
  {
    id: PANIC_CATEGORIES.KEJAHATAN,
    label: CATEGORY_CONFIG.kejahatan.label,
    iconName: CATEGORY_CONFIG.kejahatan.iconName,
    color: CATEGORY_CONFIG.kejahatan.color,
    bg: CATEGORY_CONFIG.kejahatan.bg,
    border: CATEGORY_CONFIG.kejahatan.border,
    description: CATEGORY_CONFIG.kejahatan.description,
  },
];

/*
|--------------------------------------------------------------------------
| Kontak Darurat Resmi Nasional
|--------------------------------------------------------------------------
*/
const EMERGENCY_CONTACTS = [
  { number: '112', label: 'Darurat Umum', iconName: 'call', color: '#2563EB', sub: 'Bebas Pulsa' },
  { number: '110', label: 'Kepolisian',   iconName: 'shield', color: '#DC2626', sub: 'Polri 24 Jam' },
  { number: '118', label: 'Ambulans',     iconName: 'medkit', color: '#10B981', sub: 'Kemenkes RI' },
  { number: '113', label: 'Damkar',       iconName: 'flame',  color: '#F97316', sub: 'Pemadam Api' },
];

export default function PanicScreen({ navigation }) {
  const { user } = useAuth();

  // Category state (Default: 'umum')
  const [selectedCategory, setSelectedCategory] = useState(PANIC_CATEGORIES.UMUM);

  // Real GPS & Location state (Never mock/fake)
  const [location, setLocation] = useState(null);
  const [locationAddress, setLocationAddress] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState(null);

  // Panic countdown & loading state
  const [isPanicking, setIsPanicking] = useState(false);
  const [panicLoading, setPanicLoading] = useState(false);
  const [countdown, setCountdown] = useState(15);

  // Target device info acquired upon pre-check
  const [targetDevice, setTargetDevice] = useState(null);

  // Realtime IoT Status & Active Reports migrated from Dashboard
  const [deviceInfo, setDeviceInfo] = useState({
    hasDevice: false,
    deviceId: null,
    zone: null,
    lokasi: null,
    isOnline: false,
    isActive: false,
    loading: true,
  });
  const [activeReportsCount, setActiveReportsCount] = useState(0);

  // Modal Dialog states
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showNoDeviceModal, setShowNoDeviceModal] = useState(false);
  const [showDeviceOfflineModal, setShowDeviceOfflineModal] = useState(false);
  const [offlineDeviceName, setOfflineDeviceName] = useState('');
  const [showLoginRequiredModal, setShowLoginRequiredModal] = useState(false);
  const [showGpsRequiredModal, setShowGpsRequiredModal] = useState(false);

  // Outcome modal (distinguishing report saved vs siren activated)
  const [outcomeModal, setOutcomeModal] = useState({
    visible: false,
    title: '',
    message: '',
    isSuccess: true,
    reportId: '',
    reportSaved: false,
    sirenActivated: false,
    deviceCard: null,
  });

  // Pulse ring animations
  const pulse1 = useRef(new Animated.Value(1)).current;
  const pulse2 = useRef(new Animated.Value(1)).current;
  const sirenOpacity = useRef(new Animated.Value(0.4)).current;

  // Idle pulse loops
  useEffect(() => {
    const a1 = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse1, { toValue: 1.10, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse1, { toValue: 1,    duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    const a2 = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse2, { toValue: 1.20, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse2, { toValue: 1,    duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    a1.start();
    a2.start();
    return () => { a1.stop(); a2.stop(); };
  }, []);

  // Active siren flashing animation
  useEffect(() => {
    let siren;
    if (isPanicking) {
      siren = Animated.loop(
        Animated.sequence([
          Animated.timing(sirenOpacity, { toValue: 1,   duration: 250, useNativeDriver: true }),
          Animated.timing(sirenOpacity, { toValue: 0.25, duration: 250, useNativeDriver: true }),
        ])
      );
      siren.start();
    } else {
      sirenOpacity.setValue(0.4);
    }
    return () => siren && siren.stop();
  }, [isPanicking]);

  // Countdown timer for 15s auto-off
  useEffect(() => {
    let t;
    if (isPanicking && countdown > 0) {
      t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    } else if (countdown === 0 && isPanicking) {
      setIsPanicking(false);
      setCountdown(15);
    }
    return () => clearTimeout(t);
  }, [isPanicking, countdown]);

  // Fetch real GPS on initial mount
  useEffect(() => {
    fetchLocation();
  }, []);

  // Listen to IoT Posko status & active reports (Migrated from Dashboard)
  useEffect(() => {
    if (!user?.id) return;

    const unsubDevice = listenToIoTDeviceStatus(user.id, (dev) => {
      setDeviceInfo({
        hasDevice: dev.hasDevice || false,
        deviceId: dev.deviceId || null,
        zone: dev.zone || null,
        lokasi: dev.lokasi || null,
        isOnline: dev.isOnline || false,
        isActive: dev.isActive || false,
        loading: false,
      });
    });

    const unsubStats = listenToDashboardStats(user.id, (data) => {
      setActiveReportsCount(data.activeReports || 0);
    });

    return () => {
      if (typeof unsubDevice === 'function') unsubDevice();
      if (typeof unsubStats === 'function') unsubStats();
    };
  }, [user?.id]);

  /*
  |--------------------------------------------------------------------------
  | Fetch Real GPS Location & Reverse Geocode (Strictly Real, No Fake Fallback)
  |--------------------------------------------------------------------------
  */
  async function fetchLocation() {
    setLocationLoading(true);
    setLocationError(null);
    try {
      const coords = await getCurrentLocation();
      setLocation(coords);
      // Asynchronously fetch human-readable address
      getAddressFromCoordinates(coords.latitude, coords.longitude)
        .then((addr) => setLocationAddress(addr))
        .catch(() => setLocationAddress(`${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`));
    } catch (err) {
      setLocation(null);
      setLocationAddress('');
      setLocationError(err.message || 'Gagal memperoleh lokasi GPS.');
    } finally {
      setLocationLoading(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Handle Panic Button Press — Trigger Validation ONLY upon press
  |--------------------------------------------------------------------------
  */
  async function handlePanicPress() {
    // 0. Debounce: prevent multiple submissions
    if (isPanicking || panicLoading) return;

    // 1. Check user login
    if (!user || !user.id) {
      setShowLoginRequiredModal(true);
      return;
    }

    // 2. Check real GPS coordinates
    if (!location || !Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) {
      setShowGpsRequiredModal(true);
      return;
    }

    // 3. Check user IoT device assignment in users/{userId}
    setPanicLoading(true);
    let assignedDeviceKey = user?.assigned_device;
    if (!assignedDeviceKey || assignedDeviceKey === '-' || assignedDeviceKey === 'NONE' || assignedDeviceKey === 'null') {
      try {
        const hasDev = await checkUserHasDevice(user.id);
        if (!hasDev) {
          setPanicLoading(false);
          setShowNoDeviceModal(true);
          return;
        }
      } catch {
        setPanicLoading(false);
        setShowNoDeviceModal(true);
        return;
      }
    }

    // 4. Validate IoT device status in panicChannels
    try {
      const devInfo = await getDeviceFromDB2(assignedDeviceKey || user.id);
      if (!devInfo || !devInfo.device) {
        setPanicLoading(false);
        setShowNoDeviceModal(true);
        return;
      }

      if (devInfo.device.online === false) {
        setOfflineDeviceName(devInfo.deviceId || assignedDeviceKey);
        setPanicLoading(false);
        setShowDeviceOfflineModal(true);
        return;
      }

      setTargetDevice(devInfo);
      setPanicLoading(false);

      // 5. Open confirmation dialog before dispatching
      setShowConfirmModal(true);
    } catch (error) {
      setPanicLoading(false);
      const msg = error.message || '';
      if (msg.includes('offline')) {
        setOfflineDeviceName(assignedDeviceKey || 'Perangkat');
        setShowDeviceOfflineModal(true);
      } else if (msg.includes('belum memiliki') || msg.includes('tidak ditemukan')) {
        setShowNoDeviceModal(true);
      } else {
        setOutcomeModal({
          visible: true,
          title: 'Kendala Sistem',
          message: msg,
          isSuccess: false,
          reportId: '',
          reportSaved: false,
          sirenActivated: false,
          deviceCard: null,
        });
      }
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Execute Panic Dispatch after User Confirmation
  |--------------------------------------------------------------------------
  */
  async function executePanic() {
    setShowConfirmModal(false);

    if (!location || !Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) {
      setShowGpsRequiredModal(true);
      return;
    }

    setPanicLoading(true);
    try {
      const result = await sendPanic(
        user.id,
        user,
        {
          latitude: location.latitude,
          longitude: location.longitude,
        },
        selectedCategory
      );

      setIsPanicking(true);
      setCountdown(15);

      setOutcomeModal({
        visible: true,
        title: 'Sinyal Darurat Terkirim',
        message: 'Laporan berhasil disimpan di sistem posko dan sinyal aktivasi sirine terkirim ke posko.',
        isSuccess: true,
        reportId: result.panicId,
        reportSaved: true,
        sirenActivated: true,
        deviceCard: {
          device: result?.device?.device || targetDevice?.device?.device || 'PB001',
          lokasi: result?.device?.lokasi || targetDevice?.device?.lokasi || 'Posko',
          zona: result?.zone || targetDevice?.zone || 'TESTER',
          duration: '15 detik',
          category: selectedCategory.toUpperCase(),
          address: result?.panicData?.address || locationAddress || `${location.latitude}, ${location.longitude}`,
        },
      });
    } catch (err) {
      setOutcomeModal({
        visible: true,
        title: 'Pengiriman Gagal',
        message: err.message || 'Laporan gagal diproses oleh server.',
        isSuccess: false,
        reportId: '',
        reportSaved: false,
        sirenActivated: false,
        deviceCard: null,
      });
    } finally {
      setPanicLoading(false);
    }
  }

  function handleCancelAlarm() {
    setShowCancelModal(true);
  }

  function confirmCancelAlarm() {
    setShowCancelModal(false);
    setIsPanicking(false);
    setCountdown(15);
  }

  function callEmergencyNumber(num) {
    Linking.openURL(`tel:${num}`).catch(() => {
      setOutcomeModal({
        visible: true,
        title: 'Panggilan Cepat',
        message: `Menghubungi saluran darurat resmi: ${num}`,
        isSuccess: true,
        reportId: '',
        reportSaved: false,
        sirenActivated: false,
        deviceCard: null,
      });
    });
  }

  const currentCategory = INCIDENT_CATEGORIES.find((c) => c.id === selectedCategory) || INCIDENT_CATEGORIES[0];

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. HEADER BAR & REALTIME POSKO STATUS ── */}
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <Text style={styles.topBarSub}>Sistem Tanggap Darurat</Text>
            <Text style={styles.topBarName} numberOfLines={1}>
              {user?.name || user?.username || 'Warga Siaga'}
            </Text>
          </View>
          <View style={styles.topBarRight}>
            <View
              style={[
                styles.systemStatusPill,
                deviceInfo.loading
                  ? styles.pillLoading
                  : deviceInfo.isOnline
                    ? styles.pillOnline
                    : deviceInfo.hasDevice
                      ? styles.pillOffline
                      : styles.pillNeutral,
              ]}
            >
              <View
                style={[
                  styles.systemPulseDot,
                  {
                    backgroundColor: deviceInfo.loading
                      ? '#D97706'
                      : deviceInfo.isOnline
                        ? colors.success
                        : deviceInfo.hasDevice
                          ? colors.danger
                          : colors.textMuted,
                  },
                ]}
              />
              <Text
                style={[
                  styles.systemStatusText,
                  {
                    color: deviceInfo.loading
                      ? '#B45309'
                      : deviceInfo.isOnline
                        ? '#047857'
                        : deviceInfo.hasDevice
                          ? '#B91C1C'
                          : colors.textSecondary,
                  },
                ]}
              >
                {deviceInfo.loading
                  ? 'Memeriksa IoT...'
                  : deviceInfo.isOnline
                    ? `Posko Siaga (${deviceInfo.deviceId || 'IoT'})`
                    : deviceInfo.hasDevice
                      ? 'Posko Offline'
                      : 'Posko Mandiri'}
              </Text>
            </View>
          </View>
        </View>

        {/* ── ACTIVE INCIDENT ALERT BANNER (Migrated from Dashboard) ── */}
        {activeReportsCount > 0 && (
          <TouchableOpacity
            style={styles.activeReportBanner}
            onPress={() => navigation?.navigate?.('HistoryTab')}
            activeOpacity={0.85}
          >
            <View style={styles.activeReportIconWrap}>
              <Ionicons name="notifications" size={16} color={colors.primary} />
            </View>
            <View style={styles.activeReportTextWrap}>
              <Text style={styles.activeReportTitle}>
                {activeReportsCount} Laporan Sedang Ditangani Posko
              </Text>
              <Text style={styles.activeReportSub}>Ketuk untuk memantau status di tab Riwayat</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        )}

        {/* ── 2. REAL GPS LOCATION CARD ── */}
        <View style={styles.gpsCard}>
          <View style={[styles.gpsIconWrap, location ? styles.gpsIconGood : styles.gpsIconWarn]}>
            <Ionicons
              name={location ? 'location' : 'location-outline'}
              size={20}
              color={location ? colors.success : colors.warning}
            />
          </View>

          <View style={styles.gpsDetails}>
            <View style={styles.gpsHeaderRow}>
              <Text style={styles.gpsTitle}>LOKASI GPS AKTUAL</Text>
              <View style={[styles.gpsBadge, location ? styles.gpsBadgeGood : styles.gpsBadgeWarn]}>
                <Text style={[styles.gpsBadgeText, { color: location ? colors.success : colors.warning }]}>
                  {location ? 'Terkunci' : 'Mencari...'}
                </Text>
              </View>
            </View>

            {location ? (
              <>
                <Text style={styles.gpsCoordsText}>
                  {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </Text>
                <Text style={styles.gpsAddressText} numberOfLines={2}>
                  {locationAddress || 'Mengambil data alamat lengkap...'}
                </Text>
              </>
            ) : (
              <Text style={styles.gpsErrorText}>
                {locationLoading
                  ? 'Menghubungkan ke satelit GPS...'
                  : (locationError || 'Akses GPS belum tersedia. Ketuk tombol segarkan.')}
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.gpsRefreshBtn}
            onPress={fetchLocation}
            disabled={locationLoading}
            activeOpacity={0.7}
          >
            {locationLoading ? (
              <ActivityIndicator size="small" color={colors.brandNavy} />
            ) : (
              <Ionicons name="refresh" size={18} color={colors.brandNavy} />
            )}
          </TouchableOpacity>
        </View>

        {/* ── 3. PILIH KATEGORI DARURAT (2x2 Balanced Grid - No Text Cutoff) ── */}
        <View style={styles.categorySection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeading}>PILIH KATEGORI DARURAT</Text>
            <Text style={styles.sectionSubHeading}>Sesuaikan jenis kejadian darurat yang dialami</Text>
          </View>

          <View style={styles.categoryGrid}>
            <View style={styles.categoryRow}>
              {[INCIDENT_CATEGORIES[0], INCIDENT_CATEGORIES[1]].map((cat) => {
                const isActive = selectedCategory === cat.id;
                return (
                  <PressableScale
                    key={cat.id}
                    style={[
                      styles.categoryCard,
                      isActive && {
                        borderColor: cat.color,
                        backgroundColor: cat.bg,
                      },
                    ]}
                    onPress={() => setSelectedCategory(cat.id)}
                    activeOpacity={0.85}
                    scaleTo={0.96}
                  >
                    <View style={styles.categoryCardTop}>
                      <View style={[styles.categoryIconWrap, { backgroundColor: `${cat.color}15` }]}>
                        <Ionicons name={cat.iconName} size={20} color={cat.color} />
                      </View>
                      <View
                        style={[
                          styles.categoryRadio,
                          isActive && { borderColor: cat.color, backgroundColor: cat.color },
                        ]}
                      >
                        {isActive && <Ionicons name="checkmark" size={10} color={colors.white} />}
                      </View>
                    </View>

                    <Text
                      style={[
                        styles.categoryLabel,
                        isActive && { color: cat.color, fontWeight: text.bold },
                      ]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {cat.label}
                    </Text>
                    <Text style={styles.categoryDesc} numberOfLines={2}>
                      {cat.description}
                    </Text>
                  </PressableScale>
                );
              })}
            </View>

            <View style={styles.categoryRow}>
              {[INCIDENT_CATEGORIES[2], INCIDENT_CATEGORIES[3]].map((cat) => {
                const isActive = selectedCategory === cat.id;
                return (
                  <PressableScale
                    key={cat.id}
                    style={[
                      styles.categoryCard,
                      isActive && {
                        borderColor: cat.color,
                        backgroundColor: cat.bg,
                      },
                    ]}
                    onPress={() => setSelectedCategory(cat.id)}
                    activeOpacity={0.85}
                    scaleTo={0.96}
                  >
                    <View style={styles.categoryCardTop}>
                      <View style={[styles.categoryIconWrap, { backgroundColor: `${cat.color}15` }]}>
                        <Ionicons name={cat.iconName} size={20} color={cat.color} />
                      </View>
                      <View
                        style={[
                          styles.categoryRadio,
                          isActive && { borderColor: cat.color, backgroundColor: cat.color },
                        ]}
                      >
                        {isActive && <Ionicons name="checkmark" size={10} color={colors.white} />}
                      </View>
                    </View>

                    <Text
                      style={[
                        styles.categoryLabel,
                        isActive && { color: cat.color, fontWeight: text.bold },
                      ]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {cat.label}
                    </Text>
                    <Text style={styles.categoryDesc} numberOfLines={2}>
                      {cat.description}
                    </Text>
                  </PressableScale>
                );
              })}
            </View>
          </View>
        </View>

        {/* ── 4. PANIC BUTTON ACTION AREA ── */}
        <View style={styles.panicArea}>
          {isPanicking ? (
            /* Active Siren Countdown State */
            <View style={styles.activeWrap}>
              <Animated.View
                pointerEvents="none"
                style={[styles.sirenRingOuter, { opacity: sirenOpacity }]}
              />
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.sirenRingInner,
                  {
                    opacity: sirenOpacity.interpolate({
                      inputRange: [0.25, 1],
                      outputRange: [0.4, 1],
                    }),
                  },
                ]}
              />
              <View style={styles.activeCircle}>
                <Ionicons name="warning" size={32} color={colors.white} />
                <Text style={styles.activeTitle}>SIRINE AKTIF</Text>
                <Text style={styles.activeCount}>{countdown}</Text>
                <Text style={styles.activeUnit}>DETIK AUTO-OFF</Text>
              </View>

              <TouchableOpacity
                style={styles.cancelAlarmBtn}
                onPress={handleCancelAlarm}
                activeOpacity={0.82}
              >
                <Ionicons name="stop-circle-outline" size={18} color="#DC2626" />
                <Text style={styles.cancelAlarmLabel}>Matikan Sirine Fisik</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Idle Ready State */
            <View style={styles.idleWrap}>
              <Animated.View
                pointerEvents="none"
                style={[styles.pulseOuter, { transform: [{ scale: pulse2 }] }]}
              />
              <Animated.View
                pointerEvents="none"
                style={[styles.pulseInner, { transform: [{ scale: pulse1 }] }]}
              />

              <TouchableOpacity
                style={[
                  styles.panicMainBtn,
                  panicLoading && { opacity: 0.75 },
                ]}
                onPress={handlePanicPress}
                disabled={panicLoading}
                activeOpacity={0.85}
              >
                {panicLoading ? (
                  <View style={styles.panicBtnContent}>
                    <ActivityIndicator size="large" color={colors.white} />
                    <Text style={styles.panicBtnSub}>Memeriksa Posko...</Text>
                  </View>
                ) : (
                  <View style={styles.panicBtnContent}>
                    <Ionicons name={currentCategory.iconName} size={42} color={colors.white} />
                    <Text style={styles.panicBtnLabel}>PANIC</Text>
                    <Text style={styles.panicBtnSub}>TEKAN UNTUK DARURAT</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Active Category Display Badge */}
          {!isPanicking && (
            <View
              style={[
                styles.categoryIndicatorPill,
                { backgroundColor: currentCategory.bg, borderColor: currentCategory.border },
              ]}
            >
              <Ionicons name={currentCategory.iconName} size={14} color={currentCategory.color} />
              <Text style={styles.categoryIndicatorLabel}>Kategori Terpilih:</Text>
              <Text style={[styles.categoryIndicatorValue, { color: currentCategory.color }]}>
                {currentCategory.label.toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {/* ── 5. QUICK EMERGENCY CALL HOTLINES ── */}
        <View style={styles.hotlineSection}>
          <Text style={styles.sectionHeading}>PANGGILAN CEPAT DARURAT RESMI</Text>
          <View style={styles.hotlineGrid}>
            {EMERGENCY_CONTACTS.map((c) => (
              <TouchableOpacity
                key={c.number}
                style={styles.hotlineCard}
                onPress={() => callEmergencyNumber(c.number)}
                activeOpacity={0.75}
              >
                <View style={[styles.hotlineIconWrap, { backgroundColor: `${c.color}15` }]}>
                  <Ionicons name={c.iconName} size={20} color={c.color} />
                </View>
                <Text style={[styles.hotlineNumber, { color: c.color }]}>{c.number}</Text>
                <Text style={styles.hotlineLabel}>{c.label}</Text>
                <Text style={styles.hotlineSub}>{c.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* ── MODAL 1: KONFIRMASI PENGIRIMAN PANIC ── */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={[styles.modalIconWrap, { backgroundColor: `${currentCategory.color}18` }]}>
              <Ionicons name={currentCategory.iconName} size={36} color={currentCategory.color} />
            </View>

            <Text style={styles.modalTitle}>Aktifkan Panic Button?</Text>
            <Text style={styles.modalDesc}>
              Laporan darurat akan dikirimkan ke Command Center Posko dan sinyal aktivasi sirine terkirim ke posko.
            </Text>

            <View style={styles.modalInfoBox}>
              <View style={styles.modalInfoRow}>
                <Text style={styles.modalInfoLabel}>Kategori:</Text>
                <View style={[styles.miniBadge, { backgroundColor: currentCategory.bg, borderColor: currentCategory.border }]}>
                  <Text style={[styles.miniBadgeText, { color: currentCategory.color }]}>
                    {currentCategory.label}
                  </Text>
                </View>
              </View>

              <View style={styles.modalInfoRow}>
                <Text style={styles.modalInfoLabel}>Perangkat IoT:</Text>
                <Text style={styles.modalInfoValue}>
                  {targetDevice?.device?.device || user?.assigned_device || 'PB001'} ({targetDevice?.device?.lokasi || 'Posko'})
                </Text>
              </View>

              <View style={styles.modalInfoRow}>
                <Text style={styles.modalInfoLabel}>Wilayah:</Text>
                <Text style={styles.modalInfoValue}>
                  Zona {targetDevice?.zone || user?.assigned_zone || 'TESTER'}
                </Text>
              </View>

              <View style={styles.modalInfoRow}>
                <Text style={styles.modalInfoLabel}>Lokasi Anda:</Text>
                <Text style={[styles.modalInfoValue, { flex: 1, textAlign: 'right' }]} numberOfLines={2}>
                  {locationAddress || `${location?.latitude?.toFixed(5)}, ${location?.longitude?.toFixed(5)}`}
                </Text>
              </View>
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={() => setShowConfirmModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalBtnCancelText}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtnConfirm, { backgroundColor: colors.primary }]}
                onPress={executePanic}
                activeOpacity={0.85}
              >
                <Ionicons name="flash" size={16} color={colors.white} />
                <Text style={styles.modalBtnConfirmText}>Ya, Aktifkan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL 2: BELUM ADA PERANGKAT TERDAFTAR ── */}
      <Modal
        visible={showNoDeviceModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNoDeviceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={[styles.modalIconWrap, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="hardware-chip" size={34} color="#D97706" />
            </View>

            <Text style={styles.modalTitle}>Belum Punya Perangkat</Text>
            <Text style={styles.modalDesc}>
              Akun Anda belum memiliki perangkat Panic Button yang terdaftar.
            </Text>

            <View style={styles.modalNoticeBox}>
              <Ionicons name="information-circle" size={18} color="#D97706" style={{ marginTop: 1 }} />
              <Text style={styles.modalNoticeText}>
                Silakan hubungi administrator posko untuk memasangkan perangkat Panic Button IoT ke akun warga Anda.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.modalBtnSingle, { backgroundColor: colors.brandNavy }]}
              onPress={() => setShowNoDeviceModal(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.modalBtnSingleText}>Mengerti</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── MODAL 3: PERANGKAT IoT OFFLINE ── */}
      <Modal
        visible={showDeviceOfflineModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeviceOfflineModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={[styles.modalIconWrap, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="cloud-offline" size={34} color="#DC2626" />
            </View>

            <Text style={styles.modalTitle}>Perangkat Sedang Offline</Text>
            <Text style={styles.modalDesc}>
              Perangkat Panic Button IoT <Text style={{ fontWeight: text.bold }}>"{offlineDeviceName}"</Text> sedang tidak terhubung ke jaringan internet posko.
            </Text>

            <View style={styles.modalNoticeBox}>
              <Ionicons name="alert-circle" size={18} color="#DC2626" style={{ marginTop: 1 }} />
              <Text style={[styles.modalNoticeText, { color: '#991B1B' }]}>
                Pastikan perangkat keras sirine di posko dalam kondisi menyala dan terhubung ke WiFi/seluler.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.modalBtnSingle, { backgroundColor: colors.brandNavy }]}
              onPress={() => setShowDeviceOfflineModal(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.modalBtnSingleText}>Mengerti</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── MODAL 4: AKSES DITOLAK (BELUM LOGIN) ── */}
      <Modal
        visible={showLoginRequiredModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLoginRequiredModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={[styles.modalIconWrap, { backgroundColor: colors.dangerBg }]}>
              <Ionicons name="close-circle" size={36} color={colors.danger} />
            </View>

            <Text style={styles.modalTitle}>Akses Ditolak</Text>
            <Text style={styles.modalDesc}>
              Anda harus login terlebih dahulu untuk menggunakan fitur Panic Button.
            </Text>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={() => setShowLoginRequiredModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalBtnCancelText}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtnConfirm, { backgroundColor: colors.brandNavy }]}
                onPress={() => {
                  setShowLoginRequiredModal(false);
                  navigation?.navigate?.('Login');
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="log-in-outline" size={16} color={colors.white} />
                <Text style={styles.modalBtnConfirmText}>Login Sekarang</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL 5: GPS BELUM TERSEDIA ── */}
      <Modal
        visible={showGpsRequiredModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGpsRequiredModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={[styles.modalIconWrap, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="navigate-circle" size={36} color="#D97706" />
            </View>

            <Text style={styles.modalTitle}>Akses GPS Diperlukan</Text>
            <Text style={styles.modalDesc}>
              Posisi GPS aktual diperlukan agar posko dapat mengetahui titik lokasi darurat Anda secara akurat.
            </Text>

            <TouchableOpacity
              style={[styles.modalBtnSingle, { backgroundColor: colors.brandNavy }]}
              onPress={() => {
                setShowGpsRequiredModal(false);
                fetchLocation();
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.modalBtnSingleText}>Cari Sinyal GPS Lagi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── MODAL 6: HASIL PENGIRIMAN (DIFFERENTIATES REPORT VS SIREN) ── */}
      <Modal
        visible={outcomeModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setOutcomeModal({ ...outcomeModal, visible: false })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View
              style={[
                styles.modalIconWrap,
                { backgroundColor: outcomeModal.isSuccess ? colors.successBg : colors.dangerBg },
              ]}
            >
              <Ionicons
                name={outcomeModal.isSuccess ? 'checkmark-circle' : 'alert-circle'}
                size={38}
                color={outcomeModal.isSuccess ? colors.success : colors.danger}
              />
            </View>

            <Text style={styles.modalTitle}>{outcomeModal.title}</Text>
            <Text style={styles.modalDesc}>{outcomeModal.message}</Text>

            {outcomeModal.deviceCard ? (
              <View style={styles.outcomeDetailCard}>
                <View style={styles.outcomeStatusRow}>
                  <View style={styles.outcomeCheckLine}>
                    <Ionicons name="checkmark-done" size={14} color={colors.success} />
                    <Text style={styles.outcomeCheckText}>Laporan berhasil disimpan di sistem posko</Text>
                  </View>
                  <View style={styles.outcomeCheckLine}>
                    <Ionicons name="radio" size={14} color="#D97706" />
                    <Text style={styles.outcomeCheckText}>
                      Sinyal aktivasi sirine terkirim ke posko ({outcomeModal.deviceCard.duration})
                    </Text>
                  </View>
                </View>

                <View style={styles.outcomeDivider} />

                <View style={styles.outcomeMetaRow}>
                  <Text style={styles.outcomeMetaLabel}>Perangkat:</Text>
                  <Text style={styles.outcomeMetaVal}>{outcomeModal.deviceCard.device}</Text>
                </View>

                <View style={styles.outcomeMetaRow}>
                  <Text style={styles.outcomeMetaLabel}>Lokasi Modul:</Text>
                  <Text style={styles.outcomeMetaVal}>{outcomeModal.deviceCard.lokasi}</Text>
                </View>

                <View style={styles.outcomeMetaRow}>
                  <Text style={styles.outcomeMetaLabel}>Wilayah:</Text>
                  <Text style={styles.outcomeMetaVal}>Zona {outcomeModal.deviceCard.zona}</Text>
                </View>

                <View style={styles.outcomeMetaRow}>
                  <Text style={styles.outcomeMetaLabel}>Kategori:</Text>
                  <Text style={[styles.outcomeMetaVal, { color: colors.primary, fontWeight: text.bold }]}>
                    {outcomeModal.deviceCard.category}
                  </Text>
                </View>

                <View style={styles.outcomeAddressBlock}>
                  <Text style={styles.outcomeMetaLabel}>Alamat Kejadian:</Text>
                  <Text style={styles.outcomeAddressVal} numberOfLines={2}>
                    {outcomeModal.deviceCard.address}
                  </Text>
                </View>

                <View style={styles.outcomeNoteBox}>
                  <Ionicons name="information-circle-outline" size={14} color="#64748B" />
                  <Text style={styles.outcomeNoteText}>
                    Sirine fisik akan merespons sesuai koneksi dan kondisi perangkat IoT posko.
                  </Text>
                </View>
              </View>
            ) : null}

            <TouchableOpacity
              style={[
                styles.modalBtnSingle,
                { backgroundColor: outcomeModal.isSuccess ? colors.brandNavy : colors.bgElevated },
              ]}
              onPress={() => setOutcomeModal({ ...outcomeModal, visible: false })}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.modalBtnSingleText,
                  !outcomeModal.isSuccess && { color: colors.textPrimary },
                ]}
              >
                Mengerti
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── MODAL 7: KONFIRMASI MATIKAN ALARM ── */}
      <Modal
        visible={showCancelModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCancelModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={[styles.modalIconWrap, { backgroundColor: colors.dangerBg }]}>
              <Ionicons name="stop-circle" size={36} color={colors.danger} />
            </View>

            <Text style={styles.modalTitle}>Matikan Alarm?</Text>
            <Text style={styles.modalDesc}>
              Sinyal alarm dan sirene darurat fisik pada perangkat posko akan dinonaktifkan.
            </Text>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={() => setShowCancelModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalBtnCancelText}>Kembali</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtnConfirm, { backgroundColor: '#DC2626' }]}
                onPress={confirmCancelAlarm}
                activeOpacity={0.85}
              >
                <Text style={styles.modalBtnConfirmText}>Ya, Matikan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const PANIC_BTN_SIZE = 186;
const PULSE_INNER_SIZE = 224;
const PULSE_OUTER_SIZE = 264;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: {
    padding: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 120 : 100,
  },

  // Top Bar
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.bgSurface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    ...shadows.sm,
  },
  topBarLeft: { flex: 1, marginRight: 8 },
  topBarSub: { fontSize: 11, color: colors.textMuted, fontWeight: text.medium },
  topBarName: { fontSize: text.base, fontWeight: text.bold, color: colors.brandNavy, marginTop: 1 },
  topBarRight: { flexDirection: 'row', alignItems: 'center' },
  systemStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
    gap: 6,
  },
  pillOnline: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  pillOffline: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  pillLoading: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  pillNeutral: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  systemPulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  systemStatusText: {
    fontSize: 11,
    fontWeight: text.bold,
  },

  // Active Report Banner (Migrated from Dashboard)
  activeReportBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    gap: 10,
    ...shadows.sm,
  },
  activeReportIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeReportTextWrap: {
    flex: 1,
  },
  activeReportTitle: {
    fontSize: 12,
    fontWeight: text.bold,
    color: '#991B1B',
  },
  activeReportSub: {
    fontSize: 10,
    color: '#B91C1C',
    marginTop: 1,
  },

  // GPS Card
  gpsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgSurface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 12,
    gap: 10,
    ...shadows.sm,
  },
  gpsIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsIconGood: {
    backgroundColor: '#ECFDF5',
  },
  gpsIconWarn: {
    backgroundColor: '#FFFBEB',
  },
  gpsDetails: { flex: 1 },
  gpsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  gpsTitle: {
    fontSize: 10,
    fontWeight: text.bold,
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  gpsBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  gpsBadgeGood: { backgroundColor: colors.successBg, borderColor: colors.successBorder },
  gpsBadgeWarn: { backgroundColor: colors.warningBg, borderColor: colors.warningBorder },
  gpsBadgeText: { fontSize: 9, fontWeight: text.bold },
  gpsCoordsText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: colors.brandNavy,
    fontWeight: text.semibold,
  },
  gpsAddressText: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 15,
    marginTop: 2,
  },
  gpsErrorText: {
    fontSize: 11,
    color: colors.danger,
    marginTop: 2,
  },
  gpsRefreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Category Section
  categorySection: {
    marginBottom: 12,
  },
  sectionHeaderRow: {
    marginBottom: 8,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: text.black,
    color: colors.brandNavy,
    letterSpacing: 1.1,
  },
  sectionSubHeading: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  categoryGrid: {
    gap: 10,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  categoryCard: {
    flex: 1,
    minWidth: 0,
    minHeight: 112,
    backgroundColor: colors.bgSurface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 11,
    paddingVertical: 10,
    justifyContent: 'space-between',
    ...shadows.sm,
  },
  categoryCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    fontSize: 13.5,
    fontWeight: text.bold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  categoryDesc: {
    fontSize: 10.5,
    color: colors.textSecondary,
    lineHeight: 14,
  },

  // Panic Button Area
  panicArea: {
    alignItems: 'center',
    marginVertical: 12,
  },
  idleWrap: {
    width: PULSE_OUTER_SIZE,
    height: PULSE_OUTER_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pulseOuter: {
    position: 'absolute',
    width: PULSE_OUTER_SIZE,
    height: PULSE_OUTER_SIZE,
    borderRadius: PULSE_OUTER_SIZE / 2,
    backgroundColor: 'rgba(220, 38, 38, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.18)',
    zIndex: 1,
  },
  pulseInner: {
    position: 'absolute',
    width: PULSE_INNER_SIZE,
    height: PULSE_INNER_SIZE,
    borderRadius: PULSE_INNER_SIZE / 2,
    backgroundColor: 'rgba(220, 38, 38, 0.14)',
    borderWidth: 1.5,
    borderColor: 'rgba(220, 38, 38, 0.28)',
    zIndex: 2,
  },
  panicMainBtn: {
    width: PANIC_BTN_SIZE,
    height: PANIC_BTN_SIZE,
    borderRadius: PANIC_BTN_SIZE / 2,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 5,
    borderColor: 'rgba(255,255,255,0.25)',
    zIndex: 10,
    elevation: 12,
    ...shadows.redXl,
  },
  panicBtnContent: {
    alignItems: 'center',
  },
  panicBtnLabel: {
    fontSize: 27,
    fontWeight: text.black,
    color: colors.white,
    letterSpacing: 4,
    marginTop: 2,
  },
  panicBtnSub: {
    fontSize: 9,
    fontWeight: text.bold,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
    letterSpacing: 0.8,
  },

  // Active Siren State
  activeWrap: {
    width: PULSE_OUTER_SIZE + 20,
    height: PULSE_OUTER_SIZE + 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  sirenRingOuter: {
    position: 'absolute',
    width: PULSE_OUTER_SIZE + 10,
    height: PULSE_OUTER_SIZE + 10,
    borderRadius: (PULSE_OUTER_SIZE + 10) / 2,
    backgroundColor: 'rgba(220, 38, 38, 0.25)',
    borderWidth: 2,
    borderColor: colors.primary,
    zIndex: 1,
  },
  sirenRingInner: {
    position: 'absolute',
    width: PULSE_INNER_SIZE + 10,
    height: PULSE_INNER_SIZE + 10,
    borderRadius: (PULSE_INNER_SIZE + 10) / 2,
    backgroundColor: 'rgba(220, 38, 38, 0.35)',
    borderWidth: 1.5,
    borderColor: colors.primaryLight,
    zIndex: 2,
  },
  activeCircle: {
    width: PANIC_BTN_SIZE,
    height: PANIC_BTN_SIZE,
    borderRadius: PANIC_BTN_SIZE / 2,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.3)',
    zIndex: 10,
    elevation: 12,
    ...shadows.redXl,
  },
  activeTitle: {
    fontSize: 11,
    fontWeight: text.black,
    color: colors.white,
    letterSpacing: 2,
    marginTop: 4,
  },
  activeCount: {
    fontSize: 44,
    fontWeight: text.black,
    color: '#FCD34D',
    lineHeight: 50,
  },
  activeUnit: {
    fontSize: 9,
    fontWeight: text.bold,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 1.5,
  },
  cancelAlarmBtn: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgSurface,
    borderWidth: 1.5,
    borderColor: '#FECACA',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radius.full,
    gap: 8,
    zIndex: 15,
    ...shadows.sm,
  },
  cancelAlarmLabel: {
    fontSize: text.xs,
    fontWeight: text.bold,
    color: '#DC2626',
  },

  // Category Indicator
  categoryIndicatorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    gap: 6,
  },
  categoryIndicatorLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: text.medium,
  },
  categoryIndicatorValue: {
    fontSize: 11,
    fontWeight: text.bold,
  },

  // Hotlines
  hotlineSection: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  hotlineGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  hotlineCard: {
    flex: 1,
    backgroundColor: colors.bgSurface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    alignItems: 'center',
    ...shadows.sm,
  },
  hotlineIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  hotlineNumber: {
    fontSize: text.sm,
    fontWeight: text.bold,
  },
  hotlineLabel: {
    fontSize: 10,
    color: colors.textPrimary,
    fontWeight: text.semibold,
    marginTop: 2,
  },
  hotlineSub: {
    fontSize: 8,
    color: colors.textMuted,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.bgSurface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.lg,
  },
  modalIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: text.lg,
    fontWeight: text.bold,
    color: colors.brandNavy,
    textAlign: 'center',
    marginBottom: 6,
  },
  modalDesc: {
    fontSize: text.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  modalInfoBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: spacing.sm + 2,
    marginBottom: spacing.md,
    gap: 8,
  },
  modalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalInfoLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: text.medium,
  },
  modalInfoValue: {
    fontSize: 11,
    color: colors.textPrimary,
    fontWeight: text.semibold,
  },
  miniBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  miniBadgeText: {
    fontSize: 10,
    fontWeight: text.bold,
  },
  modalNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: 8,
    width: '100%',
  },
  modalNoticeText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 17,
    fontWeight: text.medium,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  modalBtnCancel: {
    flex: 1,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnCancelText: {
    color: colors.textSecondary,
    fontSize: text.sm,
    fontWeight: text.semibold,
  },
  modalBtnConfirm: {
    flex: 1.3,
    height: 44,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    ...shadows.red,
  },
  modalBtnConfirmText: {
    color: colors.white,
    fontSize: text.sm,
    fontWeight: text.bold,
  },
  modalBtnSingle: {
    width: '100%',
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnSingleText: {
    color: colors.white,
    fontSize: text.sm,
    fontWeight: text.bold,
  },

  // Outcome Detail Card
  outcomeDetailCard: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  outcomeStatusRow: {
    gap: 6,
    marginBottom: spacing.sm,
  },
  outcomeCheckLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  outcomeCheckText: {
    fontSize: 11,
    color: colors.textPrimary,
    fontWeight: text.semibold,
  },
  outcomeDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: spacing.xs,
  },
  outcomeMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  outcomeMetaLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  outcomeMetaVal: {
    fontSize: 11,
    color: colors.textPrimary,
    fontWeight: text.semibold,
  },
  outcomeAddressBlock: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  outcomeAddressVal: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  outcomeNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  outcomeNoteText: {
    flex: 1,
    fontSize: 10,
    color: '#64748B',
    lineHeight: 14,
  },
});
