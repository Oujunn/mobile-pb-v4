import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Linking,
  Animated,
  Easing,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius, text, shadows } from '../theme';
import PressableScale from '../components/PressableScale';

const SLIDES = [
  {
    id: 'sos',
    icon: 'warning',
    iconColor: colors.primary,
    badge: 'SIAGA 24/7',
    badgeColor: colors.primary,
    title: 'Sinyal Darurat 1-Sentuhan',
    desc: 'Aktifkan sirine IoT lingkungan dan kirim peringatan bahaya instan ke posko keamanan hanya dalam sekali tekan.',
  },
  {
    id: 'gps',
    icon: 'location',
    iconColor: colors.success,
    badge: 'REALTIME GPS',
    badgeColor: colors.success,
    title: 'Koordinat Presisi Tinggi',
    desc: 'Posisi darurat Anda langsung terdeteksi dan dipetakan secara akurat agar tim pertolongan tiba lebih cepat.',
  },
  {
    id: 'network',
    icon: 'shield-checkmark',
    iconColor: colors.info,
    badge: 'MULTI-LAYANAN',
    badgeColor: colors.info,
    title: 'Terhubung Tim Tanggap Cepat',
    desc: 'Terintegrasi langsung dengan pos komando warga, kepolisian, tim medis, pemadam kebakaran, dan relawan.',
  },
];

const EMERGENCY_HOTLINES = [
  { number: '112', label: 'Call Center 112', icon: 'call', color: colors.primary },
  { number: '110', label: 'Polisi (110)', icon: 'shield', color: colors.info },
  { number: '118', label: 'Ambulans (118)', icon: 'medical', color: colors.success },
];

