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
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius, text, shadows } from '../theme';
import PressableScale from '../components/PressableScale';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [focused, setFocused] = useState(null);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Email dan password wajib diisi.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      await login(email.trim(), password);
    } catch (err) {
      setErrorMsg(err.message || 'Login gagal. Periksa kembali email dan password.');
    } finally {
      setLoading(false);
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
        {/* ── Back Navigation ── */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.navigate('Welcome')}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
          <Text style={styles.backBtnText}>Layar Awal</Text>
        </TouchableOpacity>

        {/* ── Logo & Brand ── */}
        <View style={styles.brand}>
          <View style={styles.logoWrap}>
            <View style={styles.logoBg}>
              <Image
                source={require('../../assets/logo.png')}
                style={{ width: 38, height: 38 }}
                resizeMode="contain"
              />
            </View>
          </View>
          <Text style={styles.appName}>PANIC BUTTON</Text>
          <Text style={styles.tagline}>Sistem Tanggap Darurat</Text>

          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <Text style={styles.statusLabel}>Sistem Aktif</Text>
          </View>
        </View>

        {/* ── Form Card ── */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>Masuk</Text>
          <Text style={styles.cardSub}>
            Gunakan akun warga atau petugas terdaftar
          </Text>

          {errorMsg ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={colors.danger} style={styles.errorIcon} />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* Email */}
          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <View style={[styles.inputRow, focused === 'email' && styles.inputRowFocused]}>
              <Ionicons name="mail-outline" size={18} color={focused === 'email' ? colors.brandNavy : colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="nama@email.com"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={(v) => { setEmail(v); setErrorMsg(''); }}
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused(null)}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <View style={[styles.inputRow, focused === 'pass' && styles.inputRowFocused]}>
              <Ionicons name="lock-closed-outline" size={18} color={focused === 'pass' ? colors.brandNavy : colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Masukkan password"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={(v) => { setPassword(v); setErrorMsg(''); }}
                onFocus={() => setFocused('pass')}
                onBlur={() => setFocused(null)}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Primary CTA */}
          <PressableScale
            style={[styles.btnPrimary, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={styles.btnPrimaryLabel}>Masuk</Text>
            )}
          </PressableScale>

          {/* Register link */}
          <View style={styles.registerRow}>
            <Text style={styles.registerText}>Belum punya akun? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLink}>Daftar Sekarang</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Ionicons name="shield-checkmark-outline" size={13} color={colors.textMuted} />
          <Text style={styles.footerText}>  Data terenkripsi dan aman</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },

  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  backBtnText: {
    color: colors.textPrimary,
    fontSize: text.sm,
    fontWeight: text.semibold,
    marginLeft: 4,
  },

  // Brand
  brand: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoWrap: {
    marginBottom: spacing.md,
  },
  logoBg: {
    width: 80,
    height: 80,
    borderRadius: radius.xl,
    backgroundColor: colors.primarySubtle,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.red,
  },
  appName: {
    fontSize: text.xxl,
    fontWeight: text.black,
    color: colors.textPrimary,
    letterSpacing: 3,
  },
  tagline: {
    fontSize: text.sm,
    fontWeight: text.medium,
    color: colors.textSecondary,
    marginTop: 4,
    letterSpacing: 0.4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successBg,
    borderWidth: 1,
    borderColor: colors.successBorder,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.full,
    marginTop: spacing.md,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
    marginRight: 6,
  },
  statusLabel: {
    fontSize: text.xs,
    fontWeight: text.semibold,
    color: colors.success,
  },

  // Card
  card: {
    backgroundColor: colors.bgSurface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadows.md,
  },
  cardHeading: {
    fontSize: text.xl,
    fontWeight: text.bold,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  cardSub: {
    fontSize: text.xs,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 18,
  },

  // Error
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
  errorIcon: {
    marginRight: 6,
    marginTop: 1,
  },
  errorText: {
    flex: 1,
    color: colors.danger,
    fontSize: text.sm,
    lineHeight: 20,
  },

  // Input
  field: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: text.xs,
    fontWeight: text.semibold,
    color: colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
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
  inputRowFocused: {
    borderColor: colors.brandBlue,
    backgroundColor: colors.brandNavyBg,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: text.base,
    height: '100%',
  },

  // Buttons
  btnPrimary: {
    backgroundColor: colors.brandNavy,
    borderRadius: radius.md,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
    ...shadows.sm,
  },
  btnDisabled: { opacity: 0.5 },
  btnPrimaryLabel: {
    color: colors.white,
    fontSize: text.base,
    fontWeight: text.bold,
    letterSpacing: 0.5,
  },

  // Register
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  registerText: {
    fontSize: text.sm,
    color: colors.textSecondary,
  },
  registerLink: {
    fontSize: text.sm,
    fontWeight: text.bold,
    color: colors.brandNavy,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  footerText: {
    fontSize: text.xs,
    color: colors.textMuted,
  },
});
