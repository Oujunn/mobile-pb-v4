# Panic Button Mobile V4 (Mobile PB V4)

Aplikasi Tanggap Darurat Warga (*Emergency Response System*) berbasis **React Native + Expo**, terintegrasi penuh secara *real-time* dengan **Command Center Web V3** (Firebase Realtime Database) dan **Perangkat Keras IoT Sirine Fisik** (ESP32/ESP8266).

---

## 🌟 Paradigma Baru: Panic-First Navigation

Versi 4 menghadirkan perombakan total arsitektur antarmuka dan pengalaman pengguna (*Complete UI/UX Redesign*):
1. **Penghapusan Dashboard Statis**: Mengeliminasi layar dashboard perantara agar pengguna dalam situasi darurat tidak kehilangan waktu.
2. **Navigasi 3 Tab Ergonomis**:
   - **Tab 1: `Panic` (Default & Initial Screen)**: Layar darurat utama yang langsung terbuka seketika aplikasi dibuka atau setelah sesi login dipulihkan.
   - **Tab 2: `Riwayat`**: Log rekam jejak insiden darurat, status laporan realtime (Menunggu, Diproses, Selesai), filter status horizontal, dan tautan Google Maps.
   - **Tab 3: `Profil`**: Pengelolaan 15 data kelengkapan profil, kontak darurat, informasi medis, status modul IoT, ubah kata sandi, dan animasi logout resmi.
3. **Migrasi Data Esensial Dashboard**:
   - Status konektivitas posko IoT disematkan langsung pada Header Badge `PanicScreen` secara realtime.
   - Banner peringatan insiden aktif muncul otomatis jika ada laporan yang sedang ditangani posko.
   - Ringkasan metrik statistik (Total Laporan, Dalam Proses, Selesai) terintegrasi pada Header `HistoryScreen`.

---

## 🚀 Fitur Utama

- **1-Tap Emergency Dispatch**: Tombol fokal darurat 186dp dengan animasi konsentris ganda (*pulse ring*) dan proteksi *synchronous debounce*.
- **4 Kategori Kejadian Resmi**:
  1. **Umum**: Bencana alam, banjir, gempa bumi, tanah longsor, evakuasi, gangguan ketertiban umum.
  2. **Medis**: Serangan jantung, kecelakaan, stroke, pingsan, kedaruratan kesehatan.
  3. **Kebakaran**: Kebakaran pemukiman/gedung, ledakan gas, korsleting listrik.
  4. **Kejahatan**: Perampokan, pencurian, pembegalan, kekerasan fisik, tindak kriminal.
- **Real GPS Location & Geocoding**: Mengambil koordinat satelit presisi tinggi via `expo-location` dan reverse geocode alamat jalan tanpa koordinat statis/palsu.
- **Integrasi Hardware IoT Sirine Posko**:
  - Protokol aktivasi kanal `panicChannels/{zone}/{device}`.
  - Timer *auto-off* 15 detik dengan tombol pembatalan manual *"Matikan Sirine Fisik"*.
- **15-Field Profile Completeness Engine**:
  - Pelacakan progress kelengkapan data (0–100%).
  - *Cascading Region Picker* wilayah Indonesia (Provinsi, Kota/Kabupaten, Kecamatan, Kelurahan/Desa, auto-lookup Kode Pos).
  - Kontak Darurat 1 (Utama) & Kontak Darurat 2 (Sekunder) dengan tombol panggilan langsung.
  - Data medis (golongan darah & alergi).
- **Keamanan & Autentikasi Standar Web V3**:
  - Verifikasi password bcrypt `$2y$` dua arah antara backend Laravel PHP dan client JavaScript.
  - Validasi ketat registrasi (min 6 karakter, min 1 huruf besar [A-Z], min 1 angka [0-9]).
  - Animasi keluar resmi Web V3 (`LogoutModalOverlay`) dengan efek pulse halo sebelum pembersihan sesi.

---

## 📁 Struktur Direktori

```text
mobile-pb-v4/
├── assets/                 # Aset grafis resmi (logo.png, icons)
├── src/
│   ├── components/         # DatePickerModal, LogoutModalOverlay, PressableScale
│   ├── config/             # Konfigurasi Firebase Realtime Database
│   ├── context/            # AuthContext (Sesi, login, register, logout animation)
│   ├── screens/
│   │   ├── PanicScreen.js     # Layar fokal darurat, GPS card, 4 kategori, IoT badge
│   │   ├── HistoryScreen.js   # Log insiden, filter status, summary metrics
│   │   ├── ProfileScreen.js   # 15 field profil, cascading region, ubah password
│   │   ├── WelcomeScreen.js   # Layar awal & panggilan darurat bebas login
│   │   ├── LoginScreen.js     # Layar masuk warga / petugas
│   │   └── RegisterScreen.js  # Layar registrasi warga baru
│   ├── services/           # authService, panicService, locationService, regionService, dashboardService
│   ├── shims/              # crypto shim untuk kompatibilitas bcrypt di React Native
│   ├── theme/              # Token desain UI/UX Pro Max (colors, spacing, radius, text, shadows)
│   └── utils/              # dateHelper, profileCalculator
├── App.js                  # 3-Tab Bottom Navigation & Root Navigator
├── app.json                # Konfigurasi Expo & Android permissions
├── babel.config.js         # Konfigurasi Babel compiler
├── package.json            # Dependensi proyek
└── README.md               # Dokumentasi ini
```

---

## 🛠️ Instalasi & Menjalankan Aplikasi

### 1. Prasyarat
- Node.js versi 18 atau 20 LTS
- NPM atau PNPM
- Expo CLI (`npm install -g expo-cli`)

### 2. Langkah Instalasi
```bash
# Pindah ke direktori mobile-pb-v4
cd mobile-pb-v4

# Install seluruh dependensi
npm install
```

### 3. Menjalankan Mode Development
```bash
# Jalankan Expo Development Server
npx expo start
```
- Pindai QR Code menggunakan aplikasi **Expo Go** pada perangkat fisik Android/iOS.
- Tekan `a` untuk membuka di Emulator Android.
- Tekan `w` untuk mode web browser mockup.

### 4. Build / Export Production
```bash
# Bundle production Android
npx expo export -p android
```

---

## 🛡️ Lisensi & Hak Cipta
Hak Cipta © 2026 Tim Pengembang Panic Button. Dilindungi undang-undang.
