/*
|--------------------------------------------------------------------------
| Panic Button Service
|--------------------------------------------------------------------------
| Core service that creates panic events in Firebase RTDB db2.
| Mirrors the exact flow from public/js/users/panic-button.js
|
| Flow:
| 1. Read user data from /users/{userId}
| 2. Get device from /panicChannels
| 3. Get GPS location
| 4. Create report at /public_panics
| 5. Activate device at /panicChannels/{zone}/{deviceKey}
| 6. Schedule auto-off (15s)
*/

import {
  ref,
  get,
  push,
  update,
  onValue,
  off,
} from 'firebase/database';
import { db2 } from '../config/firebase';

const PANIC_DURATION = 15 * 1000;

const STATUS = {
  ACTIVE: 'active',
  MENUNGGU: 'menunggu',
  DIPROSES: 'diproses',
  SELESAI: 'completed',
};

function normalizeStatus(status = '') {
  const value = String(status).toLowerCase().trim();
  const statusMap = {
    active: STATUS.ACTIVE,
    menunggu: STATUS.MENUNGGU,
    waiting: STATUS.MENUNGGU,
    pending: STATUS.MENUNGGU,
    diproses: STATUS.DIPROSES,
    proses: STATUS.DIPROSES,
    processing: STATUS.DIPROSES,
    process: STATUS.DIPROSES,
    selesai: STATUS.SELESAI,
    completed: STATUS.SELESAI,
    complete: STATUS.SELESAI,
    done: STATUS.SELESAI,
  };
  return statusMap[value] || value;
}

/*
|--------------------------------------------------------------------------
| Incident Categories Configuration (4 Kategori Resmi Web V3)
|--------------------------------------------------------------------------
*/
export const PANIC_CATEGORIES = {
  UMUM: 'umum',
  MEDIS: 'medis',
  KEBAKARAN: 'kebakaran',
  KEJAHATAN: 'kejahatan',
};

export const CATEGORY_CONFIG = {
  umum: {
    id: 'umum',
    label: 'Umum',
    iconName: 'alert-circle',
    color: '#2563EB',
    bg: '#EFF6FF',
    border: '#BFDBFE',
    description: 'Bencana alam, banjir, gempa bumi, tanah longsor, pohon tumbang, evakuasi, gangguan ketertiban umum, atau kondisi darurat lainnya.',
  },
  medis: {
    id: 'medis',
    label: 'Medis',
    iconName: 'medkit',
    color: '#10B981',
    bg: '#ECFDF5',
    border: '#A7F3D0',
    description: 'Kedaruratan medis, kecelakaan berat, henti jantung/napas, korban tidak sadarkan diri, butuh ambulans darurat.',
  },
  kebakaran: {
    id: 'kebakaran',
    label: 'Kebakaran',
    iconName: 'flame',
    color: '#F97316',
    bg: '#FFF7ED',
    border: '#FFEDD5',
    description: 'Kebakaran pemukiman/gedung, ledakan tabung gas LPG, kebakaran lahan, korsleting listrik berisiko kobaran api.',
  },
  kejahatan: {
    id: 'kejahatan',
    label: 'Kejahatan',
    iconName: 'shield',
    color: '#DC2626',
    bg: '#FEF2F2',
    border: '#FECACA',
    description: 'Perampokan, pencurian, pembegalan, ancaman kekerasan fisik, penyerangan, atau tindak kriminal aktif.',
  },
};

export function getCategoryInfo(cat = '') {
  const key = String(cat).toLowerCase().trim();
  return (
    CATEGORY_CONFIG[key] || {
      id: key || 'umum',
      label: key ? key.charAt(0).toUpperCase() + key.slice(1) : 'Umum',
      iconName: 'alert-circle-outline',
      color: '#2563EB',
      bg: '#EFF6FF',
      border: '#BFDBFE',
      description: 'Laporan darurat publik via aplikasi mobile.',
    }
  );
}
export async function getUserFromDB2(userId) {
  const userRef = ref(db2, `users/${userId}`);
  const snapshot = await get(userRef);

  if (!snapshot.exists()) {
    throw new Error('User tidak ditemukan di database.');
  }

  const userData = snapshot.val();
  const deviceId =
    userData.assigned_device ||
    userData.device_id ||
    userData.deviceId;

  return { userData, deviceId };
}

