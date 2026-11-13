import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Platform,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { listenToUserPanics, getStatusInfo, getCategoryInfo } from '../services/panicService';
import { colors, spacing, radius, text, shadows } from '../theme';
import PressableScale from '../components/PressableScale';

const FILTERS = [
  { key: 'Semua',    label: 'Semua',    iconName: 'layers-outline' },
  { key: 'Aktif',    label: 'Aktif',    iconName: 'radio-button-on' },
  { key: 'Menunggu', label: 'Menunggu', iconName: 'time-outline' },
  { key: 'Diproses', label: 'Diproses', iconName: 'sync-outline' },
  { key: 'Selesai',  label: 'Selesai',  iconName: 'checkmark-circle-outline' },
];

export default function HistoryScreen() {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [activeFilter, setActiveFilter] = useState('Semua');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Subscribe to realtime reports for current authenticated user
  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    const unsub = listenToUserPanics(user.id, (data) => {
      setReports(data || []);
      setLoading(false);
      setRefreshing(false);
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [user?.id]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  }, []);

  // Compute stats and filter counts migrated from Dashboard
  const { stats, filterCounts, filteredReports } = useMemo(() => {
    let total = reports.length;
    let aktifCount = 0;
    let menungguCount = 0;
    let diprosesCount = 0;
    let selesaiCount = 0;

    reports.forEach((r) => {
      const s = (r.status || '').toLowerCase().trim();
      const statusInfo = getStatusInfo(r.status);
      const label = statusInfo.label.toLowerCase();

      if (label === 'aktif' || s === 'active' || s === 'aktif') aktifCount++;
      if (label === 'menunggu' || s === 'menunggu' || s === 'pending') menungguCount++;
      if (label === 'diproses' || s === 'diproses' || s === 'in_progress' || s === 'process') diprosesCount++;
      if (label === 'selesai' || s === 'selesai' || s === 'resolved' || s === 'done' || s === 'completed') selesaiCount++;
    });

    const activeTotal = aktifCount + menungguCount + diprosesCount;

    const counts = {
      Semua: total,
      Aktif: aktifCount,
      Menunggu: menungguCount,
      Diproses: diprosesCount,
      Selesai: selesaiCount,
    };

    let filtered = reports;
    if (activeFilter !== 'Semua') {
      filtered = reports.filter((r) => {
        const info = getStatusInfo(r.status);
        return info.label.toLowerCase() === activeFilter.toLowerCase();
      });
    }

    return {
      stats: {
        total,
        active: activeTotal,
        completed: selesaiCount,
      },
      filterCounts: counts,
      filteredReports: filtered,
    };
  }, [reports, activeFilter]);

  function fmtDate(ts) {
    if (!ts) return '—';
    try {
      return new Date(ts).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return String(ts);
    }
  }

  function openMaps(lat, lon) {
    if (!lat || !lon) return;
    const url = Platform.select({
      ios: `maps:0,0?q=${lat},${lon}`,
      android: `geo:0,0?q=${lat},${lon}`,
      default: `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`,
    });
    Linking.openURL(url).catch(() =>
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lon}`)
    );
  }

  function StatusBadge({ status }) {
    const info = getStatusInfo(status);
    return (
      <View style={[styles.badge, { backgroundColor: info.bg, borderColor: info.borderColor }]}>
        <Ionicons name={info.iconName} size={11} color={info.color} style={{ marginRight: 4 }} />
        <Text style={[styles.badgeText, { color: info.color }]}>{info.label}</Text>
      </View>
    );
  }

  function CategoryBadge({ category }) {
    const cat = getCategoryInfo(category);
    return (
      <View style={[styles.catBadge, { backgroundColor: cat.bg, borderColor: cat.border }]}>
        <Ionicons name={cat.iconName} size={11} color={cat.color} style={{ marginRight: 4 }} />
        <Text style={[styles.catBadgeText, { color: cat.color }]}>{cat.label}</Text>
      </View>
    );
  }

  function ReportCard({ item }) {
    return (
      <View style={styles.card}>
        {/* Header row */}
        <View style={styles.cardHead}>
          <View style={styles.cardHeadLeft}>
            <CategoryBadge category={item.category || item.emergency_type} />
            <View style={styles.dateRow}>
              <Ionicons name="time-outline" size={12} color={colors.textMuted} />
              <Text style={styles.dateText}>{fmtDate(item.created_at)}</Text>
            </View>
          </View>
          <StatusBadge status={item.status} />
        </View>

        <View style={styles.cardDivider} />

        {/* Location Row */}
        <View style={styles.locRow}>
          <View style={styles.locIconWrap}>
            <Ionicons name="location" size={16} color={colors.brandNavy} />
          </View>
          <View style={styles.locText}>
            <Text style={styles.locLabel}>Lokasi Kejadian</Text>
            <Text style={styles.locValue} numberOfLines={2}>
              {item.address || `${item.latitude?.toFixed(5)}, ${item.longitude?.toFixed(5)}`}
            </Text>
          </View>
        </View>

        {/* Metadata Device & Zone */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="hardware-chip-outline" size={13} color={colors.textMuted} />
            <View style={{ marginLeft: 6 }}>
              <Text style={styles.metaLabel}>Perangkat</Text>
              <Text style={styles.metaValue}>{item.assigned_device || item.device_id || 'PB001'}</Text>
            </View>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaItem}>
            <Ionicons name="map-outline" size={13} color={colors.textMuted} />
            <View style={{ marginLeft: 6 }}>
              <Text style={styles.metaLabel}>Zona</Text>
              <Text style={styles.metaValue}>Zona {item.assigned_zone || 'TESTER'}</Text>
            </View>
          </View>
        </View>

        {/* Action Button: Google Maps */}
        <TouchableOpacity
          style={styles.mapBtn}
          onPress={() => openMaps(item.latitude, item.longitude)}
          activeOpacity={0.8}
        >
          <Ionicons name="navigate-outline" size={14} color={colors.info} />
          <Text style={styles.mapBtnText}>Buka Titik Lokasi di Maps</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.info} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* ── 1. HEADER & SUMMARY METRICS BANNER (Migrated from Dashboard) ── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Riwayat Laporan</Text>
            <Text style={styles.headerSub}>Rekam jejak sinyal darurat & respons posko</Text>
          </View>
          {stats.active > 0 && (
            <View style={styles.headerActiveBadge}>
              <View style={styles.headerActiveDot} />
              <Text style={styles.headerActiveText}>{stats.active} Aktif</Text>
            </View>
          )}
        </View>

        {/* Summary Metric Cards Banner */}
        <View style={styles.statsBanner}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total Laporan</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>{stats.active}</Text>
            <Text style={styles.statLabel}>Dalam Proses</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: colors.success }]}>{stats.completed}</Text>
            <Text style={styles.statLabel}>Terselesaikan</Text>
          </View>
        </View>

        {/* Horizontal Status Filter Chips */}
        <FlatList
          data={FILTERS}
          keyExtractor={(f) => f.key}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          renderItem={({ item: f }) => {
            const isActive = activeFilter === f.key;
            const count = filterCounts[f.key] ?? 0;
            return (
              <PressableScale
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => setActiveFilter(f.key)}
                activeOpacity={0.8}
                scaleTo={0.96}
              >
                <Ionicons
                  name={f.iconName}
                  size={13}
                  color={isActive ? colors.brandNavy : colors.textMuted}
                />
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                  {f.label}
                </Text>
                <View style={[styles.countBadge, isActive && styles.countBadgeActive]}>
                  <Text style={[styles.countBadgeText, isActive && styles.countBadgeTextActive]}>
                    {count}
                  </Text>
                </View>
              </PressableScale>
            );
          }}
        />
      </View>

      {/* ── 2. INCIDENT LOG LIST ── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.centerText}>Memuat riwayat laporan...</Text>
        </View>
      ) : filteredReports.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIconBox}>
            <Ionicons name="document-text-outline" size={40} color={colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>Tidak Ada Laporan</Text>
          <Text style={styles.emptySub}>
            {activeFilter === 'Semua'
              ? 'Belum ada riwayat laporan darurat yang tercatat pada akun ini.'
              : `Tidak ada laporan darurat dengan status "${activeFilter}".`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredReports}
          keyExtractor={(item) => item.id || String(item.created_at)}
          renderItem={({ item }) => <ReportCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  // Header & Summary
  header: {
    backgroundColor: colors.bgSurface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingBottom: 4,
    ...shadows.sm,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: text.lg,
    fontWeight: text.bold,
    color: colors.brandNavy,
  },
  headerSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  headerActiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  headerActiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginRight: 6,
  },
  headerActiveText: {
    fontSize: 11,
    fontWeight: text.bold,
    color: colors.primary,
  },

  // Stats Banner (Migrated from Dashboard)
  statsBanner: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: text.bold,
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
    fontWeight: text.medium,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },

  // Filter Chips
  filterList: {
    paddingBottom: 8,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  chipText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: text.medium,
  },
  chipTextActive: {
    color: colors.brandNavy,
    fontWeight: text.bold,
  },
  countBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
  },
  countBadgeActive: {
    backgroundColor: '#DBEAFE',
  },
  countBadgeText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: text.bold,
  },
  countBadgeTextActive: {
    color: colors.brandNavy,
  },

  // Incident List
  list: {
    padding: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 120 : 100,
  },

  // Incident Card
  card: {
    backgroundColor: colors.bgSurface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.sm,
  },
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    paddingBottom: 8,
  },
  cardHeadLeft: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
  },
  catBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  catBadgeText: {
    fontSize: 10,
    fontWeight: text.bold,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: text.bold,
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 12,
  },

  // Location Row
  locRow: {
    flexDirection: 'row',
    padding: 12,
    paddingBottom: 8,
    gap: 8,
  },
  locIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  locText: { flex: 1 },
  locLabel: {
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: text.semibold,
    marginBottom: 2,
  },
  locValue: {
    fontSize: 12,
    color: colors.textPrimary,
    lineHeight: 17,
  },

  // Meta Row
  metaRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: radius.sm,
    padding: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  metaItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  metaDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: 8,
    alignSelf: 'stretch',
  },
  metaLabel: {
    fontSize: 10,
    color: colors.textMuted,
  },
  metaValue: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: text.semibold,
    marginTop: 1,
  },

  // Map Button
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  mapBtnText: {
    flex: 1,
    fontSize: 11,
    color: colors.brandBlue,
    fontWeight: text.semibold,
  },

  // Empty / Loading State
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  centerText: {
    color: colors.textSecondary,
    fontSize: text.sm,
    marginTop: spacing.md,
  },
  emptyIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: text.base,
    fontWeight: text.bold,
    color: colors.textPrimary,
  },
  emptySub: {
    fontSize: text.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    maxWidth: 280,
  },
});
