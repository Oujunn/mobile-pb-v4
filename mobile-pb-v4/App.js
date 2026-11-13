import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Platform, TouchableOpacity, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import WelcomeScreen from './src/screens/WelcomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import PanicScreen from './src/screens/PanicScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import { colors, text, radius, shadows } from './src/theme';
import LogoutModalOverlay from './src/components/LogoutModalOverlay';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

/*
|--------------------------------------------------------------------------
| Panic-First 3-Tab Bottom Navigation
| 1. Panic (Initial Screen) · 2. Riwayat · 3. Profil
|--------------------------------------------------------------------------
*/
const TAB_SCREENS = [
  {
    name: 'PanicTab',
    component: PanicScreen,
    title: 'Panic Button',
    label: 'Panic',
    iconActive: 'alert-circle',
    iconInactive: 'alert-circle-outline',
    activeColor: colors.primary,
    activeBg: '#FEF2F2',
  },
  {
    name: 'HistoryTab',
    component: HistoryScreen,
    title: 'Riwayat Laporan',
    label: 'Riwayat',
    iconActive: 'time',
    iconInactive: 'time-outline',
    activeColor: colors.brandNavy,
    activeBg: '#EFF6FF',
  },
  {
    name: 'ProfileTab',
    component: ProfileScreen,
    title: 'Profil Pengguna',
    label: 'Profil',
    iconActive: 'person',
    iconInactive: 'person-outline',
    activeColor: colors.brandNavy,
    activeBg: '#EFF6FF',
  },
];

function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="PanicTab"
      screenOptions={({ route }) => {
        const screen = TAB_SCREENS.find((s) => s.name === route.name) || TAB_SCREENS[0];
        const isPanic = route.name === 'PanicTab';
        const activeColor = isPanic ? colors.primary : colors.brandNavy;
        const activeBg = isPanic ? '#FEF2F2' : '#EFF6FF';

        return {
          headerStyle: {
            backgroundColor: colors.bgSurface,
            borderBottomColor: colors.border,
            borderBottomWidth: 1,
          },
          headerTitleStyle: {
            color: colors.textPrimary,
            fontSize: text.base,
            fontWeight: text.semibold,
          },
          headerShadowVisible: false,
          headerTintColor: colors.textPrimary,
          tabBarStyle: {
            backgroundColor: colors.bgSurface,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            height: Platform.OS === 'ios' ? 84 : 66,
            paddingBottom: Platform.OS === 'ios' ? 24 : 8,
            paddingTop: 6,
            ...shadows.sm,
          },
          tabBarItemStyle: {
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 2,
          },
          tabBarActiveTintColor: activeColor,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: text.semibold,
            letterSpacing: 0.2,
            marginTop: 2,
          },
          tabBarHideOnKeyboard: true,
          tabBarIcon: ({ focused }) => (
            <View
              style={[
                focused ? styles.tabIconActiveWrap : styles.tabIconWrap,
                focused && isPanic && { backgroundColor: '#FEF2F2' },
              ]}
            >
              <Ionicons
                name={focused ? screen.iconActive : screen.iconInactive}
                size={20}
                color={focused ? activeColor : colors.textSecondary}
              />
            </View>
          ),
        };
      }}
    >
      {TAB_SCREENS.map((s) => (
        <Tab.Screen
          key={s.name}
          name={s.name}
          component={s.component}
          options={{ title: s.title, tabBarLabel: s.label }}
        />
      ))}
    </Tab.Navigator>
  );
}

