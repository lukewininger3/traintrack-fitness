import React from 'react';
import { Pressable, Text, StyleSheet, View } from 'react-native';
import { Calendar, ChevronRight } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../../theme/design';

/**
 * CalendarLinkCard - CTA to view full calendar
 * @param {Function} onPress - Open calendar modal
 * @param {number} monthWorkoutCount - Workouts this month for preview text
 */
export default function CalendarLinkCard({ onPress, monthWorkoutCount = 0 }) {
  return (
    <Animated.View entering={FadeIn.duration(300).delay(200)}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.container,
          pressed && styles.containerPressed,
        ]}
      >
        <View style={styles.iconContainer}>
          <Calendar size={20} color={COLORS.accent.primary} strokeWidth={2} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>View Full Calendar</Text>
          {monthWorkoutCount > 0 && (
            <Text style={styles.subtitle}>
              {monthWorkoutCount} workout{monthWorkoutCount !== 1 ? 's' : ''} this month
            </Text>
          )}
        </View>
        <ChevronRight size={20} color={COLORS.text.tertiary} strokeWidth={2} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  containerPressed: {
    backgroundColor: COLORS.background.elevated,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.accent.dim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.primary,
  },
  subtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
});