/*
|--------------------------------------------------------------------------
| Check if user has a registered device (1:1 with Web checkUserHasDevice)
|--------------------------------------------------------------------------
*/
export async function checkUserHasDevice(userId) {
  try {
    if (!userId) return false;
    const userRef = ref(db2, `users/${userId}`);
    const snapshot = await get(userRef);

    if (!snapshot.exists()) return false;

    const userData = snapshot.val();
    const deviceId =
      userData.assigned_device ||
      userData.device_id ||
      userData.deviceId;

    if (
      !deviceId ||
      deviceId === '' ||
      deviceId === 'null' ||
      deviceId === '-' ||
      deviceId === 'NONE' ||
      deviceId === 'undefined'
    ) {
      return false;
    }

    try {
      const deviceInfo = await getDeviceFromDB2(deviceId);
      return Boolean(deviceInfo && deviceInfo.device);
    } catch {
      return false;
    }
  } catch {
    return false;
  }
}

/*
|--------------------------------------------------------------------------
| Realtime listener for User IoT Device Status
|--------------------------------------------------------------------------
| Mirrors the realtime monitoring of panicChannels used in web IoT.js
*/
export function listenToUserDevice(userId, callback) {
  if (!userId) {
    callback({
      hasDevice: false,
      deviceId: null,
      deviceData: null,
      statusType: 'no_user',
      statusLabel: 'Belum Terhubung IoT',
      statusSub: 'Masuk dengan akun warga yang telah terdaftar',
      canPanic: false,
    });
    return () => {};
  }

  const userRef = ref(db2, `users/${userId}`);
  const channelsRef = ref(db2, 'panicChannels');

  let currentDeviceId = null;
  let channelsUnsub = null;

  const userUnsub = onValue(userRef, (userSnapshot) => {
    if (!userSnapshot.exists()) {
      callback({
        hasDevice: false,
        deviceId: null,
        deviceData: null,
        statusType: 'no_device',
        statusLabel: 'User Tidak Ditemukan',
        statusSub: 'Data akun tidak tersedia di database posko',
        canPanic: false,
      });
      return;
    }

    const userData = userSnapshot.val();
    const deviceId =
      userData.assigned_device ||
      userData.device_id ||
      userData.deviceId;

    if (!deviceId || deviceId === '' || deviceId === 'null' || deviceId === '-') {
      callback({
        hasDevice: false,
        deviceId: null,
        deviceData: null,
        statusType: 'no_device',
        statusLabel: 'Belum Ada Perangkat',
        statusSub: 'Hubungi Administrator untuk pairing perangkat IoT Anda',
        canPanic: false,
      });
      return;
    }

    currentDeviceId = deviceId;

    // Listen to channels
    if (channelsUnsub) channelsUnsub();

    channelsUnsub = onValue(channelsRef, (channelsSnapshot) => {
      const channelsData = channelsSnapshot.val() || {};
      let foundDevice = null;
      let foundZone = null;
      let foundKey = null;

      for (const [zoneName, zoneData] of Object.entries(channelsData)) {
        if (!zoneData || typeof zoneData !== 'object') continue;
        for (const [deviceKey, deviceData] of Object.entries(zoneData)) {
          if (!deviceData || typeof deviceData !== 'object') continue;
          if (deviceData.device === currentDeviceId || deviceKey === currentDeviceId) {
            foundDevice = deviceData;
            foundZone = zoneName;
            foundKey = deviceKey;
            break;
          }
        }
        if (foundDevice) break;
      }

      if (!foundDevice) {
        callback({
          hasDevice: true,
          deviceId: currentDeviceId,
          deviceData: null,
          statusType: 'not_found',
          statusLabel: `Perangkat ${currentDeviceId} Belum Terdata`,
          statusSub: 'Perangkat tidak terdaftar di saluran posko',
          canPanic: false,
        });
        return;
      }

      const isOffline = foundDevice.online === false;
      const isActive = foundDevice.active === true;

      let statusType = 'ready';
      let statusLabel = `IoT Siaga: ${currentDeviceId}`;
      let statusSub = `${foundDevice.lokasi || 'Posko'} • Zona ${foundZone}`;

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
        canPanic: !isOffline,
      });
    });
  });

  return () => {
    if (typeof userUnsub === 'function') userUnsub();
    if (typeof channelsUnsub === 'function') channelsUnsub();
  };
}

