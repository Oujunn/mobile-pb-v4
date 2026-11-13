/*
|--------------------------------------------------------------------------
| Firebase Configuration
|--------------------------------------------------------------------------
| Connects to the SAME Firebase projects used by the Laravel web app.
| db2 (panicbttn2) is the primary database for public users.
| db1 (panicbuttonrtdb-eccd1) is the housing complex database.
*/

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Firebase 2 — Public / Main Panic Button System
const firebaseConfig2 = {
  apiKey: 'AIzaSyClLPCMp3YzYczGun9_jXUl5bPuLBeWIdA',
  authDomain: 'panicbttn2.firebaseapp.com',
  databaseURL:
    'https://panicbttn2-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'panicbttn2',
  storageBucket: 'panicbttn2.firebasestorage.app',
  messagingSenderId: '719018654648',
  appId: '1:719018654648:web:073ed3dffeda134975ed4d',
};

// Firebase 1 — Perumahan (housing) system
const firebaseConfig1 = {
  apiKey: 'AIzaSyDk2aeQR7T7mh-vwZnxvTT61fJjluojVRa0',
  authDomain: 'panicbuttonrtdb-eccd1.firebaseapp.com',
  databaseURL:
    'https://panicbuttonrtdb-eccd1-default-rtdb.firebaseio.com',
  projectId: 'panicbuttonrtdb-eccd1',
  storageBucket: 'panicbuttonrtdb-eccd1.firebasestorage.app',
  messagingSenderId: '415344446237',
  appId: '1:415344446237:web:5a73d6177529e4286e2ff4',
  measurementId: 'G-1YCQETHDC5',
};

// Initialize (reuse if already initialized)
const app2 =
  getApps().find((a) => a.name === 'firebase2') ||
  initializeApp(firebaseConfig2, 'firebase2');

const app1 =
  getApps().find((a) => a.name === 'firebase1') ||
  initializeApp(firebaseConfig1, 'firebase1');

export const db2 = getDatabase(app2);
export const db1 = getDatabase(app1);

export { app1, app2 };
