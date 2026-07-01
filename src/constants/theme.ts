export const colors = {
  background: '#0b1120',
  backgroundSecondary: '#0f172a',
  surface: '#1e293b',
  surfaceLight: '#334155',
  card: 'rgba(30, 41, 59, 0.85)',
  cardBorder: 'rgba(148, 163, 184, 0.12)',
  glass: 'rgba(15, 23, 42, 0.72)',
  glassBorder: 'rgba(148, 163, 184, 0.18)',

  primary: '#3b82f6',
  primaryDark: '#2563eb',
  primaryLight: '#60a5fa',
  accent: '#facc15',
  accentDark: '#eab308',

  slate: '#94a3b8',
  slateDark: '#64748b',
  slateLight: '#cbd5e1',
  text: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',

  pass: '#22c55e',
  passBg: 'rgba(34, 197, 94, 0.15)',
  reject: '#ef4444',
  rejectBg: 'rgba(239, 68, 68, 0.15)',
  review: '#f59e0b',
  reviewBg: 'rgba(245, 158, 11, 0.15)',

  inventoryBlock: '#ef4444',
  inventoryBlockBg: 'rgba(239, 68, 68, 0.12)',
  availableSale: '#22c55e',
  availableSaleBg: 'rgba(34, 197, 94, 0.12)',
  pendingReview: '#f59e0b',
  pendingReviewBg: 'rgba(245, 158, 11, 0.12)',

  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
  overlay: 'rgba(0, 0, 0, 0.5)',
};

/** Shared screen gradient — matches login & home dashboard */
export const screenBackground = {
  gradientColors: ['#0b1120', '#0f172a', '#1e3a5f', '#0f172a'] as const,
  gradientLocations: [0, 0.3, 0.7, 1] as const,
  glowBlue: {
    top: -100,
    right: -80,
    size: 280,
    color: 'rgba(59, 130, 246, 0.12)',
  },
  glowYellow: {
    bottom: 60,
    left: -60,
    size: 200,
    color: 'rgba(250, 204, 21, 0.08)',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  button: {
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
};

export const paperTheme = {
  dark: true,
  colors: {
    primary: colors.primary,
    onPrimary: colors.white,
    primaryContainer: colors.primaryDark,
    secondary: colors.accent,
    onSecondary: colors.background,
    background: colors.background,
    surface: colors.surface,
    surfaceVariant: colors.surfaceLight,
    onSurface: colors.text,
    onSurfaceVariant: colors.textSecondary,
    outline: colors.cardBorder,
    error: colors.reject,
  },
  roundness: borderRadius.md,
};