/*
|--------------------------------------------------------------------------
| Reset stale panic device
|--------------------------------------------------------------------------
*/
async function resetStalePanicDevice(deviceRef, deviceData, deviceId) {
  const panicId = deviceData.assigned_panic_id;

  if (!panicId) {
    await update(deviceRef, {
      active: false,
      assigned_panic_id: '',
      panic_latitude: null,
      panic_longitude: null,
      last_update: Date.now(),
    });
    return true;
  }

  const panicRef = ref(db2, `public_panics/${panicId}`);
  const panicSnapshot = await get(panicRef);

  if (!panicSnapshot.exists()) {
    await update(deviceRef, {
      active: false,
      assigned_panic_id: '',
      panic_latitude: null,
      panic_longitude: null,
      last_update: Date.now(),
    });
    return true;
  }

  const panicData = panicSnapshot.val();
  const panicStatus = normalizeStatus(panicData.status);
  const createdAt = Number(panicData.created_at || 0);
  const elapsed = Date.now() - createdAt;

  if (panicData.officer_processed === true) {
    await update(deviceRef, {
      active: false,
      assigned_panic_id: '',
      panic_latitude: null,
      panic_longitude: null,
      last_update: Date.now(),
    });
    return true;
  }

  const finishedStatuses = [STATUS.MENUNGGU, STATUS.DIPROSES, STATUS.SELESAI];
  if (finishedStatuses.includes(panicStatus)) {
    await update(deviceRef, {
      active: false,
      assigned_panic_id: '',
      panic_latitude: null,
      panic_longitude: null,
      last_update: Date.now(),
    });
    return true;
  }

  if (createdAt > 0 && elapsed >= PANIC_DURATION) {
    await update(deviceRef, {
      active: false,
      assigned_panic_id: '',
      panic_latitude: null,
      panic_longitude: null,
      last_update: Date.now(),
    });

    await update(panicRef, {
      device_auto_off: true,
      device_off_at: Date.now(),
    });

    return true;
  }

  return false;
}

/*
|--------------------------------------------------------------------------
| Get device from panicChannels
|--------------------------------------------------------------------------
*/
export async function getDeviceFromDB2(deviceId) {
  const channelsRef = ref(db2, 'panicChannels');
  const snapshot = await get(channelsRef);

  if (!snapshot.exists()) {
    throw new Error('Belum ada perangkat Panic Button IoT di Firebase.');
  }

  const channelsData = snapshot.val();
  let foundDevice = null;
  let foundZone = null;
  let foundKey = null;

  for (const [zoneName, zoneData] of Object.entries(channelsData)) {
    if (!zoneData || typeof zoneData !== 'object') continue;
    for (const [deviceKey, deviceData] of Object.entries(zoneData)) {
      if (!deviceData || typeof deviceData !== 'object') continue;
      if (deviceData.device === deviceId || deviceKey === deviceId) {
        foundDevice = deviceData;
        foundZone = zoneName;
        foundKey = deviceKey;
      }
    }
  }

  if (!foundDevice) {
    throw new Error(
      `Perangkat Panic Button "${deviceId}" tidak ditemukan di sistem.`
    );
  }

  if (foundDevice.online === false) {
    throw new Error(
      `Perangkat Panic Button "${deviceId}" sedang offline.`
    );
  }

  if (foundDevice.active === true) {
    const deviceRef = ref(db2, `panicChannels/${foundZone}/${foundKey}`);
    const wasReset = await resetStalePanicDevice(
      deviceRef,
      foundDevice,
      deviceId
    );

    if (wasReset) {
      foundDevice.active = false;
      foundDevice.assigned_panic_id = '';
    } else {
      throw new Error(
        `Perangkat Panic Button "${deviceId}" sedang dalam keadaan panic. Tunggu hingga selesai.`
      );
    }
  }

  return {
    device: foundDevice,
    zone: foundZone,
    deviceKey: foundKey,
    deviceId,
  };
}

