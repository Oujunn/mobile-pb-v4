/*
|--------------------------------------------------------------------------
| Authentication Service
|--------------------------------------------------------------------------
| Handles login/register against Firebase RTDB db2 /users node.
| Mirrors the AuthController.php logic from the Laravel backend.
| Uses bcrypt comparison via expo-crypto + a pure-JS bcrypt check.
*/

import {
  ref,
  get,
  push,
  update,
  onValue,
  off,
} from 'firebase/database';
import { db2 } from '../config/firebase.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import {
  formatProfileData,
  calculateProfileCompleteness,
  getRoleLabel,
  PROFILE_CHECKLIST_FIELDS,
} from '../utils/profileCalculator.js';

const STORAGE_KEY = '@panic_user';

/*
|--------------------------------------------------------------------------
| Bcrypt Check (simplified)
|--------------------------------------------------------------------------
| Since we cannot run PHP's Hash::check in mobile, and the existing
| system uses Laravel bcrypt ($2y$ hashes), we do a workaround:
|
| For LOGIN, we compare against Firebase REST. The web app stores
| bcrypt hashes. We'll use a pure-JS bcrypt library or fall back to
| plain-text comparison (which the web app already supports as fallback).
|
| The register flow calls Laravel's /api/hash-password endpoint to
| get a proper bcrypt hash, OR we use the bcryptjs library.
*/

// We'll install bcryptjs for this
let bcryptCompare = null;
let bcryptHash = null;

try {
  const bcryptjs = require('bcryptjs');
  bcryptCompare = bcryptjs.compareSync;
  // Standardize output to $2y$ prefix for 100% bidirectional compatibility with Laravel 13 / PHP
  bcryptHash = (password) => {
    const raw = bcryptjs.hashSync(password, 12);
    return raw.replace(/^\$2[ab]\$/, '$2y$');
  };
} catch (e) {
  // Fallback if bcryptjs not available
  bcryptCompare = (password, hash) => password === hash;
  bcryptHash = (password) => password;
}

/*
|--------------------------------------------------------------------------
| Login
|--------------------------------------------------------------------------
*/
export async function loginUser(email, password) {
  const normalizedEmail = email.toLowerCase().trim();

  // Read all users from db2
  const usersRef = ref(db2, 'users');
  const snapshot = await get(usersRef);

  if (!snapshot.exists()) {
    throw new Error('Database pengguna tidak tersedia.');
  }

  const users = snapshot.val();
  let foundUser = null;
  let foundKey = null;

  for (const [key, user] of Object.entries(users)) {
    if (
      user &&
      typeof user === 'object' &&
      user.email &&
      user.email.toLowerCase().trim() === normalizedEmail
    ) {
      // Check password: bcrypt hash check OR plain text fallback
      if (user.password) {
        const isMatch =
          bcryptCompare(password, user.password) ||
          password === user.password;
        if (isMatch) {
          foundUser = { ...user };
          foundKey = key;
          break;
        }
      }
    }
  }

  if (!foundUser) {
    throw new Error('Email atau password salah.');
  }

  // Format full user profile using normalized profile calculator
  const userData = formatProfileData(foundKey, foundUser);

  // Save to AsyncStorage
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(userData));

  return userData;
}

/*
|--------------------------------------------------------------------------
| Fetch Latest User Profile from DB2 (Realtime sync with Web Laravel)
|--------------------------------------------------------------------------
*/
export async function fetchUserProfileFromDB2(userId) {
  if (!userId) return null;
  try {
    const userRef = ref(db2, `users/${userId}`);
    const snapshot = await get(userRef);
    if (!snapshot.exists()) return null;

    return formatProfileData(userId, snapshot.val());
  } catch (err) {
    console.warn('Error fetching fresh user profile from DB2:', err);
    return null;
  }
}

/*
|--------------------------------------------------------------------------
| Realtime Profile Subscription (Firebase onValue)
|--------------------------------------------------------------------------
| Keeps mobile profile 100% in sync with web changes in real time.
*/
export function subscribeUserProfile(userId, callback) {
  if (!userId || typeof callback !== 'function') return () => {};

  const userRef = ref(db2, `users/${userId}`);

  const unsubscribe = onValue(
    userRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const formatted = formatProfileData(userId, snapshot.val());
        callback(formatted);
      }
    },
    (error) => {
      console.warn(`[subscribeUserProfile] onValue error for ${userId}:`, error);
    }
  );

  return () => {
    try {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    } catch (e) {
      // ignore
    }
  };
}

/*
|--------------------------------------------------------------------------
| Register
|--------------------------------------------------------------------------
*/
export async function registerUser(name, email, phone, password) {
  const normalizedEmail = email.toLowerCase().trim();

  // Check duplicate email in db2
  const usersRef = ref(db2, 'users');
  const snapshot = await get(usersRef);

  if (snapshot.exists()) {
    const users = snapshot.val();
    for (const user of Object.values(users)) {
      if (
        user &&
        user.email &&
        user.email.toLowerCase().trim() === normalizedEmail
      ) {
        throw new Error('Email sudah terdaftar. Silakan gunakan email lain.');
      }
    }
  }

  // Hash password with bcryptjs
  const hashedPassword = bcryptHash(password);

  const userData = {
    name,
    email: normalizedEmail,
    phone: phone || '',
    phoneNumber: phone || '',
    assigned_zone: '-',
    assigned_device: '-',
    password: hashedPassword,
    role: 'user',
    created_at: new Date().toISOString(),
    updated_at: Date.now(),
  };

  // Push to Firebase
  const newRef = await push(usersRef, userData);
  const formatted = formatProfileData(newRef.key, userData);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(formatted));

  return formatted;
}

