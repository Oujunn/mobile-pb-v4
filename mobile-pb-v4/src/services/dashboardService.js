/*
|--------------------------------------------------------------------------
| Dashboard Service — Mobile Panic Button
|--------------------------------------------------------------------------
| Realtime statistics, reports, and IoT device monitor synchronized
| with the Web Panic Button dashboard implementation (public/js/users/dashboard.js).
*/

import { ref, onValue } from 'firebase/database';
import { db2 } from '../config/firebase.js';

/**
 * Format status string to display label and semantic style
 * Matches formatStatus in public/js/users/dashboard.js
 */
export function formatReportStatus(rawStatus) {
  const status = String(rawStatus || '').toLowerCase().trim();

  const map = {
    active: {
      label: 'Panic Aktif',
      type: 'danger',
      color: '#DC2626',
      badgeBg: 'rgba(220, 38, 38, 0.12)',
      borderColor: 'rgba(220, 38, 38, 0.3)',
      icon: 'alert-circle',
    },
    menunggu: {
      label: 'Menunggu',
      type: 'warning',
      color: '#D97706',
      badgeBg: 'rgba(217, 119, 6, 0.12)',
      borderColor: 'rgba(217, 119, 6, 0.3)',
      icon: 'time-outline',
    },
    received: {
      label: 'Laporan Diterima',
      type: 'info',
      color: '#2563EB',
      badgeBg: 'rgba(37, 99, 235, 0.12)',
      borderColor: 'rgba(37, 99, 235, 0.3)',
      icon: 'mail-unread-outline',
    },
    diproses: {
      label: 'Sedang Diproses',
      type: 'info',
      color: '#2563EB',
      badgeBg: 'rgba(37, 99, 235, 0.12)',
      borderColor: 'rgba(37, 99, 235, 0.3)',
      icon: 'sync-outline',
    },
    handling: {
      label: 'Sedang Ditangani',
      type: 'info',
      color: '#2563EB',
      badgeBg: 'rgba(37, 99, 235, 0.12)',
      borderColor: 'rgba(37, 99, 235, 0.3)',
      icon: 'shield-outline',
    },
    dispatched: {
      label: 'Petugas Menuju Lokasi',
      type: 'primary',
      color: '#173F70',
      badgeBg: 'rgba(23, 63, 112, 0.12)',
      borderColor: 'rgba(23, 63, 112, 0.3)',
      icon: 'navigate-outline',
    },
    completed: {
      label: 'Selesai',
      type: 'success',
      color: '#10B981',
      badgeBg: 'rgba(16, 185, 129, 0.12)',
      borderColor: 'rgba(16, 185, 129, 0.3)',
      icon: 'checkmark-circle-outline',
    },
    selesai: {
      label: 'Selesai',
      type: 'success',
      color: '#10B981',
      badgeBg: 'rgba(16, 185, 129, 0.12)',
      borderColor: 'rgba(16, 185, 129, 0.3)',
      icon: 'checkmark-circle-outline',
    },
    done: {
      label: 'Selesai',
      type: 'success',
      color: '#10B981',
      badgeBg: 'rgba(16, 185, 129, 0.12)',
      borderColor: 'rgba(16, 185, 129, 0.3)',
      icon: 'checkmark-circle-outline',
    },
  };

  return (
    map[status] || {
      label: rawStatus ? String(rawStatus) : 'Tidak Diketahui',
      type: 'default',
      color: '#64748B',
      badgeBg: 'rgba(100, 116, 139, 0.12)',
      borderColor: 'rgba(100, 116, 139, 0.25)',
      icon: 'help-circle-outline',
    }
  );
}

/**
 * Format timestamp into Indonesian human readable date
 */
export function formatReportDate(ts) {
  if (!ts) return '—';
  try {
    const d = new Date(Number(ts));
    if (isNaN(d.getTime())) return String(ts);
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(ts);
  }
}

