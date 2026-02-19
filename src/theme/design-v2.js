/**
 * TrainTrack Design System v2
 * Aesthetic: Premium Dark Earth
 *
 * Improved contrast, depth, and visual hierarchy.
 * Maintains warm earth tones with stronger surface separation.
 */

// ============================================
// COLOR SYSTEM
// ============================================

export const COLORS = {
  // Backgrounds - Increased contrast between levels
  background: {
    primary: '#0A0908',      // Deeper black (was #0F0E0D)
    secondary: '#141312',    // Card backgrounds - more contrast
    tertiary: '#1E1C1A',     // Elevated surfaces
    elevated: '#242220',     // Modals, sheets, overlays
  },

  // Accent - Terracotta/Clay (slightly more saturated)
  accent: {
    primary: '#D4A574',      // Warmer, more visible clay
    secondary: '#B8956A',    // For secondary accents
    dim: 'rgba(212, 165, 116, 0.12)',
    glow: 'rgba(212, 165, 116, 0.20)',
    muted: 'rgba(212, 165, 116, 0.08)', // Very subtle backgrounds
  },

  // Secondary - Sage Green (more vibrant)
  secondary: {
    primary: '#9AAF8B',      // Cleaner sage
    dim: 'rgba(154, 175, 139, 0.12)',
    muted: 'rgba(154, 175, 139, 0.08)',
  },

  // Tertiary - Warm Taupe
  tertiary: {
    primary: '#8A7D73',      // Slightly lighter for visibility
    dim: 'rgba(138, 125, 115, 0.12)',
  },

  // Text - Stronger hierarchy
  text: {
    primary: '#F8F6F3',      // Warmer, brighter white
    secondary: '#9A958F',    // Clear secondary (was too close to tertiary)
    tertiary: '#5C5650',     // Muted but visible
    disabled: '#3D3935',     // Clear disabled state
    inverse: '#0A0908',      // For buttons
  },

  // Semantic Colors - Earth-tone aligned
  status: {
    success: '#9AAF8B',      // Sage green (matches secondary)
    successDim: 'rgba(154, 175, 139, 0.15)',
    warning: '#D4A574',      // Clay (matches accent)
    warningDim: 'rgba(212, 165, 116, 0.15)',
    error: '#C4766A',        // Muted terracotta
    errorDim: 'rgba(196, 118, 106, 0.15)',
    info: '#7A9AA8',         // Muted slate blue
    infoDim: 'rgba(122, 154, 168, 0.15)',
  },

  // Surfaces - Clear hierarchy
  surface: {
    card: '#161413',         // Distinct from background
    cardHover: '#1E1C1A',    // Clear hover state
    cardActive: '#242220',   // Active/selected state
    border: '#2A2725',       // Subtle but visible
    borderLight: '#363330',  // Lighter variant
    borderAccent: 'rgba(212, 165, 116, 0.25)',
    divider: '#1E1C1A',      // Section dividers
  },

  // Workout Type Colors - Cohesive palette
  workoutTypes: {
    Strength: '#D4A574',     // Clay
    Running: '#9AAF8B',      // Sage
    Cycling: '#8A7D73',      // Taupe
    Swimming: '#7A9AA8',     // Slate blue
    HIIT: '#C4766A',         // Terracotta
    Yoga: '#A89AAF',         // Muted lavender
    Other: '#9A958F',        // Stone
  },

  // Overlays
  overlay: {
    light: 'rgba(10, 9, 8, 0.5)',
    medium: 'rgba(10, 9, 8, 0.7)',
    heavy: 'rgba(10, 9, 8, 0.85)',
  },
};

// ============================================
// TYPOGRAPHY SYSTEM
// ============================================

export const TYPOGRAPHY = {
  // Display - Hero text
  display: {
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -2,
    lineHeight: 52,
  },

  // Headings - Clear hierarchy
  h1: {
    fontSize: 32,            // Reduced from 40 for mobile
    fontWeight: '700',
    letterSpacing: -1,
    lineHeight: 38,
  },
  h2: {
    fontSize: 24,            // Reduced from 28
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  h3: {
    fontSize: 18,            // Reduced from 20
    fontWeight: '600',
    letterSpacing: -0.3,
    lineHeight: 24,
  },
  h4: {
    fontSize: 15,            // Reduced from 16
    fontWeight: '600',
    letterSpacing: 0,
    lineHeight: 20,
  },

  // Body
  body: {
    fontSize: 15,
    fontWeight: '400',
    letterSpacing: 0.1,
    lineHeight: 22,
  },
  bodyMedium: {
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 0.1,
    lineHeight: 22,
  },
  bodyBold: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0,
    lineHeight: 22,
  },

  // Small text
  caption: {
    fontSize: 13,            // Increased from 12 for readability
    fontWeight: '500',
    letterSpacing: 0.2,
    lineHeight: 18,
  },
  captionSmall: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.3,
    lineHeight: 14,
  },

  // Labels - Uppercase
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  labelLarge: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  // Stats/Numbers
  stat: {
    fontSize: 40,            // Reduced from 48
    fontWeight: '700',
    letterSpacing: -1.5,
    lineHeight: 44,
    fontVariant: ['tabular-nums'],
  },
  statMedium: {
    fontSize: 28,            // Reduced from 32
    fontWeight: '700',
    letterSpacing: -1,
    lineHeight: 32,
    fontVariant: ['tabular-nums'],
  },
  statSmall: {
    fontSize: 20,            // Reduced from 24
    fontWeight: '600',
    letterSpacing: -0.5,
    lineHeight: 24,
    fontVariant: ['tabular-nums'],
  },

  // Buttons
  button: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
    lineHeight: 20,
  },
  buttonSmall: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
    lineHeight: 18,
  },
};