/*
|--------------------------------------------------------------------------
| Reverse geocoding via Nominatim
|--------------------------------------------------------------------------
*/
export async function getAddressFromCoordinates(latitude, longitude) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      return `${latitude}, ${longitude}`;
    }

    const data = await response.json();
    return data.display_name || `${latitude}, ${longitude}`;
  } catch {
    return `${latitude}, ${longitude}`;
  }
}

/*
|--------------------------------------------------------------------------
| Auto turn off device after 15s
|--------------------------------------------------------------------------
*/
async function autoTurnOffDevice(zone, deviceKey, panicId) {
  await new Promise((resolve) => setTimeout(resolve, PANIC_DURATION));

  try {
    const deviceRef = ref(db2, `panicChannels/${zone}/${deviceKey}`);
    const deviceSnapshot = await get(deviceRef);

    if (!deviceSnapshot.exists()) return;

    const deviceData = deviceSnapshot.val();

    if (deviceData.active !== true) return;

    if (
      deviceData.assigned_panic_id &&
      deviceData.assigned_panic_id !== panicId
    )
      return;

    await update(deviceRef, {
      active: false,
      assigned_panic_id: '',
      panic_latitude: null,
      panic_longitude: null,
      last_update: Date.now(),
    });

    const panicRef = ref(db2, `public_panics/${panicId}`);
    const panicSnapshot = await get(panicRef);

    if (panicSnapshot.exists()) {
      await update(panicRef, {
        device_auto_off: true,
        device_off_at: Date.now(),
      });
    }
  } catch (error) {
    console.error('Auto-off gagal:', error);
  }
}

/*
|--------------------------------------------------------------------------
| SEND PANIC — Main function
|--------------------------------------------------------------------------
*/
export async function sendPanic(userId, currentUser, location, emergencyType = 'umum') {
  const { latitude, longitude } = location;

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('Koordinat lokasi tidak valid.');
  }

  if (!userId) {
    throw new Error('Anda harus login terlebih dahulu untuk menggunakan fitur Panic Button.');
  }

  // 1. Get user data from Firebase
  const userDataResult = await getUserFromDB2(userId);
  const deviceId = userDataResult.deviceId;

  if (
    !deviceId ||
    deviceId === '' ||
    deviceId === '-' ||
    deviceId === 'null' ||
    deviceId === 'NONE' ||
    deviceId === 'undefined'
  ) {
    throw new Error(
      'Akun Anda belum memiliki perangkat Panic Button yang terdaftar. Silakan hubungi administrator untuk mendaftarkan perangkat Panic Button.'
    );
  }

  // 2. Get device from Firebase panicChannels
  const userDevice = await getDeviceFromDB2(deviceId);

  // 3. Get address
  const address = await getAddressFromCoordinates(latitude, longitude);
  const locationUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

  const createdAt = Date.now();
  const category = emergencyType || 'umum';
  const description = `Kejadian Darurat [${category.toUpperCase()}] via Aplikasi Mobile`;

  // 4. Build panic data (identical to web)
  const panicData = {
    user_id: userId,
    username:
      currentUser?.username ||
      userDataResult.userData.username ||
      '',
    name:
      currentUser?.name ||
      userDataResult.userData.name ||
      '',
    phone:
      currentUser?.phone ||
      userDataResult.userData.phone ||
      '',
    email:
      currentUser?.email ||
      userDataResult.userData.email ||
      '',
    is_guest: false,
    latitude,
    longitude,
    address,
    location_url: locationUrl,
    status: 'active',
    category,
    emergency_type: category,
    description,
    assigned_device: userDevice.device.device,
    assigned_zone: userDevice.zone,
    assigned_location: userDevice.device.lokasi || '-',
    device_id: userDevice.deviceId,
    created_at: createdAt,
    updated_at: createdAt,
    device_auto_off: false,
    officer_processed: false,
    source: 'mobile', // Mark as mobile-originated
  };

  // 5. Push to public_panics
  const reportsRef = ref(db2, 'public_panics');
  const newReport = await push(reportsRef, panicData);
  const panicId = newReport.key;

  // 6. Activate device
  const deviceRef = ref(
    db2,
    `panicChannels/${userDevice.zone}/${userDevice.deviceKey}`
  );

  await update(deviceRef, {
    active: true,
    assigned_panic_id: panicId,
    panic_latitude: latitude,
    panic_longitude: longitude,
    last_update: Date.now(),
  });

  // 7. Auto-off after 15 seconds (fire & forget)
  autoTurnOffDevice(
    userDevice.zone,
    userDevice.deviceKey,
    panicId
  ).catch((err) => console.error('Auto-off error:', err));

  return {
    success: true,
    reportSaved: true,
    sirenActivated: true,
    panicId,
    panicData,
    device: userDevice.device,
    deviceId: userDevice.deviceId,
    zone: userDevice.zone,
    duration: '15 Detik',
  };
}