/*
|--------------------------------------------------------------------------
| Get Current User (from local storage)
|--------------------------------------------------------------------------
*/
export async function getCurrentUser() {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

/*
|--------------------------------------------------------------------------
| Logout
|--------------------------------------------------------------------------
*/
export async function logoutUser() {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
    const keys = await AsyncStorage.getAllKeys();
    const appKeys = keys.filter(
      (k) => k.startsWith('@panic_button') || k.startsWith('profile_')
    );
    if (appKeys.length > 0) {
      await AsyncStorage.multiRemove(appKeys);
    }
  } catch (err) {
    console.warn('Error clearing storage on logout:', err);
  }
}

export async function updateStoredUser(userData) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
}

/*
|--------------------------------------------------------------------------
| Update User Profile
|--------------------------------------------------------------------------
| Supports all 15 profile checklist fields, contact, medical, photo,
| zone and password updates directly to Firebase DB2 /users/{userId}.
*/
export async function updateUserProfile(userId, updates = {}) {
  if (!userId) {
    throw new Error('User ID tidak valid.');
  }

  const userRef = ref(db2, `users/${userId}`);

  // Verification of old password is ONLY required when intentionally changing password
  const hasNewPassword =
    typeof updates.password === 'string' && updates.password.trim() !== '';

  if (hasNewPassword) {
    if (!updates.oldPassword || String(updates.oldPassword).trim() === '') {
      throw new Error('Password lama wajib diisi untuk mengubah password.');
    }
    const snapshot = await get(userRef);
    if (snapshot.exists()) {
      const userData = snapshot.val();
      const storedPassword = userData.password || '';
      const isMatch =
        (bcryptCompare && bcryptCompare(updates.oldPassword, storedPassword)) ||
        updates.oldPassword === storedPassword;
      if (!isMatch) {
        throw new Error('Password lama tidak sesuai.');
      }
    }
  }

  const payload = {};

  // Core identity & contact
  if (updates.name !== undefined) payload.name = String(updates.name).trim();
  if (updates.phone !== undefined) {
    payload.phone = String(updates.phone).trim();
    payload.phoneNumber = String(updates.phone).trim();
  }
  if (updates.email !== undefined) {
    payload.email = String(updates.email).toLowerCase().trim();
  }

  // 15 Profile Checklist Fields
  if (updates.birth_date !== undefined) payload.birth_date = String(updates.birth_date).trim();
  if (updates.gender !== undefined) payload.gender = String(updates.gender).trim();
  if (updates.province !== undefined) payload.province = String(updates.province).trim();
  if (updates.city !== undefined) payload.city = String(updates.city).trim();
  if (updates.district !== undefined) payload.district = String(updates.district).trim();
  if (updates.subdistrict !== undefined) payload.subdistrict = String(updates.subdistrict).trim();
  if (updates.full_address !== undefined) payload.full_address = String(updates.full_address).trim();
  if (updates.postal_code !== undefined) payload.postal_code = String(updates.postal_code).trim();

  if (updates.emergency_name_1 !== undefined) payload.emergency_name_1 = String(updates.emergency_name_1).trim();
  if (updates.emergency_relation_1 !== undefined) payload.emergency_relation_1 = String(updates.emergency_relation_1).trim();
  if (updates.emergency_phone_1 !== undefined) payload.emergency_phone_1 = String(updates.emergency_phone_1).trim();

  if (updates.emergency_name_2 !== undefined) payload.emergency_name_2 = String(updates.emergency_name_2).trim();
  if (updates.emergency_relation_2 !== undefined) payload.emergency_relation_2 = String(updates.emergency_relation_2).trim();
  if (updates.emergency_phone_2 !== undefined) payload.emergency_phone_2 = String(updates.emergency_phone_2).trim();

  if (updates.blood_type !== undefined) payload.blood_type = String(updates.blood_type).trim().toUpperCase();

  // Medical and Photo fields
  if (updates.allergies_condition !== undefined) payload.allergies_condition = String(updates.allergies_condition).trim();
  if (updates.photo !== undefined) payload.photo = String(updates.photo).trim();

  if (hasNewPassword) {
    payload.password = bcryptHash ? bcryptHash(updates.password.trim()) : updates.password.trim();
  }

  payload.updated_at = Date.now();

  await update(userRef, payload);

  // Fetch fresh snapshot from database to ensure complete formatted state
  const updatedSnapshot = await get(userRef);
  const formatted = formatProfileData(userId, updatedSnapshot.val() || payload);

  await updateStoredUser(formatted);
  return formatted;
}