// ============================================
// SPACING SYSTEM (8pt base)
// ============================================

export const SPACING = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  xxxxl: 64,

  // Semantic spacing
  cardPadding: 16,
  sectionGap: 24,
  screenPadding: 20,  // Slightly more than 16 for breathing room
  listItemGap: 12,
  inlineGap: 8,
};

// ============================================
// RADIUS SYSTEM
// ============================================

export const RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

// ============================================
// SHADOWS & ELEVATION
// ============================================

export const SHADOWS = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
  },
  // Accent glow - for highlighted elements
  glow: {
    shadowColor: '#D4A574',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  // Inner shadow effect (for pressed states)
  inner: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 0,
  },
};

// ============================================
// COMPONENT PRESETS
// ============================================

export const COMPONENTS = {
  // Card variants
  card: {
    base: {
      backgroundColor: COLORS.surface.card,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: COLORS.surface.border,
      padding: SPACING.cardPadding,
    },
    elevated: {
      backgroundColor: COLORS.background.elevated,
      borderRadius: RADIUS.lg,
      borderWidth: 0,
      padding: SPACING.cardPadding,
      ...SHADOWS.md,
    },
    accent: {
      backgroundColor: COLORS.accent.muted,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: COLORS.surface.borderAccent,
      padding: SPACING.cardPadding,
    },
    interactive: {
      backgroundColor: COLORS.surface.card,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: COLORS.surface.border,
      padding: SPACING.cardPadding,
      // Hover/press handled via animation
    },
  },

  // Button variants
  button: {
    primary: {
      backgroundColor: COLORS.accent.primary,
      borderRadius: RADIUS.md,
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.xl,
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondary: {
      backgroundColor: COLORS.surface.card,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: COLORS.surface.borderLight,
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.xl,
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ghost: {
      backgroundColor: 'transparent',
      borderRadius: RADIUS.md,
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.lg,
      minHeight: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    icon: {
      backgroundColor: COLORS.surface.card,
      borderRadius: RADIUS.md,
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
  },

  // Input
  input: {
    base: {
      backgroundColor: COLORS.background.tertiary,
      borderRadius: RADIUS.md,
      borderWidth: 1.5,
      borderColor: COLORS.surface.border,
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.lg,
      color: COLORS.text.primary,
      fontSize: TYPOGRAPHY.body.fontSize,
      minHeight: 48,
    },
    focused: {
      borderColor: COLORS.accent.primary,
    },
    error: {
      borderColor: COLORS.status.error,
    },
  },

  // Badge
  badge: {
    base: {
      borderRadius: RADIUS.full,
      paddingVertical: SPACING.xs,
      paddingHorizontal: SPACING.sm,
    },
    count: {
      minWidth: 22,
      height: 22,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
    },
  },

  // List item
  listItem: {
    base: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.lg,
      gap: SPACING.md,
    },
    divider: {
      height: 1,
      backgroundColor: COLORS.surface.divider,
      marginLeft: SPACING.lg,
    },
  },

  // Section header
  sectionHeader: {
    paddingHorizontal: SPACING.screenPadding,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
  },

  // Bottom sheet
  bottomSheet: {
    backgroundColor: COLORS.background.elevated,
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    paddingTop: SPACING.md,
    ...SHADOWS.xl,
  },

  // Modal
  modal: {
    backgroundColor: COLORS.background.elevated,
    borderRadius: RADIUS.xl,
    ...SHADOWS.xl,
  },
};

// ============================================
// ANIMATION PRESETS
// ============================================

export const ANIMATIONS = {
  // Spring configs
  spring: {
    default: {
      damping: 20,
      stiffness: 300,
      mass: 0.8,
    },
    gentle: {
      damping: 25,
      stiffness: 200,
      mass: 1,
    },
    bouncy: {
      damping: 12,
      stiffness: 180,
      mass: 0.8,
    },
    stiff: {
      damping: 30,
      stiffness: 400,
      mass: 0.6,
    },
  },

  // Timing configs
  timing: {
    fast: 150,
    default: 250,
    slow: 400,
    entrance: 350,
    exit: 200,
  },

  // Scale values
  scale: {
    pressed: 0.97,
    pressedSmall: 0.95,
    hover: 1.02,
    active: 1.05,
  },
};

// ============================================
// SAFE AREAS
// ============================================

export const SAFE_AREAS = {
  // Use these with useSafeAreaInsets()
  statusBarHeight: 44,  // iOS default, use insets.top
  homeIndicator: 34,    // iOS home indicator, use insets.bottom
  tabBarHeight: 49,     // Standard tab bar
};

// ============================================
// Z-INDEX SCALE
// ============================================

export const Z_INDEX = {
  base: 0,
  dropdown: 100,
  sticky: 200,
  overlay: 300,
  modal: 400,
  popover: 500,
  tooltip: 600,
  toast: 700,
};

export default {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
  COMPONENTS,
  ANIMATIONS,
  SAFE_AREAS,
  Z_INDEX,
};
