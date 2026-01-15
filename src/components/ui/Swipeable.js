import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Trash2, RotateCcw } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, ANIMATIONS } from '../../theme/design';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DELETE_THRESHOLD = 100;
const ACTION_WIDTH = 80;

/**
 * Swipeable Component
 *
 * Wraps content with swipe-to-delete gesture functionality.
 *
 * @param {React.ReactNode} children - The content to make swipeable
 * @param {function} onDelete - Callback when item is deleted
 * @param {function} onAction - Callback for secondary action (optional)
 * @param {string} deleteLabel - Label for delete action (default: 'Delete')
 * @param {string} actionLabel - Label for secondary action (optional)
 * @param {React.ReactNode} actionIcon - Icon for secondary action
 * @param {string} actionColor - Background color for secondary action
 * @param {boolean} enabled - Enable/disable swipe (default: true)
 * @param {boolean} haptic - Enable haptic feedback (default: true)
 * @param {object} style - Additional styles
 */
export function Swipeable({
  children,
  onDelete,
  onAction,
  deleteLabel = 'Delete',
  actionLabel,
  actionIcon,
  actionColor = COLORS.tertiary.primary,
  enabled = true,
  haptic = true,
  style,
}) {
  const translateX = useSharedValue(0);
  const itemHeight = useSharedValue(0);
  const isDeleting = useSharedValue(false);

  const triggerHaptic = useCallback(() => {
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [haptic]);

  const handleDelete = useCallback(() => {
    onDelete?.();
  }, [onDelete]);

  const handleAction = useCallback(() => {
    onAction?.();
  }, [onAction]);

  const panGesture = Gesture.Pan()
    .enabled(enabled)
    .activeOffsetX([-10, 10])
    .onUpdate((event) => {
      // Only allow swiping left (negative translateX)
      const clampedX = Math.min(0, event.translationX);
      const maxSwipe = onAction ? -(ACTION_WIDTH * 2 + 20) : -(ACTION_WIDTH + 20);
      translateX.value = Math.max(maxSwipe, clampedX);

      // Trigger haptic when crossing delete threshold
      if (translateX.value < -DELETE_THRESHOLD && !isDeleting.value) {
        isDeleting.value = true;
        runOnJS(triggerHaptic)();
      } else if (translateX.value >= -DELETE_THRESHOLD && isDeleting.value) {
        isDeleting.value = false;
      }
    })
    .onEnd((event) => {
      // Determine final state based on velocity and position
      const shouldShowActions = event.velocityX < -500 || translateX.value < -50;
      const shouldDelete = translateX.value < -DELETE_THRESHOLD - 50;

      if (shouldDelete) {
        // Full swipe - trigger delete
        translateX.value = withTiming(-SCREEN_WIDTH, { duration: 200 }, () => {
          runOnJS(handleDelete)();
        });
      } else if (shouldShowActions) {
        // Partial swipe - show action buttons
        const snapPoint = onAction ? -(ACTION_WIDTH * 2) : -ACTION_WIDTH;
        translateX.value = withSpring(snapPoint, ANIMATIONS.spring);
      } else {
        // Return to closed
        translateX.value = withSpring(0, ANIMATIONS.spring);
      }
    });

  const tapGesture = Gesture.Tap().onStart(() => {
    if (translateX.value < 0) {
      translateX.value = withSpring(0, ANIMATIONS.spring);
    }
  });

  const composedGesture = Gesture.Race(panGesture, tapGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const deleteActionStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [-ACTION_WIDTH, 0],
      [1, 0],
      Extrapolation.CLAMP
    );
    const scale = interpolate(
      translateX.value,
      [-DELETE_THRESHOLD, -ACTION_WIDTH, 0],
      [1.1, 1, 0.8],
      Extrapolation.CLAMP
    );
    return {
      opacity,
      transform: [{ scale }],
    };
  });

  const secondaryActionStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [-(ACTION_WIDTH * 2), -ACTION_WIDTH],
      [1, 0],
      Extrapolation.CLAMP
    );
    const scale = interpolate(
      translateX.value,
      [-(ACTION_WIDTH * 2), -ACTION_WIDTH],
      [1, 0.8],
      Extrapolation.CLAMP
    );
    return {
      opacity,
      transform: [{ scale }],
    };
  });

  return (
    <View style={[styles.container, style]}>
      {/* Background actions */}
      <View style={styles.actionsContainer}>
        {onAction && (
          <Animated.View style={[styles.actionButton, { backgroundColor: actionColor }, secondaryActionStyle]}>
            {actionIcon || <RotateCcw size={20} color={COLORS.text.primary} />}
            {actionLabel && (
              <Text style={styles.actionText}>{actionLabel}</Text>
            )}
          </Animated.View>
        )}
        <Animated.View style={[styles.actionButton, styles.deleteButton, deleteActionStyle]}>
          <Trash2 size={20} color={COLORS.text.primary} />
          <Text style={styles.actionText}>{deleteLabel}</Text>
        </Animated.View>
      </View>

      {/* Swipeable content */}
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.content, animatedStyle]}>
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

/**
 * SwipeableList - Helper wrapper for lists with swipeable items
 */
export function SwipeableList({ children, style }) {
  return (
    <View style={[styles.list, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  content: {
    backgroundColor: COLORS.background.primary,
  },
  actionsContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  actionButton: {
    width: ACTION_WIDTH,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
  },
  deleteButton: {
    backgroundColor: COLORS.error,
  },
  actionText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.primary,
    marginTop: SPACING.xs,
    fontWeight: '600',
  },
  list: {
    overflow: 'hidden',
  },
});

export default Swipeable;