/*
|--------------------------------------------------------------------------
| Listen to user's panic reports (real-time)
|--------------------------------------------------------------------------
*/
export function listenToUserPanics(userId, callback) {
  const panicsRef = ref(db2, 'public_panics');

  const unsubscribe = onValue(panicsRef, (snapshot) => {
    const data = snapshot.val() || {};
    const userReports = [];

    for (const [key, report] of Object.entries(data)) {
      const reportUserId = report.user_id
        ? String(report.user_id)
        : '';
      if (reportUserId === String(userId)) {
        userReports.push({ id: key, ...report });
      }
    }

    // Sort newest first
    userReports.sort(
      (a, b) => (b.created_at || 0) - (a.created_at || 0)
    );

    callback(userReports);
  });

  // Return specific unsubscribe function
  return () => {
    if (typeof unsubscribe === 'function') {
      unsubscribe();
    }
  };
}

/*
|--------------------------------------------------------------------------
| Get status display info
|--------------------------------------------------------------------------
*/
export function getStatusInfo(status) {
  const normalized = normalizeStatus(status);

  const statusMap = {
    [STATUS.ACTIVE]: {
      label: 'Aktif',
      color: '#EF4444',
      bg: 'rgba(239,68,68,0.15)',
      borderColor: 'rgba(239,68,68,0.35)',
      iconName: 'radio-button-on',
    },
    [STATUS.MENUNGGU]: {
      label: 'Menunggu',
      color: '#F59E0B',
      bg: 'rgba(245,158,11,0.15)',
      borderColor: 'rgba(245,158,11,0.35)',
      iconName: 'time-outline',
    },
    [STATUS.DIPROSES]: {
      label: 'Diproses',
      color: '#60A5FA',
      bg: 'rgba(96,165,250,0.15)',
      borderColor: 'rgba(96,165,250,0.35)',
      iconName: 'sync-outline',
    },
    [STATUS.SELESAI]: {
      label: 'Selesai',
      color: '#34D399',
      bg: 'rgba(52,211,153,0.15)',
      borderColor: 'rgba(52,211,153,0.35)',
      iconName: 'checkmark-circle-outline',
    },
  };

  return (
    statusMap[normalized] || {
      label: status || 'Unknown',
      color: '#6B7280',
      bg: 'rgba(107,114,128,0.15)',
      borderColor: 'rgba(107,114,128,0.3)',
      iconName: 'help-circle-outline',
    }
  );
}

export { STATUS, normalizeStatus };
