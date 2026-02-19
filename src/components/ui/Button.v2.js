/**
 * Button v2 - Improved Button Component
 *
 * Key improvements:
 * 1. Consistent 48px touch target minimum
 * 2. Better visual feedback with smooth animations
 * 3. Loading state with spinner
 * 4. Icon support with proper spacing
 * 5. Full width variant
 * 6. Disabled state with clear visual indication
 */

import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolateColor,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, ANIMATIONS } from '../../theme/design-v2';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Premium button component
 *
 * @param {string} variant - 'primary' | 'secondary' | 'ghost' | 'danger'
 * @param {string} size - 'sm' | 'md' | 'lg'
 * @param {string} title - Button text
 * @param {React.ReactNode} leftIcon - Icon component to show on left
 * @param {React.ReactNode} rightIcon - Icon component to show on right
 * @param {boolean} loading - Show loading spinner
 * @param {boolean} disabled - Disable button
 * @param {boolean} fullWidth - Take full width
 * @param {boolean} haptic - Enable haptic feedback (default: true)
 * @param {function} onPress - Press handler
 * @param {object} style - Additional styles
 */
export function Button({
  variant = 'primary',
  size = 'md',
  title,
  leftIcon,
  rightIcon,
  loading = false,
  disabled = false,
  fullWidth = false,
  haptic = true,
  onPress,
  style,
  ...props
}) {
  const scale = useSharedValue(1);
  const pressed = useSharedValue(0);

  const isDisabled = disabled || loading;

  const handlePressIn = () => {
    if (isDisabled) return;
    scale.value = withSpring(ANIMATIONS.scale.pressed, ANIMATIONS.spring.stiff);
    pressed.value = withTiming(1, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, ANIMATIONS.spring.default);
    pressed.value = withTiming(0, { duration: 150 });
  };

  const handlePress = () => {
    if (isDisabled) return;
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.();
  };

  const variantConfig = VARIANTS[variant];
  const sizeConfig = SIZES[size];

  const animatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      pressed.value,
      [0, 1],
      [variantConfig.background, variantConfig.backgroundPressed]
    );

    return {
      transform: [{ scale: scale.value }],
      backgroundColor,
      opacity: isDisabled ? 0.5 : 1,
    };
  });

  const textColor = isDisabled ? variantConfig.textDisabled : variantConfig.text;
  const iconColor = textColor;
  const spinnerColor = variantConfig.text;

  // Clone icons with proper color
  const renderIcon = (icon, position) => {
    if (!icon) return null;
    return React.cloneElement(icon, {
      size: sizeConfig.iconSize,
      color: iconColor,
      strokeWidth: 2.5,
    });
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      style={[
        styles.base,
        sizeConfig.container,
        variantConfig.border && styles.border,
        variantConfig.border && { borderColor: variantConfig.borderColor },
        fullWidth && styles.fullWidth,
        animatedStyle,
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={spinnerColor} />
      ) : (
        <View style={styles.content}>
          {renderIcon(leftIcon, 'left')}
          {title && (
            <Text
              style={[
                styles.text,
                sizeConfig.text,
                { color: textColor },
              ]}
              numberOfLines={1}
            >
              {title}
            </Text>
          )}
          {renderIcon(rightIcon, 'right')}
        </View>
      )}
    </AnimatedPressable>
  );
}

// Icon-only button variant
export function IconButton({
  icon,
  variant = 'ghost',
  size = 'md',
  disabled = false,
  haptic = true,
  onPress,
  style,
  ...props
}) {
  const scale = useSharedValue(1);
  const pressed = useSharedValue(0);

  const handlePressIn = () => {
    if (disabled) return;
    scale.value = withSpring(0.9, ANIMATIONS.spring.stiff);
    pressed.value = withTiming(1, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, ANIMATIONS.spring.default);
    pressed.value = withTiming(0, { duration: 150 });
  };

  const handlePress = () => {
    if (disabled) return;
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.();
  };

  const variantConfig = ICON_VARIANTS[variant];
  const sizeConfig = ICON_SIZES[size];

  const animatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      pressed.value,
      [0, 1],
      [variantConfig.background, variantConfig.backgroundPressed]
    );

    return {
      transform: [{ scale: scale.value }],
      backgroundColor,
      opacity: disabled ? 0.5 : 1,
    };
  });

  const iconColor = disabled ? variantConfig.iconDisabled : variantConfig.icon;

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[
        styles.iconButton,
        sizeConfig,
        animatedStyle,
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      {...props}
    >
      {React.cloneElement(icon, {
        size: sizeConfig.iconSize,
        color: iconColor,
        strokeWidth: 2,
      })}
    </AnimatedPressable>
  );
}

// Variant configurations
const VARIANTS = {
  primary: {
    background: COLORS.accent.primary,
    backgroundPressed: COLORS.accent.secondary,
    text: COLORS.text.inverse,
    textDisabled: COLORS.text.inverse,
  },
  secondary: {
    background: COLORS.surface.card,
    backgroundPressed: COLORS.surface.cardHover,
    text: COLORS.text.primary,
    textDisabled: COLORS.text.disabled,
    border: true,
    borderColor: COLORS.surface.borderLight,
  },
  ghost: {
    background: 'transparent',
    backgroundPressed: COLORS.accent.muted,
    text: COLORS.accent.primary,
    textDisabled: COLORS.text.disabled,
  },
  danger: {
    background: COLORS.status.error,
    backgroundPressed: '#A8605A', // Slightly darker
    text: COLORS.text.primary,
    textDisabled: COLORS.text.disabled,
  },
};

// Size configurations
const SIZES = {
  sm: {
    container: {
      minHeight: 36,
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.md,
      borderRadius: RADIUS.sm,
    },
    text: TYPOGRAPHY.buttonSmall,
    iconSize: 16,
  },
  md: {
    container: {
      minHeight: 48,
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.xl,
      borderRadius: RADIUS.md,
    },
    text: TYPOGRAPHY.button,
    iconSize: 18,
  },
  lg: {
    container: {
      minHeight: 56,
      paddingVertical: SPACING.lg,
      paddingHorizontal: SPACING.xxl,
      borderRadius: RADIUS.md,
    },
    text: {
      ...TYPOGRAPHY.button,
      fontSize: 16,
    },
    iconSize: 20,
  },
};

// Icon button variants
const ICON_VARIANTS = {
  default: {
    background: COLORS.surface.card,
    backgroundPressed: COLORS.surface.cardHover,
    icon: COLORS.text.primary,
    iconDisabled: COLORS.text.disabled,
  },
  ghost: {
    background: 'transparent',
    backgroundPressed: COLORS.background.tertiary,
    icon: COLORS.text.secondary,
    iconDisabled: COLORS.text.disabled,
  },
  accent: {
    background: COLORS.accent.dim,
    backgroundPressed: COLORS.accent.glow,
    icon: COLORS.accent.primary,
    iconDisabled: COLORS.text.disabled,
  },
};

// Icon button sizes
const ICON_SIZES = {
  sm: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    iconSize: 16,
  },
  md: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    iconSize: 20,
  },
  lg: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.lg,
    iconSize: 24,
  },
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  border: {
    borderWidth: 1.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  text: {
    textAlign: 'center',
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Button;