export default function WelcomeScreen({ navigation }) {
  const [activeSlide, setActiveSlide] = useState(0);

  // Pulse ring animation
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.12,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  function handleCall(number) {
    Linking.openURL(`tel:${number}`).catch(() => {});
  }

  const slide = SLIDES[activeSlide];

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ── Top Header / Status ── */}
        <View style={styles.topHeader}>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>SISTEM KEAMANAN AKTIF</Text>
          </View>
          <Text style={styles.versionLabel}>V2.0 IoT</Text>
        </View>

        {/* ── Brand Hero Area ── */}
        <View style={styles.heroSection}>
          <View style={styles.logoContainer}>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.pulseRing,
                { transform: [{ scale: pulseAnim }] },
              ]}
            />
            <View style={styles.logoCenter}>
              <Image
                source={require('../../assets/logo.png')}
                style={{ width: 44, height: 44 }}
                resizeMode="contain"
              />
            </View>
          </View>

          <Text style={styles.appTitle}>PANIC BUTTON</Text>
          <Text style={styles.appSubtitle}>Smart Emergency Response System</Text>
        </View>

        {/* ── Interactive Feature Cards Carousel ── */}
        <View style={styles.carouselContainer}>
          <View style={styles.featureCard}>
            <View style={styles.featureHeader}>
              <View style={[styles.featureIconWrap, { backgroundColor: `${slide.iconColor}18` }]}>
                <Ionicons name={slide.icon} size={24} color={slide.iconColor} />
              </View>
              <View style={[styles.badgePill, { borderColor: `${slide.badgeColor}40`, backgroundColor: `${slide.badgeColor}12` }]}>
                <Text style={[styles.badgePillText, { color: slide.badgeColor }]}>{slide.badge}</Text>
              </View>
            </View>
            <Text style={styles.featureTitle}>{slide.title}</Text>
            <Text style={styles.featureDesc}>{slide.desc}</Text>
          </View>

          {/* Dots Indicator */}
          <View style={styles.dotsRow}>
            {SLIDES.map((_, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => setActiveSlide(idx)}
                style={[styles.dot, activeSlide === idx && styles.dotActive]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              />
            ))}
          </View>
        </View>

        {/* ── Quick Emergency Call Notice ── */}
        <View style={styles.urgentNoticeBox}>
          <View style={styles.urgentNoticeHead}>
            <Ionicons name="alert-circle" size={16} color={colors.warning} />
            <Text style={styles.urgentNoticeTitle}>Situasi Kritis Tanpa Akun?</Text>
          </View>
          <Text style={styles.urgentNoticeDesc}>
            Anda dapat langsung melakukan panggilan darurat resmi tanpa harus masuk akun:
          </Text>
          <View style={styles.hotlinesRow}>
            {EMERGENCY_HOTLINES.map((h) => (
              <TouchableOpacity
                key={h.number}
                style={[styles.hotlineChip, { borderColor: `${h.color}35` }]}
                onPress={() => handleCall(h.number)}
                activeOpacity={0.7}
              >
                <Ionicons name={h.icon} size={14} color={h.color} />
                <Text style={[styles.hotlineChipText, { color: h.color }]}>{h.number}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Main Action Buttons ── */}
        <View style={styles.actionsContainer}>
          {/* Tombol Masuk */}
          <PressableScale
            style={styles.btnLogin}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.88}
          >
            <Ionicons name="log-in-outline" size={20} color={colors.white} />
            <Text style={styles.btnLoginText}>Masuk ke Akun</Text>
          </PressableScale>

          {/* Tombol Buat Akun Baru */}
          <PressableScale
            style={styles.btnRegister}
            onPress={() => navigation.navigate('Register')}
            activeOpacity={0.88}
          >
            <Ionicons name="person-add-outline" size={19} color={colors.primary} />
            <Text style={styles.btnRegisterText}>Daftar Akun Warga Baru</Text>
          </PressableScale>
        </View>

        {/* ── Security Trust Footer ── */}
        <View style={styles.footerNote}>
          <Ionicons name="shield-checkmark-outline" size={14} color={colors.textMuted} />
          <Text style={styles.footerNoteText}>
            Enkripsi Realtime &bull; Terhubung ke Firebase RTDB &bull; IoT Ready
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? spacing.xl : spacing.lg,
    paddingBottom: spacing.xl,
    justifyContent: 'space-between',
  },

  // Top
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successBg,
    borderColor: colors.successBorder,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
    marginRight: 6,
  },
  liveText: {
    color: colors.success,
    fontSize: 10,
    fontWeight: text.bold,
    letterSpacing: 0.5,
  },
  versionLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: text.semibold,
  },

  // Hero
  heroSection: {
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  logoContainer: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  pulseRing: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(217,48,37,0.14)',
    borderWidth: 1.5,
    borderColor: 'rgba(217,48,37,0.3)',
    pointerEvents: 'none',
  },
  logoCenter: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: colors.primarySubtle,
    borderWidth: 1.5,
    borderColor: colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.red,
  },
  appTitle: {
    fontSize: 26,
    fontWeight: text.black,
    color: colors.textPrimary,
    letterSpacing: 2,
    textAlign: 'center',
  },
  appSubtitle: {
    fontSize: text.sm,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
    letterSpacing: 0.2,
  },

  // Feature Carousel
  carouselContainer: {
    marginVertical: spacing.md,
  },
  featureCard: {
    backgroundColor: colors.bgSurface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadows.md,
  },
  featureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  featureIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgePill: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  badgePillText: {
    fontSize: 10,
    fontWeight: text.bold,
    letterSpacing: 0.5,
  },
  featureTitle: {
    fontSize: text.lg,
    fontWeight: text.bold,
    color: colors.textPrimary,
    marginBottom: 6,
  },
  featureDesc: {
    fontSize: text.xs,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    width: 22,
    backgroundColor: colors.brandNavy,
  },

  // Urgent notice
  urgentNoticeBox: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginVertical: spacing.sm,
  },
  urgentNoticeHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  urgentNoticeTitle: {
    fontSize: text.xs,
    fontWeight: text.bold,
    color: colors.textPrimary,
  },
  urgentNoticeDesc: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 8,
    lineHeight: 16,
  },
  hotlinesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  hotlineChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: 7,
    gap: 5,
  },
  hotlineChipText: {
    fontSize: text.xs,
    fontWeight: text.bold,
  },

  // Actions
  actionsContainer: {
    gap: 10,
    marginTop: spacing.md,
  },
  btnLogin: {
    backgroundColor: colors.brandNavy,
    height: 50,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...shadows.sm,
  },
  btnLoginText: {
    color: colors.white,
    fontSize: text.base,
    fontWeight: text.bold,
    letterSpacing: 0.5,
  },
  btnRegister: {
    backgroundColor: colors.brandNavyBg,
    borderWidth: 1.5,
    borderColor: colors.brandNavyBorder,
    height: 50,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnRegisterText: {
    color: colors.brandNavy,
    fontSize: text.base,
    fontWeight: text.bold,
    letterSpacing: 0.3,
  },

  // Footer
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.md,
  },
  footerNoteText: {
    fontSize: 10,
    color: colors.textMuted,
  },
});
