import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius, text, shadows } from '../theme';
import PressableScale from '../components/PressableScale';

// Extracted outside component to prevent re-mounting & losing focus on every keystroke
function FormField({
  id,
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  secureTextEntry = false,
  showToggle = false,
  onToggle,
  show = false,
  hint,
  isFocused = false,
  onFocus,
  onBlur,
  isError = false,
  isSuccess = false,
  autoCapitalize,
}) {
  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.labelHint}>{hint}</Text> : null}
      </View>
      <View
        style={[
          styles.inputRow,
          isFocused && styles.inputRowFocused,
          isError && styles.inputRowError,
          isSuccess && styles.inputRowSuccess,
        ]}
      >
        <Ionicons
          name={icon}
          size={18}
          color={isFocused ? colors.brandNavy : colors.textMuted}
          style={styles.inputIcon}
        />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          onBlur={onBlur}
          autoCapitalize={autoCapitalize || (keyboardType === 'email-address' ? 'none' : 'words')}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry && !show}
          autoCorrect={false}
        />
        {showToggle ? (
          <TouchableOpacity
            onPress={onToggle}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <Ionicons
              name={show ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={colors.textMuted}
            />
          </TouchableOpacity>
        ) : null}
        {isSuccess ? (
          <Ionicons name="checkmark-circle" size={18} color={colors.success} style={{ marginLeft: 6 }} />
        ) : null}
      </View>
    </View>
  );
}