/**
 * Listen to real-time reports and calculate the 3 statistics cards.
 * 100% synchronized with loadUserReports() in public/js/users/dashboard.js
 */
export function listenToDashboardStats(userId, callback) {
  if (!userId || typeof callback !== 'function') {
    if (typeof callback === 'function') {
      callback({
        totalReports: 0,
        activeReports: 0,
        completedReports: 0,
        latestActiveReport: null,
        recentReports: [],
        loading: false,
      });
    }
    return () => {};
  }

  const reportsRef = ref(db2, 'public_panics');

  const unsubscribe = onValue(
    reportsRef,
    (snapshot) => {
      const data = snapshot.val() || {};
      const userReports = [];

      for (const [id, report] of Object.entries(data)) {
        if (!report || typeof report !== 'object') continue;
        const reportUserId = report.user_id != null ? String(report.user_id) : '';
        if (reportUserId === String(userId)) {
          userReports.push({ id, ...report });
        }
      }

      // Sort newest first by created_at (matches web)
      userReports.sort((a, b) => (Number(b.created_at) || 0) - (Number(a.created_at) || 0));

      const totalReports = userReports.length;

      const completedReports = userReports.filter((report) => {
        const s = (report.status || '').toLowerCase().trim();
        return s === 'completed' || s === 'selesai' || s === 'done';
      }).length;

      // Active = Total - Completed (exact web formula)
      const activeReports = totalReports - completedReports;

      // Find latest active report (if any)
      const latestActiveReport =
        userReports.find((report) => {
          const s = (report.status || '').toLowerCase().trim();
          return s !== 'completed' && s !== 'selesai' && s !== 'done';
        }) || null;

      const recentReports = userReports.slice(0, 3);

      callback({
        totalReports,
        activeReports,
        completedReports,
        latestActiveReport,
        recentReports,
        userReports,
        loading: false,
        error: null,
      });
    },
    (error) => {
      console.warn('[listenToDashboardStats] onValue error:', error);
      callback({
        totalReports: 0,
        activeReports: 0,
        completedReports: 0,
        latestActiveReport: null,
        recentReports: [],
        loading: false,
        error: error?.message || 'Gagal memuat statistik',
      });
    }
  );

  return () => {
    if (typeof unsubscribe === 'function') {
      unsubscribe();
    }
  };
}

/**
 * Listen to real-time IoT Device Status from Firebase DB2.
 * Reads actual hardware connectivity from panicChannels.
 * Returns clean information without triggering intrusive alerts on dashboard.
 */
