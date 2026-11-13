/*
|--------------------------------------------------------------------------
| Design System v3 — Panic Button Mobile
| UI/UX Pro Max Tokens: Accessible & Ethical, High Contrast, Panic-First
|--------------------------------------------------------------------------
*/

// ─── COLOR PALETTE ───────────────────────────────────────────────────────────
export const colors = {
  // Brand — Official Web V3 Navy & Safety Blue
  brandNavy:       '#173F70',
  brandNavyDark:   '#0F2B4D',
  brandNavyLight:  '#2563EB',
  brandNavyBg:     '#EFF6FF',
  brandNavyBorder: '#BFDBFE',
  brandBlue:       '#2563EB',
  brandBlueDark:   '#1D4ED8',
  brandBlueBg:     '#EFF6FF',
  brandBlueBorder: '#BFDBFE',

  // Primary — Alert / Emergency Red (WCAG AA 4.5:1 High Contrast)
  primary:       '#DC2626',
  primaryDark:   '#B91C1C',
  primaryLight:  '#EF4444',
  primarySubtle: 'rgba(220, 38, 38, 0.08)',
  primaryBorder: 'rgba(220, 38, 38, 0.22)',
  primaryShadow: 'rgba(220, 38, 38, 0.28)',

  // Module Theming (Matches Web V3)
  history:       '#4F46E5',
  historyBg:     '#EEF2FF',
  historyBorder: '#C7D2FE',

  profile:       '#0284C7',
  profileBg:     '#F0F9FF',
  profileBorder: '#BAE6FD',

  // Backgrounds (Clean modern slate canvas)
  bg:            '#F8FAFC',
  bgSurface:     '#FFFFFF',
  bgElevated:    '#F1F5F9',
  bgMuted:       '#E2E8F0',
  bgSubtle:      '#F1F5F9',

  // Text Hierarchy (Slate Palette for high legibility)
  textPrimary:   '#0F172A',
  textSecondary: '#475569',
  textMuted:     '#94A3B8',
  textInverse:   '#FFFFFF',

  // Borders & Dividers
  border:        '#E2E8F0',
  borderLight:   '#F1F5F9',
  borderSubtle:  '#F8FAFC',
  borderDark:    '#CBD5E1',

  // Base
  white: '#FFFFFF',
  black: '#000000',

  // Status Colors (Synchronized with Web V3)
  statusActive:       '#DC2626',
  statusActiveBg:     'rgba(220, 38, 38, 0.10)',
  statusActiveBorder: 'rgba(220, 38, 38, 0.25)',

  statusWaiting:       '#D97706',
  statusWaitingBg:     'rgba(217, 119, 6, 0.10)',
  statusWaitingBorder: 'rgba(217, 119, 6, 0.25)',

  statusProcess:       '#2563EB',
  statusProcessBg:     'rgba(37, 99, 235, 0.10)',
  statusProcessBorder: 'rgba(37, 99, 235, 0.25)',

  statusDone:       '#10B981',
  statusDoneBg:     'rgba(16, 185, 129, 0.10)',
  statusDoneBorder: 'rgba(16, 185, 129, 0.25)',

  // Semantic
  success:       '#10B981',
  successBg:     '#ECFDF5',
  successBorder: '#A7F3D0',

  warning:       '#D97706',
  warningBg:     '#FFFBEB',
  warningBorder: '#FDE68A',

  danger:        '#DC2626',
  dangerBg:      '#FEF2F2',
  dangerBorder:  '#FECACA',

  info:          '#2563EB',
  infoBg:        '#EFF6FF',
  infoBorder:    '#BFDBFE',
};

// ─── SPACING ─────────────────────────────────────────────────────────────────
export const spacing = {
  xxs: 2,
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
};

// ─── BORDER RADIUS ────────────────────────────────────────────────────────────
export const radius = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  28,
  full: 9999,
};

// ─── TYPOGRAPHY ──────────────────────────────────────────────────────────────
export const text = {
  // sizes
  xxs:  10,
  xs:   12,
  sm:   14,
  base: 16,
  lg:   18,
  xl:   20,
  xxl:  24,
  display: 28,
  hero: 38,
  // weights
  normal:    '400',
  medium:    '500',
  semibold:  '600',
  bold:      '700',
  extrabold: '800',
  black:     '900',
};

// ─── SHADOWS ─────────────────────────────────────────────────────────────────
export const shadows = {
  none: {},
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 5,
  },
  navy: {
    shadowColor: '#173F70',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 5,
  },
  red: {
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  redXl: {
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
};
