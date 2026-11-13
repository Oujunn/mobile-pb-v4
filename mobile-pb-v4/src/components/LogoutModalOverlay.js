import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Image,
  Dimensions,
  Easing,
  Platform,
  BackHandler,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { colors, text, radius, spacing } from '../theme';

const { width } = Dimensions.get('window');

/**
 * LogoutModalOverlay
 * Official Web V3 inspired logout transition.
 * Uses an absolute full-screen root overlay (no native Dialog conflict).
 * Displays glowing pulsing logo halo, user farewell, and clean session wipe.
 */
export default function LogoutModalOverlay({
  visible = false,
  user = null,
  onAnimationComplete,
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const isCompletedRef = useRef(false);

  useEffect(() => {
    if (!visible) return;

    isCompletedRef.current = false;

    // 1. Block Android hardware back button during logout sequence
    const backSubscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => true
    );

    // 2. Entrance animation (fade + scale)
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 65,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // 3. Looping halo pulse (Web V3 logoutPulse replica)
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 950,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    // 4. Progress bar (1250ms duration)
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 1250,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      useNativeDriver: false,
    }).start();

    // 5. Timer to trigger completion & transition
    const timer = setTimeout(() => {
      if (!isCompletedRef.current) {
        isCompletedRef.current = true;
        pulseLoop.stop();

        // Exit fade
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          if (typeof onAnimationComplete === 'function') {
            onAnimationComplete();
          }
        });
      }
    }, 1350);

    return () => {
      clearTimeout(timer);
      pulseLoop.stop();
      backSubscription.remove();
    };
  }, [visible]);

  if (!visible) return null;

  // Pulse animation interpolation
  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1.0, 1.48],
  });

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [0.75, 0.35, 0.0],
  });

  const displayName = user?.name ? user.name.split(' ')[0] : 'Warga';

  return (
    <Animated.View
      style={[
        styles.overlayRoot,
        { opacity: fadeAnim },
      ]}
      pointerEvents="auto"
    >
      <StatusBar style="light" backgroundColor="transparent" translucent />
      <Animated.View
        style={[
          styles.card,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Glowing Pulse Logo Halo (Web V3 logoutPulse) */}
        <View style={styles.logoHaloWrapper}>
          <Animated.View
            style={[
              styles.pulseRing,
              {
                transform: [{ scale: pulseScale }],
                opacity: pulseOpacity,
              },
            ]}
          />
          <View style={styles.logoCircle}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logoImg}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Texts */}
        <Text style={styles.title}>Mengakhiri Sesi</Text>
        <Text style={styles.subtitle}>
          Sampai jumpa kembali, <Text style={styles.userName}>{displayName}</Text>
        </Text>

        {/* Progress Indicator */}
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>

        {/* Subtext info */}
        <Text style={styles.caption}>
          Membersihkan sesi lokal dan keamanan akun...
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlayRoot: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    zIndex: 999999,
    elevation: 999999,
  },
  card: {
    width: Math.min(width - 48, 340),
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xl,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.3,
        shadowRadius: 24,
      },
      android: {
        elevation: 20,
      },
      default: {
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
      },
    }),
  },
  logoHaloWrapper: {
    width: 104,
    height: 104,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    position: 'relative',
  },
  pulseRing: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: '#DC2626',
    backgroundColor: 'rgba(220, 38, 38, 0.22)',
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    borderWidth: 2.5,
    borderColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#DC2626',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
      default: {
        boxShadow: '0 4px 14px rgba(220, 38, 38, 0.4)',
      },
    }),
  },
  logoImg: {
    width: 54,
    height: 54,
  },
  title: {
    fontSize: text.lg,
    fontWeight: text.extrabold,
    color: colors.textPrimary,
    marginBottom: 4,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: text.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  userName: {
    fontWeight: text.bold,
    color: colors.brandNavy,
  },
  progressTrack: {
    width: '100%',
    height: 5,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.brandBlue,
    borderRadius: 3,
  },
  caption: {
    fontSize: text.xs,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
