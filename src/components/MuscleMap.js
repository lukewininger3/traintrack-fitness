import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../theme/design';
import { getRecoveryStatus, MUSCLE_GROUP_LABELS } from '../utils/muscleGroups';

/**
 * MuscleMap - Visual body diagram showing muscle recovery status
 * @param {Object} muscleGroupData - From analyzeMuscleGroupCoverage()
 * @param {Function} onMusclePress - Optional callback when muscle is tapped
 */
export default function MuscleMap({ muscleGroupData = {}, onMusclePress }) {
  const getStatusColor = (muscle) => {
    const data = muscleGroupData[muscle] || {};
    const status = getRecoveryStatus(data.daysSinceTraining);

    switch (status) {
      case 'recovered':
      case 'untrained':
        return COLORS.success;
      case 'recent':
        return COLORS.warning;
      case 'fatigued':
        return COLORS.error;
      default:
        return COLORS.text.tertiary;
    }
  };

  const getOpacity = (muscle) => {
    const data = muscleGroupData[muscle] || {};
    if (data.daysSinceTraining === null) return 0.3;
    return 0.7;
  };

  // SVG paths for muscle groups (simplified anatomical representation)
  const musclePaths = {
    // Front view muscles
    chest: {
      path: "M60,55 Q75,50 90,55 L95,75 Q75,80 55,75 Z",
      label: { x: 75, y: 65 }
    },
    shoulders: {
      path: "M45,45 Q55,40 60,50 L55,65 Q45,60 40,50 Z M90,50 Q95,40 105,45 L110,50 Q105,60 95,65 Z",
      label: { x: 75, y: 48 }
    },
    biceps: {
      path: "M40,65 Q35,75 38,95 L48,95 Q50,75 48,65 Z M102,65 Q100,75 102,95 L112,95 Q115,75 110,65 Z",
      label: { x: 30, y: 80 }
    },
    triceps: {
      path: "M38,68 L32,68 Q28,80 30,95 L38,95 Z M112,68 L118,68 Q122,80 120,95 L112,95 Z",
      label: { x: 120, y: 80 }
    },
    forearms: {
      path: "M30,98 Q25,115 28,135 L38,135 Q42,115 40,98 Z M110,98 Q108,115 112,135 L122,135 Q125,115 120,98 Z",
      label: { x: 25, y: 115 }
    },
    abs: {
      path: "M62,78 L88,78 L88,130 Q75,135 62,130 Z",
      label: { x: 75, y: 105 }
    },
    quads: {
      path: "M55,135 Q50,160 52,195 L68,195 Q72,160 70,135 Z M80,135 Q78,160 82,195 L98,195 Q100,160 95,135 Z",
      label: { x: 75, y: 165 }
    },
    calves: {
      path: "M52,200 Q48,220 50,250 L65,250 Q68,220 65,200 Z M85,200 Q82,220 85,250 L100,250 Q102,220 98,200 Z",
      label: { x: 75, y: 225 }
    },
  };

  // Back view muscles (offset to the right)
  const backMusclePaths = {
    back: {
      path: "M210,55 Q225,50 240,55 L245,100 Q225,105 205,100 Z",
      label: { x: 225, y: 78 }
    },
    glutes: {
      path: "M205,105 Q225,100 245,105 L245,140 Q225,145 205,140 Z",
      label: { x: 225, y: 122 }
    },
    hamstrings: {
      path: "M205,145 Q200,175 202,195 L218,195 Q222,175 220,145 Z M230,145 Q228,175 232,195 L248,195 Q250,175 245,145 Z",
      label: { x: 225, y: 170 }
    },
  };

  const renderMuscle = (muscle, pathData, isFront = true) => {
    const color = getStatusColor(muscle);
    const opacity = getOpacity(muscle);

    return (
      <G key={muscle}>
        <Path
          d={pathData.path}
          fill={color}
          fillOpacity={opacity}
          stroke={color}
          strokeWidth="1.5"
        />
      </G>
    );
  };

  // Body outline paths
  const frontBodyOutline = "M75,10 Q95,10 100,25 L100,40 Q110,45 115,55 L120,95 Q125,100 125,135 L115,135 Q110,100 105,98 L105,135 Q108,160 105,195 Q102,210 100,250 L85,250 Q82,210 80,195 L75,195 L70,195 Q68,210 65,250 L50,250 Q48,210 45,195 Q42,160 45,135 L45,98 Q40,100 35,135 L25,135 Q25,100 30,95 L35,55 Q40,45 50,40 L50,25 Q55,10 75,10 Z";

  const backBodyOutline = "M225,10 Q245,10 250,25 L250,40 Q260,45 265,55 L270,95 Q275,100 275,135 L265,135 Q260,100 255,98 L255,135 Q258,160 255,195 Q252,210 250,250 L235,250 Q232,210 230,195 L225,195 L220,195 Q218,210 215,250 L200,250 Q198,210 195,195 Q192,160 195,135 L195,98 Q190,100 185,135 L175,135 Q175,100 180,95 L185,55 Q190,45 200,40 L200,25 Q205,10 225,10 Z";

  return (
    <View style={styles.container}>
      <View style={styles.diagramContainer}>
        <Svg width="300" height="270" viewBox="0 0 300 270">
          {/* Front body outline */}
          <Path
            d={frontBodyOutline}
            fill={COLORS.surface.card}
            stroke={COLORS.surface.border}
            strokeWidth="2"
          />

          {/* Back body outline */}
          <Path
            d={backBodyOutline}
            fill={COLORS.surface.card}
            stroke={COLORS.surface.border}
            strokeWidth="2"
          />

          {/* Front muscles */}
          {Object.entries(musclePaths).map(([muscle, pathData]) =>
            renderMuscle(muscle, pathData, true)
          )}

          {/* Back muscles */}
          {Object.entries(backMusclePaths).map(([muscle, pathData]) =>
            renderMuscle(muscle, pathData, false)
          )}
        </Svg>

        {/* Labels */}
        <View style={styles.labelRow}>
          <Text style={styles.viewLabel}>FRONT</Text>
          <Text style={styles.viewLabel}>BACK</Text>
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.success }]} />
          <Text style={styles.legendText}>Ready (3+ days)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.warning }]} />
          <Text style={styles.legendText}>Recent (1-2 days)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.error }]} />
          <Text style={styles.legendText}>Fatigued (today)</Text>
        </View>
      </View>

      {/* Muscle List (compact) */}
      <View style={styles.muscleList}>
        {['chest', 'back', 'shoulders', 'biceps', 'triceps', 'abs', 'quads', 'hamstrings', 'glutes', 'calves', 'forearms'].map((muscle) => {
          const data = muscleGroupData[muscle] || {};
          const status = getRecoveryStatus(data.daysSinceTraining);
          const color = getStatusColor(muscle);
          const days = data.daysSinceTraining;

          return (
            <View key={muscle} style={styles.muscleItem}>
              <View style={[styles.muscleIndicator, { backgroundColor: color }]} />
              <Text style={styles.muscleName}>{MUSCLE_GROUP_LABELS[muscle]}</Text>
              <Text style={[styles.muscleDays, { color }]}>
                {days === null ? '—' : days === 0 ? 'Today' : `${days}d`}
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
    alignItems: 'center',
  },
  diagramContainer: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: 300,
    marginTop: SPACING.sm,
  },
  viewLabel: {
    ...TYPOGRAPHY.label,
    fontSize: 10,
    color: COLORS.text.tertiary,
    width: 150,
    textAlign: 'center',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.surface.border,
    width: '100%',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    color: COLORS.text.tertiary,
  },
  muscleList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.surface.border,
    gap: SPACING.xs,
  },
  muscleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    paddingVertical: SPACING.xs,
  },
  muscleIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: SPACING.xs,
  },
  muscleName: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.text.secondary,
    flex: 1,
  },
  muscleDays: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    fontWeight: '600',
  },
});