export default function RegisterScreen({ navigation }) {
  const { register, login } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [passConfirm, setPassConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showPassConfirm, setShowPassConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [focused, setFocused] = useState(null);

  // Success Modal Dialog
  const [successModal, setSuccessModal] = useState(false);
  const [registeredData, setRegisteredData] = useState(null);
  const [autoLoggingIn, setAutoLoggingIn] = useState(false);

  const passMatch = passConfirm.length > 0 && password === passConfirm;
  const passMismatch = passConfirm.length > 0 && password !== passConfirm;

  async function handleRegister() {
    if (!name.trim()) {
      setErrorMsg('Nama lengkap wajib diisi.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Alamat email valid wajib diisi.');
      return;
    }
    if (!phone.trim()) {
      setErrorMsg('Nomor WhatsApp / telepon wajib diisi untuk kontak darurat.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password minimal 6 karakter.');
      return;
    }
    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      setErrorMsg('Kata sandi harus mengandung minimal 1 huruf besar dan 1 angka.');
      return;
    }
    if (password !== passConfirm) {
      setErrorMsg('Konfirmasi password tidak cocok dengan password.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const result = await register(name.trim(), email.trim(), phone.trim(), password);
      setRegisteredData({ email: email.trim(), password, name: name.trim() });
      setSuccessModal(true);
    } catch (err) {
      setErrorMsg(err.message || 'Registrasi gagal. Silakan coba kembali.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAutoLogin() {
    if (!registeredData) {
      navigation.navigate('Login');
      return;
    }
    setAutoLoggingIn(true);
    try {
      await login(registeredData.email, registeredData.password);
      setSuccessModal(false);
    } catch (e) {
      setSuccessModal(false);
      navigation.navigate('Login');
    } finally {
      setAutoLoggingIn(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.root}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Back & Header ── */}
        <View style={styles.topNav}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
            <Text style={styles.backBtnText}>Kembali</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.header}>
          <Text style={styles.heading}>Pendaftaran Akun</Text>
          <Text style={styles.subheading}>
            Lengkapi data diri Anda untuk terhubung ke jaringan tanggap darurat
          </Text>
        </View>

        <View style={styles.card}>
          {errorMsg ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={colors.danger} style={{ marginRight: 6, marginTop: 1 }} />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          <FormField
            id="name"
            label="Nama Lengkap"
            icon="person-outline"
            value={name}
            onChangeText={(v) => { setName(v); setErrorMsg(''); }}
            onFocus={() => setFocused('name')}
            onBlur={() => setFocused(null)}
            isFocused={focused === 'name'}
            placeholder="Contoh: Budi Santoso"
            autoCapitalize="words"
          />

          <FormField
            id="email"
            label="Email Warga"
            icon="mail-outline"
            value={email}
            onChangeText={(v) => { setEmail(v); setErrorMsg(''); }}
            onFocus={() => setFocused('email')}
            onBlur={() => setFocused(null)}
            isFocused={focused === 'email'}
            placeholder="nama@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <FormField
            id="phone"
            label="Nomor WhatsApp / HP"
            icon="call-outline"
            value={phone}
            onChangeText={(v) => { setPhone(v); setErrorMsg(''); }}
            onFocus={() => setFocused('phone')}
            onBlur={() => setFocused(null)}
            isFocused={focused === 'phone'}
            placeholder="0812xxxxxxxx"
            keyboardType="phone-pad"
            autoCapitalize="none"
            hint="Untuk panggilan darurat"
          />

          <FormField
            id="pass"
            label="Password"
            hint="Min. 6 karakter"
            hint="Min. 6 karakter, 1 huruf besar & 1 angka"
            icon="lock-closed-outline"
            value={password}
            onChangeText={(v) => { setPassword(v); setErrorMsg(''); }}
            onFocus={() => setFocused('pass')}
            onBlur={() => setFocused(null)}
            isFocused={focused === 'pass'}
            placeholder="Buat password baru"
            secureTextEntry
            show={showPass}
            showToggle
            onToggle={() => setShowPass(!showPass)}
            autoCapitalize="none"
          />

          <FormField
            id="passConfirm"
            label="Ulangi Password"
            icon="lock-open-outline"
            value={passConfirm}
            onChangeText={(v) => { setPassConfirm(v); setErrorMsg(''); }}
            onFocus={() => setFocused('passConfirm')}
            onBlur={() => setFocused(null)}
            isFocused={focused === 'passConfirm'}
            placeholder="Ketik ulang password"
            secureTextEntry
            show={showPassConfirm}
            showToggle
            onToggle={() => setShowPassConfirm(!showPassConfirm)}
            isError={passMismatch}
            isSuccess={passMatch}
            autoCapitalize="none"
          />

          {passMismatch ? (
            <View style={styles.feedbackRow}>
              <Ionicons name="close-circle" size={14} color={colors.danger} />
              <Text style={[styles.feedbackText, { color: colors.danger }]}>  Password tidak cocok</Text>
            </View>
          ) : null}

          {/* Tombol Buat Akun */}
          <PressableScale
            style={[styles.btnPrimary, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.88}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <View style={styles.btnRow}>
                <Ionicons name="checkmark-done" size={18} color={colors.white} />
                <Text style={styles.btnLabel}>Daftar Sekarang</Text>
              </View>
            )}
          </PressableScale>

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Sudah memiliki akun? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')} activeOpacity={0.7}>
              <Text style={styles.loginLink}>Masuk di Sini</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Security badge */}
        <View style={styles.trustFooter}>
          <Ionicons name="shield-checkmark" size={14} color={colors.success} />
          <Text style={styles.trustText}>
            Data pribadi Anda terenkripsi dan hanya digunakan untuk evakuasi darurat.
          </Text>
        </View>
      </ScrollView>

      {/* ── MODAL SUKSES PENDAFTARAN ── */}
      <Modal
        visible={successModal}
        transparent
        animationType="fade"
        onRequestClose={() => setSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalSuccessIcon}>
              <Ionicons name="checkmark-circle" size={48} color={colors.success} />
            </View>
            <Text style={styles.modalTitle}>Pendaftaran Berhasil!</Text>
            <Text style={styles.modalDesc}>
              Selamat datang, <Text style={{ color: colors.textPrimary, fontWeight: text.bold }}>{registeredData?.name}</Text>. Akun Anda telah aktif dan terhubung ke sistem Panic Button V2.
            </Text>

            <PressableScale
              style={styles.modalBtnAutoLogin}
              onPress={handleAutoLogin}
              disabled={autoLoggingIn}
              activeOpacity={0.88}
            >
              {autoLoggingIn ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <>
                  <Ionicons name="log-in-outline" size={18} color={colors.white} />
                  <Text style={styles.modalBtnAutoLoginText}>Langsung Masuk ke Aplikasi</Text>
                </>
              )}
            </PressableScale>

            <TouchableOpacity
              style={styles.modalBtnGoLogin}
              onPress={() => {
                setSuccessModal(false);
                navigation.navigate('Login');
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.modalBtnGoLoginText}>Ke Halaman Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? spacing.xl : spacing.md,
    paddingBottom: spacing.xxl,
  },
  topNav: {
    marginBottom: spacing.sm,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignSelf: 'flex-start',
  },
  backBtnText: {
    color: colors.textPrimary,
    fontSize: text.sm,
    fontWeight: text.semibold,
    marginLeft: 4,
  },
  header: { marginBottom: spacing.md },
  heading: {
    fontSize: text.xxl,
    fontWeight: text.bold,
    color: colors.textPrimary,
  },
  subheading: {
    fontSize: text.xs,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  card: {
    backgroundColor: colors.bgSurface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadows.md,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  errorText: { flex: 1, color: colors.danger, fontSize: text.sm, lineHeight: 20 },
  field: { marginBottom: spacing.md },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: text.xs,
    fontWeight: text.semibold,
    color: colors.textSecondary,
  },
  labelHint: { fontSize: text.xxs, color: colors.textMuted },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  inputRowFocused: { borderColor: colors.brandBlue, backgroundColor: colors.brandNavyBg },
  inputRowError: { borderColor: colors.danger },
  inputRowSuccess: { borderColor: colors.success },
  inputIcon: { marginRight: spacing.sm },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: text.base,
    height: '100%',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },

  feedbackRow: { flexDirection: 'row', alignItems: 'center', marginTop: -spacing.sm, marginBottom: spacing.sm },
  feedbackText: { fontSize: text.xs },
  btnPrimary: {
    backgroundColor: colors.brandNavy,
    borderRadius: radius.md,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    ...shadows.sm,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnDisabled: { opacity: 0.5 },
  btnLabel: { color: colors.white, fontSize: text.base, fontWeight: text.semibold },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  loginText: { fontSize: text.sm, color: colors.textSecondary },
  loginLink: { fontSize: text.sm, fontWeight: text.semibold, color: colors.brandNavy },

  trustFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  trustText: {
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 14,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.bgSurface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.lg,
  },
  modalSuccessIcon: {
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: text.xl,
    fontWeight: text.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  modalDesc: {
    fontSize: text.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.lg,
  },
  modalBtnAutoLogin: {
    width: '100%',
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: spacing.sm,
    ...shadows.red,
  },
  modalBtnAutoLoginText: {
    color: colors.white,
    fontSize: text.sm,
    fontWeight: text.semibold,
  },
  modalBtnGoLogin: {
    paddingVertical: 8,
  },
  modalBtnGoLoginText: {
    color: colors.textMuted,
    fontSize: text.xs,
    fontWeight: text.semibold,
  },
});
