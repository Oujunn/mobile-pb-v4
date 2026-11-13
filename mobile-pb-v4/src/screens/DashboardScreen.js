import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import {
  listenToDashboardStats,
  listenToIoTDeviceStatus,
  formatReportStatus,
  formatReportDate,
} from '../services/dashboardService';
import { colors, spacing, radius, text, shadows } from '../theme';
import PressableScale from '../components/PressableScale';

export default function DashboardScreen({ navigation }) {
  const { user } = useAuth();

  const [stats, setStats] = useState({
    totalReports: 0,
    activeReports: 0,
    completedReports: 0,
    latestActiveReport: null,
    recentReports: [],
    loading: true,
    error: null,
  });

  const [deviceInfo, setDeviceInfo] = useState({
    hasDevice: false,
    deviceId: null,
    zone: null,
    lokasi: null,
    statusType: 'loading',
    statusLabel: 'Memeriksa IoT...',
    statusSub: 'Menghubungkan ke posko...',
    isOnline: false,
    isActive: false,
    loading: true,
  });

  const [refreshing, setRefreshing] = useState(false);

  // Real-time listener for panic statistics and reports
  useEffect(() => {
    if (!user?.id) {
      setStats((prev) => ({ ...prev, loading: false }));
      return;
    }

    const unsubStats = listenToDashboardStats(user.id, (data) => {
      setStats({
        totalReports: data.totalReports || 0,
        activeReports: data.activeReports || 0,
        completedReports: data.completedReports || 0,
        latestActiveReport: data.latestActiveReport || null,
        recentReports: data.recentReports || [],
        loading: false,
        error: data.error || null,
      });
      setRefreshing(false);
    });

    const unsubDevice = listenToIoTDeviceStatus(user.id, (dev) => {
      setDeviceInfo({
        hasDevice: dev.hasDevice || false,
        deviceId: dev.deviceId || null,
        zone: dev.zone || null,
        lokasi: dev.lokasi || null,
        statusType: dev.statusType || 'no_device',
        statusLabel: dev.statusLabel || 'Belum Ada Perangkat',
        statusSub: dev.statusSub || 'Belum ada modul fisik yang dipasangkan ke akun ini',
        isOnline: dev.isOnline || false,
        isActive: dev.isActive || false,
        loading: false,
      });
    });

    return () => {
      if (typeof unsubStats === 'function') unsubStats();
      if (typeof unsubDevice === 'function') unsubDevice();
    };
  }, [user?.id]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Realtime listeners continuously reflect latest Firebase state;
    // timeout gives user natural pull-to-refresh tactile feedback
    setTimeout(() => setRefreshing(false), 1200);
  }, []);

  const roleLabel = user?.roleLabel || 'User Publik';
  const roleIcon = (() => {
    const r = (user?.role || '').toLowerCase().trim();
    if (r === 'admin' || r === 'administrator') return 'shield';
    if (r === 'petugas' || r === 'satpam' || r === 'security') return 'shield-checkmark';
    return 'person';
  })();

  const activeStatus = stats.latestActiveReport
    ? formatReportStatus(stats.latestActiveReport.status)
    : null;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    >
      {/* ── 1. WELCOME HERO & STATUS PENGGUNA ── */}
      <View style={styles.heroCard}>
        <View style={styles.headerAccentBar} />
        <View style={styles.heroTop}>
          <View style={styles.systemBadge}>
            <View style={styles.pulseDot} />
            <Text style={styles.systemBadgeText}>Sistem Siaga Publik Aktif</Text>
          </View>
          <View style={styles.roleBadge}>
            <Ionicons name={roleIcon} size={12} color="#173F70" />
            <Text style={styles.roleBadgeText}>{roleLabel}</Text>
          </View>
        </View>

        <Text style={styles.heroGreeting}>
          Selamat Datang, {user?.name || user?.username || 'Warga'}!
        </Text>
        <Text style={styles.heroSubtext}>
          Akses cepat tombol darurat dan pantau riwayat penanganan laporan Anda di sini.
        </Text>

        <PressableScale
          style={styles.btnPanicHero}
          onPress={() => navigation.navigate('PanicTab')}
          activeOpacity={0.88}
        >
          <Ionicons name="warning" size={18} color={colors.white} />
          <Text style={styles.btnPanicHeroText}>Kirim Panic Sekarang</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.white} style={{ marginLeft: 4 }} />
        </PressableScale>
      </View>

      {/* ── 2. TIGA KARTU RINGKASAN STATISTIK ── */}
      <View style={styles.statsSection}>
        {/* Card 1: Laporan Aktif */}
        <PressableScale
          style={[styles.statCard, styles.statCardActive]}
          onPress={() => navigation.navigate('HistoryTab')}
          activeOpacity={0.88}
        >
          <View style={styles.statHead}>
            <View style={[styles.statIconWrap, styles.statIconActive]}>
              <Ionicons name="warning" size={16} color="#DC2626" />
            </View>
            <View style={styles.badgePulseRed}>
              <View style={styles.pulseDotRed} />
              <Text style={styles.badgeTextRed}>Aktif</Text>
            </View>
          </View>
          <Text style={styles.statCount}>
            {stats.loading ? '—' : stats.activeReports}
          </Text>
          <Text style={styles.statLabel}>Laporan Aktif</Text>
          <Text style={styles.statDesc} numberOfLines={1}>
            Sedang diproses
          </Text>
        </PressableScale>

        {/* Card 2: Total Laporan */}
        <PressableScale
          style={[styles.statCard, styles.statCardTotal]}
          onPress={() => navigation.navigate('HistoryTab')}
          activeOpacity={0.88}
        >
          <View style={styles.statHead}>
            <View style={[styles.statIconWrap, styles.statIconTotal]}>
              <Ionicons name="clipboard-outline" size={16} color="#173F70" />
            </View>
            <View style={styles.badgeNeutral}>
              <Text style={styles.badgeTextNeutral}>Riwayat</Text>
            </View>
          </View>
          <Text style={styles.statCount}>
            {stats.loading ? '—' : stats.totalReports}
          </Text>
          <Text style={styles.statLabel}>Total Laporan</Text>
          <Text style={styles.statDesc} numberOfLines={1}>
            Pernah dikirim
          </Text>
        </PressableScale>

        {/* Card 3: Laporan Selesai */}
        <PressableScale
          style={[styles.statCard, styles.statCardCompleted]}
          onPress={() => navigation.navigate('HistoryTab')}
          activeOpacity={0.88}
        >
          <View style={styles.statHead}>
            <View style={[styles.statIconWrap, styles.statIconCompleted]}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#10B981" />
            </View>
            <View style={styles.badgeSuccess}>
              <Text style={styles.badgeTextSuccess}>Selesai</Text>
            </View>
          </View>
          <Text style={styles.statCount}>
            {stats.loading ? '—' : stats.completedReports}
          </Text>
          <Text style={styles.statLabel}>Laporan Selesai</Text>
          <Text style={styles.statDesc} numberOfLines={1}>
            Telah ditangani
          </Text>
        </PressableScale>
      </View>

      {/* ── 3. LIVE STATUS MONITOR ── */}
      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionIconWrap}>
              <Ionicons name="radio-outline" size={18} color="#173F70" />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Status Panic Button</Text>
              <Text style={styles.sectionSubtitle}>
                Pantau laporan darurat terbaru yang sedang berlangsung
              </Text>
            </View>
          </View>
          {stats.latestActiveReport ? (
            <View style={styles.liveBadgeActive}>
              <View style={styles.pulseDotRed} />
              <Text style={styles.liveBadgeActiveText}>Aktif</Text>
            </View>
          ) : (
            <View style={styles.liveBadgeNone}>
              <Text style={styles.liveBadgeNoneText}>Tidak Ada</Text>
            </View>
          )}
        </View>

        {stats.loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingText}>Memeriksa status laporan...</Text>
          </View>
        ) : stats.latestActiveReport ? (
          <TouchableOpacity
            style={styles.activeReportCard}
            onPress={() => navigation.navigate('HistoryTab')}
            activeOpacity={0.85}
          >
            <View style={styles.activeReportHead}>
              <View style={styles.activeReportHeadLeft}>
                <Ionicons name="alert-circle" size={18} color="#DC2626" />
                <Text style={styles.activeReportTitle}>
                  🚨 Laporan Darurat
                </Text>
              </View>
              <View
                style={[
                  styles.statusPill,
                  { backgroundColor: activeStatus?.badgeBg, borderColor: activeStatus?.borderColor },
                ]}
              >
                <Text style={[styles.statusPillText, { color: activeStatus?.color }]}>
                  {activeStatus?.label}
                </Text>
              </View>
            </View>

            <View style={styles.activeReportGrid}>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>Waktu Laporan</Text>
                <Text style={styles.gridValue}>
                  {formatReportDate(stats.latestActiveReport.created_at)}
                </Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>Kategori</Text>
                <Text style={[styles.gridValue, { textTransform: 'capitalize' }]}>
                  {stats.latestActiveReport.category || stats.latestActiveReport.emergency_type || 'Umum'}
                </Text>
              </View>
            </View>

            {stats.latestActiveReport.address ? (
              <View style={styles.locationBox}>
                <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.locationText} numberOfLines={2}>
                  {stats.latestActiveReport.address}
                </Text>
              </View>
            ) : null}

            <View style={styles.cardActionRow}>
              <Text style={styles.cardActionText}>Ketuk untuk pantau detail di riwayat</Text>
              <Ionicons name="chevron-forward" size={14} color="#173F70" />
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.emptyReportBox}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="shield-checkmark-outline" size={24} color="#10B981" />
            </View>
            <Text style={styles.emptyTitle}>Tidak Ada Laporan Aktif</Text>
            <Text style={styles.emptyDesc}>
              Saat ini lingkungan Anda dalam kondisi aman. Tekan tombol Panic jika sewaktu-waktu membutuhkan pertolongan.
            </Text>
          </View>
        )}
      </View>

      {/* ── 4. MONITOR PERANGKAT IOT ── */}
      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionIconWrap}>
              <Ionicons name="hardware-chip-outline" size={18} color="#173F70" />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Status Perangkat IoT</Text>
              <Text style={styles.sectionSubtitle}>
                Konektivitas tombol fisik di posko keamanan
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.deviceMonitorCard}>
          <View style={styles.deviceCardMain}>
            <View style={styles.deviceCardHead}>
              <Text style={styles.deviceCode}>
                {deviceInfo.hasDevice ? deviceInfo.deviceId : 'Belum Ditugaskan'}
              </Text>
              <View
                style={[
                  styles.devicePill,
                  deviceInfo.isActive
                    ? styles.devicePillActive
                    : deviceInfo.isOnline
                    ? styles.devicePillOnline
                    : styles.devicePillOffline,
                ]}
              >
                <View
                  style={[
                    styles.deviceDot,
                    deviceInfo.isActive
                      ? styles.deviceDotActive
                      : deviceInfo.isOnline
                      ? styles.deviceDotOnline
                      : styles.deviceDotOffline,
                  ]}
                />
                <Text
                  style={[
                    styles.devicePillText,
                    deviceInfo.isActive
                      ? styles.deviceTextActive
                      : deviceInfo.isOnline
                      ? styles.deviceTextOnline
                      : styles.deviceTextOffline,
                  ]}
                >
                  {deviceInfo.isActive
                    ? 'Sirine Aktif'
                    : deviceInfo.isOnline
                    ? 'Siaga / Online'
                    : deviceInfo.hasDevice
                    ? 'Offline'
                    : 'Belum Terhubung'}
                </Text>
              </View>
            </View>

            <Text style={styles.deviceSubtext}>
              {deviceInfo.hasDevice
                ? `Wilayah: ${deviceInfo.zone || (user?.assigned_zone && user.assigned_zone !== '-' ? user.assigned_zone : 'Belum Ditugaskan')}${
                    deviceInfo.lokasi ? ' • ' + deviceInfo.lokasi : ''
                  }`
                : 'Belum ada modul fisik yang dipasangkan ke akun ini'}
            </Text>
          </View>
        </View>
      </View>

      {/* ── 5. QUICK MENU (3 AKSES CEPAT) ── */}
      <View style={styles.quickMenuSection}>
        <Text style={styles.quickMenuTitle}>Menu Utama</Text>

        {/* 1. Panic Button Card */}
        <PressableScale
          style={[styles.quickCard, { borderLeftColor: '#DC2626' }]}
          onPress={() => navigation.navigate('PanicTab')}
          activeOpacity={0.88}
        >
          <View style={styles.quickCardTop}>
            <View style={[styles.quickIconWrap, { backgroundColor: 'rgba(220, 38, 38, 0.1)' }]}>
              <Ionicons name="warning" size={20} color="#DC2626" />
            </View>
            <View style={[styles.quickBadge, { backgroundColor: 'rgba(220, 38, 38, 0.1)' }]}>
              <Text style={[styles.quickBadgeText, { color: '#DC2626' }]}>Darurat</Text>
            </View>
          </View>
          <Text style={styles.quickCardTitle}>Panic Button</Text>
          <Text style={styles.quickCardDesc}>
            Kirim sinyal darurat instan ke posko keamanan dan pihak berwenang.
          </Text>
          <View style={styles.quickCardFoot}>
            <Text style={[styles.quickFootLink, { color: '#DC2626' }]}>Kirim Bantuan</Text>
            <Ionicons name="arrow-forward" size={14} color="#DC2626" />
          </View>
        </PressableScale>

        {/* 2. Riwayat Laporan Card */}
        <PressableScale
          style={[styles.quickCard, { borderLeftColor: '#173F70' }]}
          onPress={() => navigation.navigate('HistoryTab')}
          activeOpacity={0.88}
        >
          <View style={styles.quickCardTop}>
            <View style={[styles.quickIconWrap, { backgroundColor: 'rgba(23, 63, 112, 0.1)' }]}>
              <Ionicons name="time" size={20} color="#173F70" />
            </View>
            <View style={[styles.quickBadge, { backgroundColor: 'rgba(23, 63, 112, 0.1)' }]}>
              <Text style={[styles.quickBadgeText, { color: '#173F70' }]}>Log SOS</Text>
            </View>
          </View>
          <Text style={styles.quickCardTitle}>Riwayat Laporan</Text>
          <Text style={styles.quickCardDesc}>
            Pantau rekaman laporan, status respon petugas, serta catatan riwayat.
          </Text>
          <View style={styles.quickCardFoot}>
            <Text style={[styles.quickFootLink, { color: '#173F70' }]}>Lihat Riwayat</Text>
            <Ionicons name="arrow-forward" size={14} color="#173F70" />
          </View>
        </PressableScale>

        {/* 3. Profil Pengguna Card */}
        <PressableScale
          style={[styles.quickCard, { borderLeftColor: '#0284C7' }]}
          onPress={() => navigation.navigate('ProfileTab')}
          activeOpacity={0.88}
        >
          <View style={styles.quickCardTop}>
            <View style={[styles.quickIconWrap, { backgroundColor: 'rgba(2, 132, 199, 0.1)' }]}>
              <Ionicons name="person" size={20} color="#0284C7" />
            </View>
            <View style={[styles.quickBadge, { backgroundColor: 'rgba(2, 132, 199, 0.1)' }]}>
              <Text style={[styles.quickBadgeText, { color: '#0284C7' }]}>Akun</Text>
            </View>
          </View>
          <Text style={styles.quickCardTitle}>Profil Pengguna</Text>
          <Text style={styles.quickCardDesc}>
            Kelola data identitas, informasi rumah, dan kontak darurat Anda.
          </Text>
          <View style={styles.quickCardFoot}>
            <Text style={[styles.quickFootLink, { color: '#0284C7' }]}>Kelola Profil</Text>
            <Ionicons name="arrow-forward" size={14} color="#0284C7" />
          </View>
        </PressableScale>
      </View>
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
    paddingBottom: spacing.xxl,
  },

  // 1. Hero Card
  heroCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: spacing.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
    position: 'relative',
    ...shadows.sm,
  },
  headerAccentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#173F70',
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  systemBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    gap: 6,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
  },
  systemBadgeText: {
    fontSize: text.xxs,
    fontWeight: text.semibold,
    color: '#059669',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(23, 63, 112, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    gap: 4,
  },
  roleBadgeText: {
    fontSize: text.xxs,
    fontWeight: text.semibold,
    color: '#173F70',
  },
  heroGreeting: {
    fontSize: text.lg,
    fontWeight: text.bold,
    color: '#1E293B',
    marginBottom: 4,
  },
  heroSubtext: {
    fontSize: text.xs,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  btnPanicHero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    borderRadius: radius.md,
    gap: 6,
    ...shadows.red,
  },
  btnPanicHeroText: {
    color: colors.white,
    fontSize: text.sm,
    fontWeight: text.bold,
  },

  // 2. Stats Section
  statsSection: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: spacing.sm,
    ...shadows.sm,
  },
  statCardActive: {
    borderTopWidth: 3,
    borderTopColor: '#DC2626',
  },
  statCardTotal: {
    borderTopWidth: 3,
    borderTopColor: '#173F70',
  },
  statCardCompleted: {
    borderTopWidth: 3,
    borderTopColor: '#10B981',
  },
  statHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  statIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIconActive: {
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
  },
  statIconTotal: {
    backgroundColor: 'rgba(23, 63, 112, 0.1)',
  },
  statIconCompleted: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  badgePulseRed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  pulseDotRed: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#DC2626',
  },
  badgeTextRed: {
    fontSize: 9,
    fontWeight: text.bold,
    color: '#DC2626',
  },
  badgeNeutral: {
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  badgeTextNeutral: {
    fontSize: 9,
    fontWeight: text.semibold,
    color: '#64748B',
  },
  badgeSuccess: {
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  badgeTextSuccess: {
    fontSize: 9,
    fontWeight: text.bold,
    color: '#10B981',
  },
  statCount: {
    fontSize: text.xl,
    fontWeight: text.bold,
    color: '#1E293B',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: text.semibold,
    color: '#1E293B',
  },
  statDesc: {
    fontSize: 9,
    color: '#94A3B8',
  },

  // 3. Section Blocks
  sectionBlock: {
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
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  sectionIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(23, 63, 112, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
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
  liveBadgeActive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    gap: 4,
  },
  liveBadgeActiveText: {
    fontSize: text.xxs,
    fontWeight: text.bold,
    color: '#DC2626',
  },
  liveBadgeNone: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  liveBadgeNoneText: {
    fontSize: text.xxs,
    fontWeight: text.medium,
    color: '#64748B',
  },

  // Active Report
  activeReportCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  activeReportHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  activeReportHeadLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeReportTitle: {
    fontSize: text.sm,
    fontWeight: text.bold,
    color: '#991B1B',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: text.bold,
  },
  activeReportGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: 8,
  },
  gridItem: {
    flex: 1,
  },
  gridLabel: {
    fontSize: 10,
    color: '#64748B',
  },
  gridValue: {
    fontSize: 11,
    fontWeight: text.semibold,
    color: '#1E293B',
  },
  locationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    padding: 6,
    borderRadius: radius.xs,
    marginBottom: 8,
  },
  locationText: {
    fontSize: 10,
    color: '#475569',
    flex: 1,
  },
  cardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#FECACA',
  },
  cardActionText: {
    fontSize: 10,
    fontWeight: text.semibold,
    color: '#173F70',
  },

  // Empty Report
  emptyReportBox: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  emptyIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: text.sm,
    fontWeight: text.semibold,
    color: '#1E293B',
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 16,
  },
  loadingBox: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: text.xs,
    color: '#64748B',
  },

  // Device Monitor Card
  deviceMonitorCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: spacing.sm,
  },
  deviceCardMain: {
    gap: 4,
  },
  deviceCardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deviceCode: {
    fontSize: text.sm,
    fontWeight: text.bold,
    color: '#1E293B',
  },
  devicePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    gap: 4,
    borderWidth: 1,
  },
  devicePillOnline: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  devicePillActive: {
    backgroundColor: 'rgba(220, 38, 38, 0.12)',
    borderColor: 'rgba(220, 38, 38, 0.3)',
  },
  devicePillOffline: {
    backgroundColor: 'rgba(100, 116, 139, 0.12)',
    borderColor: 'rgba(100, 116, 139, 0.25)',
  },
  deviceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  deviceDotOnline: { backgroundColor: '#10B981' },
  deviceDotActive: { backgroundColor: '#DC2626' },
  deviceDotOffline: { backgroundColor: '#64748B' },
  devicePillText: {
    fontSize: 10,
    fontWeight: text.semibold,
  },
  deviceTextOnline: { color: '#059669' },
  deviceTextActive: { color: '#DC2626' },
  deviceTextOffline: { color: '#475569' },
  deviceSubtext: {
    fontSize: 10,
    color: '#64748B',
  },

  // Quick Menu
  quickMenuSection: {
    gap: spacing.sm,
  },
  quickMenuTitle: {
    fontSize: text.sm,
    fontWeight: text.bold,
    color: '#1E293B',
    marginBottom: 4,
  },
  quickCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 4,
    padding: spacing.md,
    ...shadows.sm,
  },
  quickCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  quickIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  quickBadgeText: {
    fontSize: 10,
    fontWeight: text.bold,
  },
  quickCardTitle: {
    fontSize: text.sm,
    fontWeight: text.bold,
    color: '#1E293B',
    marginBottom: 2,
  },
  quickCardDesc: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 8,
  },
  quickCardFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  quickFootLink: {
    fontSize: 11,
    fontWeight: text.semibold,
  },
});

