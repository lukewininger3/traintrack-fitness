import React, { useEffect } from 'react';
import { Dimensions, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { COLORS, RADIUS, SPACING } from '../../theme/design';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const DISMISS_THRESHOLD = 100;

/**
 * Custom bottom sheet built with Reanimated + Gesture Handler.
 *
 * Props:
 * - isVisible (boolean): Controls open/close state
 * - onClose (function): Called when the sheet is dismissed
 * - height (number|string): Sheet height as number (px) or percentage string e.g. '50%'
 * - children: Content to render inside the sheet
 * - scrollable (boolean): If true, wraps children in ScrollView
 * - keyboardAvoiding (boolean): If true, wraps content in KeyboardAvoidingView
 */
export default function BottomSheet({
  isVisible,
  onClose,
  height: heightProp = '50%',
  children,
  scrollable = false,
  keyboardAvoiding = false,
}) {
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);
  const context = useSharedValue({ y: 0 });

  const sheetHeight =
    typeof heightProp === 'string' && heightProp.endsWith('%')
      ? (parseFloat(heightProp) / 100) * SCREEN_HEIGHT
      : heightProp;

  useEffect(() => {
    if (isVisible) {
      translateY.value = withSpring(0, {
        damping: 25,
        stiffness: 200,
        mass: 0.8,
      });
      backdropOpacity.value = withTiming(1, { duration: 250 });
    } else {
      translateY.value = withSpring(SCREEN_HEIGHT, {
        damping: 25,
        stiffness: 200,
      });
      backdropOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [isVisible]);

  const handleClose = () => {
    onClose?.();
  };

  const panGesture = Gesture.Pan()
    .onStart(() => {
      context.value = { y: translateY.value };
    })
    .onUpdate((e) => {
      // Only allow dragging down (positive translationY)
      translateY.value = Math.max(context.value.y + e.translationY, -20);
    })
    .onEnd((e) => {
      if (e.translationY > DISMISS_THRESHOLD || e.velocityY > 500) {
        translateY.value = withTiming(SCREEN_HEIGHT, { duration: 250 });
        backdropOpacity.value = withTiming(0, { duration: 200 });
        runOnJS(handleClose)();
      } else {
        translateY.value = withSpring(0, {
          damping: 25,
          stiffness: 200,
        });
      }
    });

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      backdropOpacity.value,
      [0, 1],
      [0, 0.7],
      Extrapolation.CLAMP
    ),
  }));

  if (!isVisible) return null;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, backdropAnimatedStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
      </Animated.View>

      {/* Sheet */}
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            styles.sheet,
            { height: sheetHeight },
            sheetAnimatedStyle,
          ]}
        >
          {/* Handle */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* Content */}
          {keyboardAvoiding ? (
            <KeyboardAvoidingView
              style={styles.content}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? SCREEN_HEIGHT - sheetHeight + 20 : 0}
            >
              {children}
            </KeyboardAvoidingView>
          ) : scrollable ? (
            <ScrollView
              style={styles.scrollContent}
              contentContainerStyle={styles.scrollContentContainer}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {children}
            </ScrollView>
          ) : (
            <View style={styles.content}>{children}</View>
          )}
        </Animated.View>
      </GestureDetector>
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
    backgroundColor: '#000',
  },
  sheet: {
    backgroundColor: COLORS.background.secondary,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 16,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.surface.border,
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: SPACING.lg,
    paddingBottom: 40,
  },
});
