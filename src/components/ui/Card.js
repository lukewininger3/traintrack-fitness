import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, RADIUS, SHADOWS, ANIMATIONS } from '../../theme/design';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Card Component
 *
 * A flexible card container with consistent styling from the design system.
 *
 * Variants:
 * - default: Standard surface card
 * - accent: Highlighted with accent border and background
 * - elevated: Stronger shadow for elevated surfaces
 *
 * @param {React.ReactNode} children - Card content
 * @param {string} variant - 'default' | 'accent' | 'elevated'
 * @param {string} accentColor - Left border accent color (optional)
 * @param {function} onPress - Press handler (makes card pressable)
 * @param {boolean} animated - Enable press animation (default: true when onPress provided)
 * @param {boolean} haptic - Enable haptic feedback (default: false)
 * @param {string} padding - 'none' | 'sm' | 'md' | 'lg' (default: 'lg')
 * @param {object} style - Additional container styles
 */
export function Card({
  children,
  variant = 'default',
  accentColor,
  onPress,
  animated = true,
  haptic = false,
  padding = 'lg',
  style,
}) {
  const scale = useSharedValue(1);
  const isPressable = !!onPress;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (animated && isPressable) {
      scale.value = withSpring(0.98, ANIMATIONS.spring);
    }
  };

  const handlePressOut = () => {
    if (animated && isPressable) {
      scale.value = withSpring(1, ANIMATIONS.spring);
    }
  };

  const handlePress = () => {
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.();
  };

  const variantStyles = getVariantStyles(variant);
  const paddingStyle = getPaddingStyle(padding);

  const cardContent = (
    <>
      {accentColor && (
        <View style={[styles.accentBorder, { backgroundColor: accentColor }]} />
      )}
      <View style={[styles.content, accentColor && styles.contentWithAccent]}>
        {children}
      </View>
    </>
  );

  if (isPressable) {
    return (
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.base,
          variantStyles,
          paddingStyle,
          animatedStyle,
          style,
        ]}
      >
        {cardContent}
      </AnimatedPressable>
    );
  }

  return (
    <Animated.View style={[styles.base, variantStyles, paddingStyle, style]}>
      {cardContent}
    </Animated.View>
  );
}

function getVariantStyles(variant) {
  switch (variant) {
    case 'accent':
      return styles.accentVariant;
    case 'elevated':
      return styles.elevatedVariant;
    case 'default':
    default:
      return styles.defaultVariant;
  }
}

function getPaddingStyle(padding) {
  switch (padding) {
    case 'none':
      return { padding: 0 };
    case 'sm':
      return { padding: SPACING.sm };
    case 'md':
      return { padding: SPACING.md };
    case 'lg':
    default:
      return { padding: SPACING.lg };
  }
}

const styles = StyleSheet.create({
  base: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    flexDirection: 'row',
  },

  // Default variant
  defaultVariant: {
    backgroundColor: COLORS.surface.card,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
  },

  // Accent variant
  accentVariant: {
    backgroundColor: COLORS.accent.primaryDim,
    borderWidth: 1,
    borderColor: COLORS.surface.borderAccent,
  },

  // Elevated variant
  elevatedVariant: {
    backgroundColor: COLORS.background.elevated,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    ...SHADOWS.md,
  },

  // Accent border (left side)
  accentBorder: {
    width: 4,
    marginLeft: -1,
    marginVertical: -1,
    borderTopLeftRadius: RADIUS.lg,
    borderBottomLeftRadius: RADIUS.lg,
  },

  // Content wrapper
  content: {
    flex: 1,
  },
  contentWithAccent: {
    paddingLeft: SPACING.md,
  },
});

export default Card;
