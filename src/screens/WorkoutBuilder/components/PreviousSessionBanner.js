import { TrendingUp } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../../../theme/design';

/**
 * Banner showing previous workout session data
 * @param {Object} previousSession - Previous session data { date, sets, workoutName }
 * @param {boolean} isCardio - Whether this is a cardio exercise
 */
export default function PreviousSessionBanner({ previousSession, isCardio = false }) {
  if (!previousSession) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <TrendingUp size={14} color={COLORS.tertiary.primary} strokeWidth={2.5} />
        </View>
        <Text style={styles.title}>PREVIOUS SESSION</Text>
        <Text style={styles.date}>{previousSession.date}</Text>
      </View>
      <View style={styles.setsContainer}>
        {previousSession.sets.map((set, idx) => {
          if (isCardio) {
            return (
              <View key={idx} style={styles.setRow}>
                <Text style={styles.setLabel}>Set {idx + 1}</Text>
                <Text style={styles.setValue}>
                  {set.distance || 0} mi × {set.time || 0} min
                </Text>
                <Text style={styles.setPace}>({set.pace || 0} min/mi)</Text>
              </View>
            );
          }
          return (
            <View key={idx} style={styles.setRow}>
              <Text style={styles.setLabel}>Set {idx + 1}</Text>
              <Text style={styles.setValue}>
                {set.weight || 0} lbs × {set.reps || 0} reps
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.tertiary.dim,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.tertiary.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(0, 212, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...TYPOGRAPHY.label,
    fontSize: 10,
    color: COLORS.tertiary.primary,
    flex: 1,
  },
  date: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
  },
  setsContainer: {
    marginLeft: SPACING.xl + SPACING.sm,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  setLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    minWidth: 40,
  },
  setValue: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },
  setPace: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
  },
});