function SplashScreen() {
  return (
    <View style={styles.splash}>
      <View style={styles.splashIconWrap}>
        <Image
          source={require('./assets/logo.png')}
          style={{ width: 44, height: 44 }}
          resizeMode="contain"
        />
      </View>
      <Text style={styles.splashTitle}>PANIC BUTTON</Text>
      <Text style={styles.splashSub}>Sistem Tanggap Darurat</Text>
      <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
    </View>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorBoundaryContainer}>
          <Ionicons name="alert-circle-outline" size={44} color={colors.danger} />
          <Text style={styles.errorBoundaryTitle}>Terjadi Kendala Memuat Layar</Text>
          <Text style={styles.errorBoundaryMsg}>
            {this.state.error?.message || 'Gagal memuat komponen.'}
          </Text>
          <TouchableOpacity
            style={styles.errorBoundaryBtn}
            onPress={() => this.setState({ hasError: false, error: null })}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={16} color={colors.white} />
            <Text style={styles.errorBoundaryBtnText}>Muat Ulang</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

function RootNavigator() {
  const { user, loading, isLoggingOut, loggingOutUser, finalizeLogout } = useAuth();

  if (loading) return <SplashScreen />;

  return (
    <View style={styles.appRoot}>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
            animation: 'fade_from_bottom',
          }}
        >
          {user ? (
            <Stack.Screen name="Main" component={MainTabs} />
          ) : (
            <>
              <Stack.Screen name="Welcome" component={WelcomeScreen} />
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>

      {/* Official Web V3 Logout Animation Overlay (Always rendered on top at root level) */}
      {isLoggingOut && (
        <LogoutModalOverlay
          visible={isLoggingOut}
          user={loggingOutUser}
          onAnimationComplete={finalizeLogout}
        />
      )}
    </View>
  );
}

export default function App() {
  const content = (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="dark" backgroundColor={colors.bg} />
          <RootNavigator />
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={styles.webBg}>
        <View style={styles.phoneMockup}>
          <View style={styles.phoneTopBar}>
            <View style={styles.phoneSpeaker} />
            <View style={styles.phoneCamera} />
          </View>
          <View style={styles.phoneScreen}>{content}</View>
          <View style={styles.phoneHomeBar} />
        </View>
      </View>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  // Splash
  splash: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: colors.primarySubtle,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  splashTitle: {
    fontSize: 24,
    fontWeight: text.bold,
    color: colors.textPrimary,
  },
  splashSub: {
    fontSize: text.sm,
    color: colors.textSecondary,
    marginTop: 6,
  },

  // Web mockup
  webBg: {
    flex: 1,
    minHeight: '100vh',
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  phoneMockup: {
    width: '100%',
    maxWidth: 390,
    height: '92vh',
    maxHeight: 844,
    backgroundColor: colors.bg,
    borderRadius: 52,
    borderWidth: 10,
    borderColor: '#2C2C2C',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.20,
    shadowRadius: 32,
    elevation: 16,
  },
  phoneTopBar: {
    height: 30,
    backgroundColor: '#1A1A1A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    alignSelf: 'center',
    paddingHorizontal: 20,
    zIndex: 10,
    marginTop: 2,
  },
  phoneSpeaker: {
    width: 52,
    height: 5,
    backgroundColor: '#333',
    borderRadius: 3,
  },
  phoneCamera: {
    width: 9,
    height: 9,
    backgroundColor: '#333',
    borderRadius: 5,
  },
  phoneScreen: { flex: 1, overflow: 'hidden' },
  phoneHomeBar: {
    height: 22,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Error Boundary
  errorBoundaryContainer: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorBoundaryTitle: {
    fontSize: text.base,
    fontWeight: text.bold,
    color: colors.textPrimary,
    marginTop: 12,
    marginBottom: 6,
    textAlign: 'center',
  },
  errorBoundaryMsg: {
    fontSize: text.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  errorBoundaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.brandNavy,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  errorBoundaryBtnText: {
    fontSize: text.xs,
    fontWeight: text.bold,
    color: colors.white,
  },

  // Tab Icon Pills
  tabIconActiveWrap: {
    width: 44,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconWrap: {
    width: 44,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  appRoot: {
    flex: 1,
    position: 'relative',
    width: '100%',
    height: '100%',
  },
});
