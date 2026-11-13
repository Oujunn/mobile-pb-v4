/*
|--------------------------------------------------------------------------
| Location Service — Real GPS & Reverse Geocoding
|--------------------------------------------------------------------------
| Handles GPS location with native expo-location permission and precision.
| Strictly provides REAL GPS coordinates (never mock/fake fallbacks).
| Mirrors Web V3 Nominatim reverse geocoding for human-readable addresses.
*/

import * as Location from 'expo-location';

export const LOCATION_STATUS = {
  READY: 'ready',
  REQUESTING: 'requesting',
  DENIED: 'denied',
  UNAVAILABLE: 'unavailable',
  TIMEOUT: 'timeout',
  ERROR: 'error',
};

/*
|--------------------------------------------------------------------------
| Reverse Geocoding via OpenStreetMap Nominatim
|--------------------------------------------------------------------------
*/
export async function getAddressFromCoordinates(latitude, longitude) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return 'Koordinat GPS tidak valid';
  }

  try {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 6000) : null;

    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'PanicButtonMobile/2.0',
      },
      signal: controller ? controller.signal : undefined,
    });

    if (timeoutId) clearTimeout(timeoutId);

    if (!response.ok) {
      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    }

    const data = await response.json();
    return data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  } catch (error) {
    return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  }
}

/*
|--------------------------------------------------------------------------
| Request permission and get current location (Strictly Real GPS)
|--------------------------------------------------------------------------
*/
export async function getCurrentLocation() {
  // 1. Request foreground permission
  const { status } = await Location.requestForegroundPermissionsAsync();

  if (status !== 'granted') {
    const err = new Error('Izin akses lokasi (GPS) ditolak. Silakan izinkan akses lokasi pada pengaturan perangkat.');
    err.code = LOCATION_STATUS.DENIED;
    throw err;
  }

  // 2. Check if location services (GPS hardware) are enabled
  const enabled = await Location.hasServicesEnabledAsync();
  if (!enabled) {
    const err = new Error('Layanan lokasi GPS tidak aktif. Silakan aktifkan GPS pada perangkat Anda.');
    err.code = LOCATION_STATUS.UNAVAILABLE;
    throw err;
  }

  try {
    // 3. Acquire real GPS coordinates
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
      timeout: 15000,
    });

    const { latitude, longitude, accuracy } = location.coords;

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      const err = new Error('Koordinat lokasi yang diterima tidak valid.');
      err.code = LOCATION_STATUS.ERROR;
      throw err;
    }

    return {
      latitude,
      longitude,
      accuracy,
      timestamp: location.timestamp,
    };
  } catch (error) {
    if (error.code) throw error; // Already formatted

    const err = new Error('Waktu tunggu GPS habis. Pastikan Anda berada di area dengan sinyal lokasi yang baik.');
    err.code = LOCATION_STATUS.TIMEOUT;
    throw err;
  }
}

/*
|--------------------------------------------------------------------------
| Acquire Full Location with Reverse Geocoded Address
|--------------------------------------------------------------------------
*/
export async function getFullLocationWithAddress() {
  const coords = await getCurrentLocation();
  const address = await getAddressFromCoordinates(coords.latitude, coords.longitude);
  const locationUrl = `https://www.google.com/maps/search/?api=1&query=${coords.latitude},${coords.longitude}`;

  return {
    ...coords,
    address,
    locationUrl,
  };
}

/*
|--------------------------------------------------------------------------
| Check location permission status
|--------------------------------------------------------------------------
*/
export async function checkLocationPermission() {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}
