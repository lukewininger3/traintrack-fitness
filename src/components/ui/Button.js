import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, ANIMATIONS } from '../../theme/design';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Button Component
 *
 * Variants:
 * - primary: Electric lime accent (default)
 * - secondary: Surface card background
 * - outline: Transparent with border
 * - ghost: No background, text only
 *
 * @param {string} title - Button text
 * @param {function} onPress - Press handler
 * @param {string} variant - 'primary' | 'secondary' | 'outline' | 'ghost'
 * @param {boolean} disabled - Disable button
 * @param {boolean} loading - Show loading spinner
 * @param {React.ReactNode} icon - Icon element to render
 * @param {string} iconPosition - 'left' | 'right'
 * @param {string} size - 'sm' | 'md' | 'lg'
 * @param {boolean} fullWidth - Take full container width
 * @param {boolean} haptic - Enable haptic feedback (default: true)
 * @param {object} style - Additional container styles
 */
export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  size = 'md',
  fullWidth = false,
  haptic = true,
  style,
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, ANIMATIONS.spring);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, ANIMATIONS.spring);
  };

  const handlePress = () => {
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.();
  };

  const variantStyles = getVariantStyles(variant);
  const sizeStyles = getSizeStyles(size);
  const isDisabled = disabled || loading;

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      style={[
        styles.base,
        variantStyles.container,
        sizeStyles.container,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        animatedStyle,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variantStyles.textColor}
        />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <React.Fragment>{icon}</React.Fragment>
          )}
          {title && (
            <Text
              style={[
                styles.text,
                variantStyles.text,
                sizeStyles.text,
                icon && iconPosition === 'left' && styles.textWithLeftIcon,
                icon && iconPosition === 'right' && styles.textWithRightIcon,
              ]}
            >
              {title}
            </Text>
          )}
          {icon && iconPosition === 'right' && (
            <React.Fragment>{icon}</React.Fragment>
          )}
        </>
      )}
    </AnimatedPressable>
  );
}

function getVariantStyles(variant) {
  switch (variant) {
    case 'secondary':
      return {
        container: styles.secondaryContainer,
        text: styles.secondaryText,
        textColor: COLORS.text.primary,
      };
    case 'outline':
      return {
        container: styles.outlineContainer,
        text: styles.outlineText,
        textColor: COLORS.text.primary,
      };
    case 'ghost':
      return {
        container: styles.ghostContainer,
        text: styles.ghostText,
        textColor: COLORS.text.secondary,
      };
    case 'danger':
      return {
        container: styles.dangerContainer,
        text: styles.dangerText,
        textColor: COLORS.text.primary,
      };
    case 'primary':
    default:
      return {
        container: styles.primaryContainer,
        text: styles.primaryText,
        textColor: COLORS.text.inverse,
      };
  }
}

function getSizeStyles(size) {
  switch (size) {
    case 'sm':
      return {
        container: styles.smContainer,
        text: styles.smText,
      };
    case 'lg':
      return {
        container: styles.lgContainer,
        text: styles.lgText,
      };
    case 'md':
    default:
      return {
        container: styles.mdContainer,
        text: styles.mdText,
      };
  }
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontWeight: '600',
  },
  textWithLeftIcon: {
    marginLeft: SPACING.sm,
  },
  textWithRightIcon: {
    marginRight: SPACING.sm,
  },

  // Primary variant
  primaryContainer: {
    backgroundColor: COLORS.accent.primary,
    ...SHADOWS.md,
  },
  primaryText: {
    color: COLORS.text.inverse,
  },

  // Secondary variant
  secondaryContainer: {
    backgroundColor: COLORS.surface.card,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
  },
  secondaryText: {
    color: COLORS.text.primary,
  },

  // Outline variant
  outlineContainer: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.surface.border,
  },
  outlineText: {
    color: COLORS.text.primary,
  },

  // Ghost variant
  ghostContainer: {
    backgroundColor: 'transparent',
  },
  ghostText: {
    color: COLORS.text.secondary,
  },

  // Danger variant
  dangerContainer: {
    backgroundColor: COLORS.error,
    ...SHADOWS.md,
  },
  dangerText: {
    color: COLORS.text.primary,
  },

  // Size: small
  smContainer: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  smText: {
    fontSize: 13,
  },

  // Size: medium (default)
  mdContainer: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  mdText: {
    fontSize: 15,
  },

  // Size: large
  lgContainer: {
    paddingVertical: SPACING.lg - 4,
    paddingHorizontal: SPACING.xl,
  },
  lgText: {
    fontSize: 17,
    fontWeight: '700',
  },
});

export default Button;
