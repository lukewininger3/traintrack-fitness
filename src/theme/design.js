/**
 * TrainTracks Design System
 * Aesthetic: Brutalist Athletic
 *
 * High-contrast, energetic design with electric accents
 * against deep charcoal backgrounds. Bold typography
 * and dramatic spatial composition.
 */

export const COLORS = {
  // Backgrounds - Deep charcoal gradient
  background: {
    primary: '#0A0A0A',
    secondary: '#121212',
    tertiary: '#1A1A1A',
    elevated: '#1F1F1F',
  },

  // Accent - Electric Lime (energetic, athletic)
  accent: {
    primary: '#BFFF00',
    primaryDim: 'rgba(191, 255, 0, 0.15)',
    primaryGlow: 'rgba(191, 255, 0, 0.4)',
  },

  // Secondary Accent - Hot Coral (for alerts, achievements)
  secondary: {
    primary: '#FF6B35',
    dim: 'rgba(255, 107, 53, 0.15)',
  },

  // Tertiary - Electric Blue (for progress, charts)
  tertiary: {
    primary: '#00D4FF',
    dim: 'rgba(0, 212, 255, 0.15)',
  },

  // Text
  text: {
    primary: '#FFFFFF',
    secondary: '#A3A3A3',
    tertiary: '#666666',
    inverse: '#0A0A0A',
  },

  // States
  success: '#00FF88',
  warning: '#FFD600',
  error: '#FF3B3B',

  // Surfaces
  surface: {
    card: 'rgba(255, 255, 255, 0.03)',
    cardHover: 'rgba(255, 255, 255, 0.06)',
    border: 'rgba(255, 255, 255, 0.08)',
    borderAccent: 'rgba(191, 255, 0, 0.3)',
  },

  // Workout type colors
  workoutTypes: {
    Strength: '#BFFF00',
    Running: '#00FF88',
    Cycling: '#00D4FF',
    Swimming: '#00D4FF',
    Other: '#A3A3A3',
  },
};

export const TYPOGRAPHY = {
  // Display - Bold, condensed (athletic feel)
  display: {
    fontWeight: '800',
    letterSpacing: -1,
  },

  // Headings
  h1: {
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1.5,
    lineHeight: 44,
  },
  h2: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  h3: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 24,
  },
  h4: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
    lineHeight: 20,
  },

  // Body
  body: {
    fontSize: 15,
    fontWeight: '400',
    letterSpacing: 0.1,
    lineHeight: 22,
  },
  bodyBold: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.1,
    lineHeight: 22,
  },

  // Small
  caption: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.5,
    lineHeight: 16,
  },

  // Labels - Uppercase, tracked
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  // Numbers - Tabular for data
  stat: {
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -2,
    lineHeight: 48,
  },
  statMedium: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 32,
  },
  statSmall: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 24,
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const RADIUS = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: {
    shadowColor: COLORS.accent.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
};

// Common component styles
export const COMPONENTS = {
  // Card base
  card: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.lg,
  },

  // Accent card (highlighted)
  cardAccent: {
    backgroundColor: COLORS.accent.primaryDim,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.surface.borderAccent,
    padding: SPACING.lg,
  },

  // Button primary
  buttonPrimary: {
    backgroundColor: COLORS.accent.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },

  // Input
  input: {
    backgroundColor: COLORS.background.elevated,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.body.fontSize,
  },

  // Badge
  badge: {
    backgroundColor: COLORS.accent.primaryDim,
    borderRadius: RADIUS.full,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
};

// Animation configs
export const ANIMATIONS = {
  spring: {
    damping: 15,
    stiffness: 150,
    mass: 1,
  },
  timing: {
    duration: 200,
  },
};

export default {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
  COMPONENTS,
  ANIMATIONS,
};
