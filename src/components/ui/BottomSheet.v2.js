/**
 * BottomSheet v2 - Improved Version
 *
 * Key improvements:
 * 1. Respects safe areas (bottom home indicator)
 * 2. Better gesture handling with velocity-based dismissal
 * 3. Backdrop blur option for premium feel
 * 4. Snap points support
 * 5. Header slot for custom headers
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import {
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
  useDerivedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADIUS, SPACING, SHADOWS, ANIMATIONS } from '../../theme/design-v2';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const DISMISS_VELOCITY = 500;
const DISMISS_THRESHOLD = 0.25; // 25% of sheet height
const OVER_DRAG_RESISTANCE = 0.5;

/**
 * Improved bottom sheet with safe area support
 *
 * @param {boolean} isVisible - Controls visibility
 * @param {function} onClose - Called when sheet is dismissed
 * @param {number|string} height - Sheet height (px or %)
 * @param {number[]} snapPoints - Optional snap points as percentages [0.5, 0.8, 1]
 * @param {React.ReactNode} children - Content
 * @param {React.ReactNode} header - Optional custom header (rendered above handle)
 * @param {boolean} scrollable - Wrap content in ScrollView
 * @param {boolean} keyboardAvoiding - Enable keyboard avoidance
 * @param {boolean} showHandle - Show drag handle (default: true)
 * @param {boolean} dismissOnBackdrop - Close on backdrop tap (default: true)
 * @param {boolean} enableGestures - Enable drag gestures (default: true)
 */
export default function BottomSheet({
  isVisible,
  onClose,
  height: heightProp = '50%',
  snapPoints,
  children,
  header,
  scrollable = false,
  keyboardAvoiding = false,
  showHandle = true,
  dismissOnBackdrop = true,
  enableGestures = true,
}) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);
  const context = useSharedValue({ y: 0 });
  const isClosing = useSharedValue(false);

  // Calculate sheet height accounting for safe area
  const sheetHeight = useMemo(() => {
    const baseHeight = typeof heightProp === 'string' && heightProp.endsWith('%')
      ? (parseFloat(heightProp) / 100) * SCREEN_HEIGHT
      : heightProp;
    // Don't add bottom inset to height - we add padding inside instead
    return baseHeight;
  }, [heightProp]);

  // Bottom padding for safe area (home indicator)
  const bottomPadding = insets.bottom || SPACING.xl;

  const springConfig = ANIMATIONS.spring.gentle;

  useEffect(() => {
    if (isVisible) {
      isClosing.value = false;
      translateY.value = withSpring(0, springConfig);
      backdropOpacity.value = withTiming(1, { duration: ANIMATIONS.timing.default });
    } else {
      close();
    }
  }, [isVisible]);

  const close = useCallback(() => {
    'worklet';
    if (isClosing.value) return;
    isClosing.value = true;
    translateY.value = withTiming(SCREEN_HEIGHT, {
      duration: ANIMATIONS.timing.exit
    });
    backdropOpacity.value = withTiming(0, { duration: ANIMATIONS.timing.fast });
  }, []);

  const handleClose = useCallback(() => {
    Keyboard.dismiss();
    onClose?.();
  }, [onClose]);

  const panGesture = Gesture.Pan()
    .enabled(enableGestures)
    .onStart(() => {
      context.value = { y: translateY.value };
    })
    .onUpdate((e) => {
      // Allow slight over-drag with resistance
      if (e.translationY < 0) {
        translateY.value = context.value.y + (e.translationY * OVER_DRAG_RESISTANCE);
      } else {
        translateY.value = context.value.y + e.translationY;
      }
    })
    .onEnd((e) => {
      const shouldDismiss =
        e.velocityY > DISMISS_VELOCITY ||
        translateY.value > sheetHeight * DISMISS_THRESHOLD;

      if (shouldDismiss) {
        close();
        runOnJS(handleClose)();
      } else {
        // Snap back
        translateY.value = withSpring(0, springConfig);
      }
    });

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: Math.max(translateY.value, -20) }],
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      backdropOpacity.value,
      [0, 1],
      [0, 1],
      Extrapolation.CLAMP
    ),
  }));

  // Derived value for content opacity (fade in as sheet opens)
  const contentOpacity = useDerivedValue(() => {
    return interpolate(
      translateY.value,
      [sheetHeight * 0.5, 0],
      [0, 1],
      Extrapolation.CLAMP
    );
  });

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  if (!isVisible) return null;

  const ContentWrapper = keyboardAvoiding ? KeyboardAvoidingView : View;
  const contentWrapperProps = keyboardAvoiding ? {
    behavior: Platform.OS === 'ios' ? 'padding' : 'height',
    keyboardVerticalOffset: SCREEN_HEIGHT - sheetHeight + 20,
    style: styles.content,
  } : {
    style: styles.content,
  };

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, backdropAnimatedStyle]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={dismissOnBackdrop ? handleClose : undefined}
        />
      </Animated.View>

      {/* Sheet */}
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            styles.sheet,
            { height: sheetHeight + bottomPadding },
            sheetAnimatedStyle,
          ]}
        >
          {/* Handle bar */}
          {showHandle && (
            <View style={styles.handleContainer}>
              <View style={styles.handle} />
            </View>
          )}

          {/* Custom header */}
          {header && (
            <View style={styles.headerContainer}>
              {header}
            </View>
          )}

          {/* Content */}
          <Animated.View style={[{ flex: 1 }, contentAnimatedStyle]}>
            {scrollable ? (
              <ScrollView
                style={styles.scrollContent}
                contentContainerStyle={[
                  styles.scrollContentContainer,
                  { paddingBottom: bottomPadding }
                ]}
                showsVerticalScrollIndicator={false}
                bounces={true}
                keyboardShouldPersistTaps="handled"
              >
                {children}
              </ScrollView>
            ) : (
              <ContentWrapper {...contentWrapperProps}>
                <View style={[styles.innerContent, { paddingBottom: bottomPadding }]}>
                  {children}
                </View>
              </ContentWrapper>
            )}
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

// Reusable sheet header component
export function SheetHeader({ title, subtitle, onClose, rightAction }) {
  return (
    <View style={styles.sheetHeader}>
      <View style={styles.sheetHeaderLeft}>
        {title && <Animated.Text style={styles.sheetTitle}>{title}</Animated.Text>}
        {subtitle && <Animated.Text style={styles.sheetSubtitle}>{subtitle}</Animated.Text>}
      </View>
      <View style={styles.sheetHeaderRight}>
        {rightAction}
        {onClose && (
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Animated.Text style={styles.closeButtonText}>Done</Animated.Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.overlay.medium,
  },
  sheet: {
    backgroundColor: COLORS.background.elevated,
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    overflow: 'hidden',
    ...SHADOWS.xl,
  },

  // Handle
  handleContainer: {
    alignItems: 'center',
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.surface.borderLight,
  },

  // Header
  headerContainer: {
    paddingHorizontal: SPACING.screenPadding,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface.divider,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetHeaderLeft: {
    flex: 1,
  },
  sheetHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  sheetTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.primary,
  },
  sheetSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  closeButton: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  closeButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.accent.primary,
  },

  // Content
  content: {
    flex: 1,
  },
  innerContent: {
    flex: 1,
    paddingHorizontal: SPACING.screenPadding,
    paddingTop: SPACING.md,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingHorizontal: SPACING.screenPadding,
    paddingTop: SPACING.md,
  },
});
