/**
 * TrainTrack Design System
 *
 * Brutalist Athletic aesthetic with electric lime accents.
 * Supports dark and light modes with distinct activity colors.
 */

// Helper to create rgba from hex
const hexToRgba = (hex, alpha) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/**
 * ACTIVITY COLORS - Distinct colors for each workout type
 * Each activity has: primary, muted (dark bg), mutedLight (light bg), accent
 */
export const ACTIVITY_COLORS = {
  Strength: {
    primary: '#BFFF00',      // Electric Lime - power, energy
    muted: '#2A3D00',
    mutedLight: '#F0FFC2',
    accent: '#D4FF4D',
  },
  Running: {
    primary: '#FF6B35',      // Hot Coral - warm, cardio intensity
    muted: '#3D1F12',
    mutedLight: '#FFE4DB',
    accent: '#FF8A5C',
  },
  Cycling: {
    primary: '#00D4FF',      // Electric Blue - speed, cool
    muted: '#003844',
    mutedLight: '#D6F7FF',
    accent: '#4DE1FF',
  },
  Swimming: {
    primary: '#14B8A6',      // Teal - aquatic, distinct from cycling
    muted: '#123735',
    mutedLight: '#CCFBF1',
    accent: '#2DD4BF',
  },
  Other: {
    primary: '#A78BFA',      // Purple/Violet - neutral category
    muted: '#2D2154',
    mutedLight: '#EDE9FE',
    accent: '#C4B5FD',
  },
};

/**
 * DARK THEME COLORS
 * Deep charcoal backgrounds with electric lime accent
 */
export const DARK_COLORS = {
  // Backgrounds - Deep charcoal
  background: {
    primary: '#0A0A0A',      // Main app background
    secondary: '#121212',    // Cards, elevated surfaces
    tertiary: '#1A1A1A',     // Inputs, nested elements
    elevated: '#1F1F1F',     // Modals, sheets
  },

  // Accent - Electric Lime (energetic, athletic)
  accent: {
    primary: '#BFFF00',
    secondary: '#A3E600',
    primaryDim: hexToRgba('#BFFF00', 0.15),
    primaryGlow: hexToRgba('#BFFF00', 0.40),
    muted: hexToRgba('#BFFF00', 0.08),
  },

  // Secondary - Hot Coral (for highlights, achievements)
  secondary: {
    primary: '#FF6B35',
    dim: hexToRgba('#FF6B35', 0.15),
    muted: hexToRgba('#FF6B35', 0.10),
  },

  // Tertiary - Electric Blue (for progress, charts)
  tertiary: {
    primary: '#00D4FF',
    dim: hexToRgba('#00D4FF', 0.15),
  },

  // Text - High contrast for readability
  text: {
    primary: '#FFFFFF',      // Main text - pure white
    secondary: '#A3A3A3',    // Secondary text - medium gray
    tertiary: '#666666',     // Muted text - darker gray
    disabled: '#4B5563',     // Disabled text
    inverse: '#0A0A0A',      // For light/accent backgrounds
  },

  // State colors - Vibrant
  success: '#00FF88',
  successDim: hexToRgba('#00FF88', 0.15),
  warning: '#FFD600',
  warningDim: hexToRgba('#FFD600', 0.15),
  error: '#FF3B3B',
  errorDim: hexToRgba('#FF3B3B', 0.15),

  // Streak color - gold to match lightning symbol
  streak: '#FFD600',
  streakDim: hexToRgba('#FFD600', 0.15),

  // Surfaces
  surface: {
    card: 'rgba(255, 255, 255, 0.03)',
    cardHover: 'rgba(255, 255, 255, 0.06)',
    cardActive: 'rgba(255, 255, 255, 0.10)',
    border: 'rgba(255, 255, 255, 0.08)',
    borderLight: 'rgba(255, 255, 255, 0.05)',
    borderAccent: hexToRgba('#BFFF00', 0.30),
    divider: 'rgba(255, 255, 255, 0.06)',
    elevated: '#1F1F1F',
  },

  // Overlays
  overlay: {
    light: 'rgba(10, 10, 10, 0.5)',
    medium: 'rgba(10, 10, 10, 0.7)',
    heavy: 'rgba(10, 10, 10, 0.85)',
  },

  // Workout types - mapped to activity colors
  workoutTypes: {
    Strength: ACTIVITY_COLORS.Strength.primary,
    Running: ACTIVITY_COLORS.Running.primary,
    Cycling: ACTIVITY_COLORS.Cycling.primary,
    Swimming: ACTIVITY_COLORS.Swimming.primary,
    Other: ACTIVITY_COLORS.Other.primary,
  },

  // Activity colors with full palette access
  activity: ACTIVITY_COLORS,
};

