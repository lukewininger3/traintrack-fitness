import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import { TYPOGRAPHY, SPACING, RADIUS } from '../../theme/design';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * Badge Component
 *
 * Types:
 * - count: Circular count badge (e.g., notification count)
 * - status: Status indicator with positive/negative/neutral states
 * - label: Pill-shaped label badge
 * - tier: Achievement tier badge (bronze, silver, gold, etc.)
 *
 * @param {string|number} value - Badge content
 * @param {string} type - 'count' | 'status' | 'label' | 'tier'
 * @param {string} variant - For status: 'positive' | 'negative' | 'neutral' | 'warning'
 *                           For tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'
 * @param {string} color - Custom background color (optional)
 * @param {string} textColor - Custom text color (optional)
 * @param {string} size - 'sm' | 'md' | 'lg'
 * @param {React.ReactNode} icon - Icon element (optional)
 * @param {boolean} pulse - Enable pulse animation (for count badges)
 * @param {object} style - Additional styles
 */
export function Badge({
  value,
  type = 'label',
  variant,
  color,
  textColor,
  size = 'md',
  icon,
  pulse = false,
  style,
}) {
  const { colors: themeColors } = useTheme();
  const scale = useSharedValue(1);

  // Pulse animation effect
  React.useEffect(() => {
    if (pulse) {
      scale.value = withSequence(
        withSpring(1.2, { damping: 10 }),
        withSpring(1, { damping: 15 })
      );
    }
  }, [value, pulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const typeStyles = getTypeStyles(type, variant, color, textColor, themeColors);
  const sizeStyles = getSizeStyles(type, size);

  return (
    <Animated.View
      style={[
        styles.base,
        typeStyles.container,
        sizeStyles.container,
        animatedStyle,
        style,
      ]}
    >
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      {value !== undefined && value !== null && (
        <Text
          style={[
            styles.text,
            typeStyles.text,
            sizeStyles.text,
            icon && styles.textWithIcon,
          ]}
        >
          {value}
        </Text>
      )}
    </Animated.View>
  );
}

function getTypeStyles(type, variant, customColor, customTextColor, themeColors) {
  const baseStyles = {
    container: {},
    text: {},
  };

  switch (type) {
    case 'count':
      return {
        container: {
          backgroundColor: customColor || themeColors.accent.primary,
          ...styles.countContainer,
        },
        text: {
          color: customTextColor || themeColors.text.inverse,
          fontWeight: '700',
        },
      };

    case 'status':
      const statusColors = getStatusColors(variant, themeColors);
      return {
        container: {
          backgroundColor: customColor || statusColors.bg,
          borderWidth: 1,
          borderColor: statusColors.border,
        },
        text: {
          color: customTextColor || statusColors.text,
        },
      };

    case 'tier':
      const tierColors = getTierColors(variant, themeColors);
      return {
        container: {
          backgroundColor: tierColors.bg,
          borderWidth: 1,
          borderColor: tierColors.border,
        },
        text: {
          color: tierColors.text,
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
      };

    case 'label':
    default:
      return {
        container: {
          backgroundColor: customColor || themeColors.accent.primaryDim,
        },
        text: {
          color: customTextColor || themeColors.accent.primary,
        },
      };
  }
}

function getStatusColors(variant, themeColors) {
  switch (variant) {
    case 'positive':
      return {
        bg: themeColors.successDim,
        border: themeColors.success + '40',
        text: themeColors.success,
      };
    case 'negative':
      return {
        bg: themeColors.errorDim,
        border: themeColors.error + '40',
        text: themeColors.error,
      };
    case 'warning':
      return {
        bg: themeColors.warningDim,
        border: themeColors.warning + '40',
        text: themeColors.warning,
      };
    case 'neutral':
    default:
      return {
        bg: themeColors.surface.card,
        border: themeColors.surface.border,
        text: themeColors.text.secondary,
      };
  }
}

function getTierColors(variant, themeColors) {
  // Modern metallic tier system that works in both themes
  switch (variant) {
    case 'bronze':
      return {
        bg: 'rgba(205, 127, 50, 0.15)',
        border: 'rgba(205, 127, 50, 0.4)',
        text: '#CD7F32',
      };
    case 'silver':
      return {
        bg: 'rgba(168, 162, 158, 0.15)',
        border: 'rgba(168, 162, 158, 0.4)',
        text: '#A8A29E',
      };
    case 'gold':
      return {
        bg: 'rgba(212, 175, 55, 0.15)',
        border: 'rgba(212, 175, 55, 0.4)',
        text: '#D4AF37',
      };
    case 'platinum':
      return {
        bg: 'rgba(139, 154, 123, 0.15)',
        border: 'rgba(139, 154, 123, 0.4)',
        text: '#8B9A7B',
      };
    case 'diamond':
      return {
        bg: 'rgba(185, 242, 255, 0.15)',
        border: 'rgba(185, 242, 255, 0.3)',
        text: '#B9F2FF',
      };
    default:
      return {
        bg: themeColors.surface.card,
        border: themeColors.surface.border,
        text: themeColors.text.secondary,
      };
  }
}

function getSizeStyles(type, size) {
  const isCount = type === 'count';

  switch (size) {
    case 'sm':
      return {
        container: isCount
          ? { minWidth: 18, height: 18, paddingHorizontal: 4 }
          : { paddingVertical: 2, paddingHorizontal: SPACING.sm },
        text: { fontSize: 10 },
      };
    case 'lg':
      return {
        container: isCount
          ? { minWidth: 28, height: 28, paddingHorizontal: 8 }
          : { paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md },
        text: { fontSize: 14 },
      };
    case 'md':
    default:
      return {
        container: isCount
          ? { minWidth: 22, height: 22, paddingHorizontal: 6 }
          : { paddingVertical: SPACING.xs, paddingHorizontal: SPACING.sm },
        text: { fontSize: 12 },
      };
  }
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.full,
  },
  countContainer: {
    borderRadius: RADIUS.full,
  },
  text: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
  },
  iconContainer: {
    marginRight: 4,
  },
  textWithIcon: {
    marginLeft: 2,
  },
});

export default Badge;