export function listenToIoTDeviceStatus(userId, callback) {
  if (!userId || typeof callback !== 'function') {
    if (typeof callback === 'function') {
      callback({
        hasDevice: false,
        deviceId: null,
        zone: null,
        lokasi: null,
        statusType: 'no_device',
        statusLabel: 'Belum Ada Perangkat',
        statusSub: 'Belum ada modul fisik yang dipasangkan ke akun ini',
        isOnline: false,
        isActive: false,
        loading: false,
      });
    }
    return () => {};
  }

  const userRef = ref(db2, `users/${userId}`);
  const channelsRef = ref(db2, 'panicChannels');

  let channelsUnsub = null;
  let currentDeviceId = null;

  const userUnsub = onValue(
    userRef,
    (userSnapshot) => {
      if (!userSnapshot.exists()) {
        callback({
          hasDevice: false,
          deviceId: null,
          zone: null,
          lokasi: null,
          statusType: 'no_device',
          statusLabel: 'User Tidak Ditemukan',
          statusSub: 'Data akun tidak tersedia di database posko',
          isOnline: false,
          isActive: false,
          loading: false,
        });
        return;
      }

      const userData = userSnapshot.val();

      // Strictly assigned_device only
      const rawDevice = userData.assigned_device;
      const cleanDevice =
        rawDevice &&
        rawDevice !== '-' &&
        rawDevice !== 'null' &&
        rawDevice !== 'undefined' &&
        rawDevice !== 'NONE'
          ? String(rawDevice).trim()
          : '';

      // Strictly assigned_zone only (no 'zone' or 'zona' fallback, no 'Umum / Warga Baru')
      const rawZone = userData.assigned_zone;
      const cleanZone =
        rawZone &&
        rawZone !== '-' &&
        rawZone !== 'null' &&
        rawZone !== 'undefined' &&
        rawZone !== 'NONE'
          ? String(rawZone).trim()
          : '';

      if (!cleanDevice) {
        if (channelsUnsub) {
          channelsUnsub();
          channelsUnsub = null;
        }
        callback({
          hasDevice: false,
          deviceId: null,
          zone: cleanZone || null,
          lokasi: null,
          statusType: 'no_device',
          statusLabel: 'Belum Ditugaskan',
          statusSub: 'Belum ada modul fisik yang dipasangkan ke akun ini',
          isOnline: false,
          isActive: false,
          loading: false,
        });
        return;
      }

      currentDeviceId = cleanDevice;

      // Listen to channels for actual online/active status
      if (channelsUnsub) channelsUnsub();

      channelsUnsub = onValue(
        channelsRef,
        (channelsSnapshot) => {
          const channelsData = channelsSnapshot.val() || {};
          let foundDevice = null;
          let foundZone = cleanZone || null;
          let foundKey = null;

          for (const [zoneName, zoneData] of Object.entries(channelsData)) {
            if (!zoneData || typeof zoneData !== 'object') continue;
            for (const [devKey, devData] of Object.entries(zoneData)) {
              if (!devData || typeof devData !== 'object') continue;
              if (devData.device === currentDeviceId || devKey === currentDeviceId) {
                foundDevice = devData;
                foundZone = zoneName;
                foundKey = devKey;
                break;
              }
            }
            if (foundDevice) break;
          }

          if (!foundDevice) {
            callback({
              hasDevice: true,
              deviceId: currentDeviceId,
              zone: foundZone,
              lokasi: null,
              statusType: 'not_found',
              statusLabel: `Perangkat ${currentDeviceId}`,
              statusSub: 'Perangkat belum terdata di saluran posko',
              isOnline: false,
              isActive: false,
              loading: false,
            });
            return;
          }

          const isOffline = foundDevice.online === false;
          const isActive = foundDevice.active === true;
          const isOnline = !isOffline;

          let statusType = 'ready';
          let statusLabel = `IoT Siaga: ${currentDeviceId}`;
          let statusSub = `${foundDevice.lokasi || 'Posko'} • Zona ${foundZone || cleanZone || 'Belum Ditugaskan'}`;

          if (isActive) {
            statusType = 'active';
            statusLabel = `Sirine Aktif: ${currentDeviceId}`;
            statusSub = 'Alarm darurat fisik sedang berbunyi';
          } else if (isOffline) {
            statusType = 'offline';
            statusLabel = `IoT Offline: ${currentDeviceId}`;
            statusSub = 'Perangkat keras tidak terhubung ke jaringan';
          }

          callback({
            hasDevice: true,
            deviceId: currentDeviceId,
            deviceData: foundDevice,
            zone: foundZone,
            deviceKey: foundKey,
            lokasi: foundDevice.lokasi || '-',
            statusType,
            statusLabel,
            statusSub,
            isOnline,
            isActive,
            loading: false,
          });
        },
        (chanError) => {
          console.warn('[listenToIoTDeviceStatus] channels error:', chanError);
        }
      );
    },
    (userError) => {
      console.warn('[listenToIoTDeviceStatus] user error:', userError);
      callback({
        hasDevice: false,
        deviceId: null,
        statusType: 'error',
        statusLabel: 'Koneksi Terputus',
        statusSub: 'Gagal memuat status perangkat',
        isOnline: false,
        isActive: false,
        loading: false,
      });
    }
  );

  return () => {
    if (typeof userUnsub === 'function') userUnsub();
    if (typeof channelsUnsub === 'function') channelsUnsub();
  };
}