/**
 * LIGHT THEME COLORS
 * Clean whites with dark accents for readability
 */
export const LIGHT_COLORS = {
  // Backgrounds - Clean whites
  background: {
    primary: '#F5F5F5',      // Main app background
    secondary: '#FFFFFF',    // Cards, elevated surfaces
    tertiary: '#EBEBEB',     // Inputs, nested elements
    elevated: '#FFFFFF',     // Modals, sheets
  },

  // Accent - Darker lime green (visible on white, same hue as dark mode)
  accent: {
    primary: '#65A30D',
    secondary: '#4D7C0F',
    primaryDim: hexToRgba('#65A30D', 0.15),
    primaryGlow: hexToRgba('#65A30D', 0.25),
    muted: hexToRgba('#65A30D', 0.10),
  },

  // Secondary - Darker coral (visible on white, same hue as dark mode)
  secondary: {
    primary: '#EA580C',
    dim: hexToRgba('#EA580C', 0.15),
    muted: hexToRgba('#EA580C', 0.10),
  },

  // Tertiary - Darker cyan (visible on white, same hue as dark mode)
  tertiary: {
    primary: '#0891B2',
    dim: hexToRgba('#0891B2', 0.15),
  },

  // Text - Dark for readability
  text: {
    primary: '#0A0A0A',      // Main text - near black
    secondary: '#525252',    // Secondary text
    tertiary: '#A3A3A3',     // Muted text
    disabled: '#D4D4D4',     // Disabled text
    inverse: '#FFFFFF',      // For accent backgrounds (white text on darker green)
  },

  // State colors - Darker shades (visible on white, same hue as dark mode)
  success: '#16A34A',
  successDim: hexToRgba('#16A34A', 0.15),
  warning: '#CA8A04',
  warningDim: hexToRgba('#CA8A04', 0.15),
  error: '#DC2626',
  errorDim: hexToRgba('#DC2626', 0.15),

  // Streak color - darker gold (visible on white, same hue as dark mode)
  streak: '#CA8A04',
  streakDim: hexToRgba('#CA8A04', 0.15),

  // Surfaces
  surface: {
    card: '#FFFFFF',
    cardHover: '#FAFAFA',
    cardActive: '#F5F5F5',
    border: '#E5E5E5',
    borderLight: '#F0F0F0',
    borderAccent: hexToRgba('#65A30D', 0.30),
    divider: '#E5E5E5',
    elevated: '#FFFFFF',
  },

  // Overlays
  overlay: {
    light: 'rgba(10, 10, 10, 0.3)',
    medium: 'rgba(10, 10, 10, 0.5)',
    heavy: 'rgba(10, 10, 10, 0.7)',
  },

  // Workout types - darker shades visible on white (same hue as dark mode)
  workoutTypes: {
    Strength: '#65A30D',     // Darker lime
    Running: '#EA580C',      // Darker coral
    Cycling: '#0891B2',      // Darker cyan
    Swimming: '#0D9488',     // Darker teal
    Other: '#7C3AED',        // Darker violet
  },

  // Activity colors - same as dark mode with light muted backgrounds
  activity: {
    Strength: {
      ...ACTIVITY_COLORS.Strength,
      muted: ACTIVITY_COLORS.Strength.mutedLight,
    },
    Running: {
      ...ACTIVITY_COLORS.Running,
      muted: ACTIVITY_COLORS.Running.mutedLight,
    },
    Cycling: {
      ...ACTIVITY_COLORS.Cycling,
      muted: ACTIVITY_COLORS.Cycling.mutedLight,
    },
    Swimming: {
      ...ACTIVITY_COLORS.Swimming,
      muted: ACTIVITY_COLORS.Swimming.mutedLight,
    },
    Other: {
      ...ACTIVITY_COLORS.Other,
      muted: ACTIVITY_COLORS.Other.mutedLight,
    },
  },
};

// Default to dark theme - this will be overridden by ThemeContext
export let COLORS = DARK_COLORS;

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
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  glow: {
    shadowColor: '#BFFF00',
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
    backgroundColor: COLORS.background.tertiary,
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
