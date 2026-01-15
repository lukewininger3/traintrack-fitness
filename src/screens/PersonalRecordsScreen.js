import { router } from 'expo-router';
import { Award, ChevronLeft, Crown, Medal, TrendingUp } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../theme/design';
import {
  getPRsByCategory,
  getPRStats,
  loadPersonalRecords,
} from '../utils/personalRecords';

export default function PersonalRecordsScreen() {
  const [prs, setPRs] = useState([]);
  const [prsByCategory, setPRsByCategory] = useState({});
  const [stats, setStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [allPRs, grouped, prStats] = await Promise.all([
      loadPersonalRecords(),
      getPRsByCategory(),
      getPRStats(),
    ]);
    setPRs(allPRs);
    setPRsByCategory(grouped);
    setStats(prStats);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const categories = Object.keys(prsByCategory).sort();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={COLORS.text.primary} strokeWidth={2} />
        </Pressable>
        <Text style={styles.headerTitle}>PERSONAL RECORDS</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.accent.primary}
          />
        }
      >
        {/* Stats Summary */}
        {stats && (
          <View style={styles.statsCard}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <View style={styles.statIconContainer}>
                  <Crown size={20} color={COLORS.warning} strokeWidth={2} />
                </View>
                <Text style={styles.statValue}>{stats.totalPRs}</Text>
                <Text style={styles.statLabel}>TOTAL PRs</Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statItem}>
                <View style={[styles.statIconContainer, { backgroundColor: COLORS.accent.primaryDim }]}>
                  <TrendingUp size={20} color={COLORS.accent.primary} strokeWidth={2} />
                </View>
                <Text style={styles.statValue}>{stats.recentPRs}</Text>
                <Text style={styles.statLabel}>LAST 30 DAYS</Text>
              </View>
            </View>

            {stats.topExercise && (
              <View style={styles.topExerciseSection}>
                <Text style={styles.topExerciseLabel}>TOP LIFT</Text>
                <Text style={styles.topExerciseName}>{stats.topExercise.exercise}</Text>
                <Text style={styles.topExerciseValue}>
                  {stats.topExercise.weight} lbs × {stats.topExercise.reps} reps
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Empty State */}
        {prs.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Award size={48} color={COLORS.text.tertiary} strokeWidth={1.5} />
            </View>
            <Text style={styles.emptyTitle}>No PRs Yet</Text>
            <Text style={styles.emptySubtitle}>
              Complete strength workouts to start tracking your personal records
            </Text>
          </View>
        )}

        {/* Category Filter */}
        {categories.length > 0 && (
          <View style={styles.categoryFilter}>
            <Pressable
              style={[
                styles.categoryChip,
                !selectedCategory && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(null)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  !selectedCategory && styles.categoryChipTextActive,
                ]}
              >
                All
              </Text>
            </Pressable>
            {categories.map((category) => (
              <Pressable
                key={category}
                style={[
                  styles.categoryChip,
                  selectedCategory === category && styles.categoryChipActive,
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    selectedCategory === category && styles.categoryChipTextActive,
                  ]}
                >
                  {category}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* PR List */}
        {(selectedCategory ? [selectedCategory] : categories).map((category) => {
          const categoryPRs = prsByCategory[category] || [];
          if (categoryPRs.length === 0) return null;

          return (
            <View key={category} style={styles.categorySection}>
              <Text style={styles.categoryTitle}>{category.toUpperCase()}</Text>

              {categoryPRs.map((pr, index) => (
                <View key={pr.id || pr.exercise} style={styles.prCard}>
                  <View style={styles.prRankContainer}>
                    {index === 0 ? (
                      <Medal size={20} color={COLORS.warning} strokeWidth={2} />
                    ) : (
                      <Text style={styles.prRank}>{index + 1}</Text>
                    )}
                  </View>

                  <View style={styles.prInfo}>
                    <Text style={styles.prExercise}>{pr.exercise}</Text>
                    <Text style={styles.prDate}>{pr.date}</Text>
                  </View>

                  <View style={styles.prStats}>
                    <Text style={styles.prWeight}>{pr.weight} lbs</Text>
                    <Text style={styles.prReps}>× {pr.reps} reps</Text>
                  </View>
                </View>
              ))}
            </View>
          );
        })}

        {/* Info Card */}
        {prs.length > 0 && (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>How PRs are tracked</Text>
            <Text style={styles.infoText}>
              Personal records are based on the heaviest weight you've lifted for each exercise.
              Keep pushing to set new PRs!
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: 60,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.primary,
  },

  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.lg,
    paddingBottom: 100,
  },

  // Stats Card
  statsCard: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 214, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  statValue: {
    ...TYPOGRAPHY.statMedium,
    color: COLORS.text.primary,
  },
  statLabel: {
    ...TYPOGRAPHY.label,
    fontSize: 10,
    color: COLORS.text.tertiary,
    marginTop: SPACING.xs,
  },
  statDivider: {
    width: 1,
    height: 60,
    backgroundColor: COLORS.surface.border,
    marginHorizontal: SPACING.lg,
  },
  topExerciseSection: {
    marginTop: SPACING.lg,
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.surface.border,
    alignItems: 'center',
  },
  topExerciseLabel: {
    ...TYPOGRAPHY.label,
    fontSize: 10,
    color: COLORS.warning,
    marginBottom: SPACING.xs,
  },
  topExerciseName: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  topExerciseValue: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.surface.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    paddingHorizontal: SPACING.xl,
  },

  // Category Filter
  categoryFilter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  categoryChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface.card,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
  },
  categoryChipActive: {
    backgroundColor: COLORS.accent.primaryDim,
    borderColor: COLORS.surface.borderAccent,
  },
  categoryChipText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  categoryChipTextActive: {
    color: COLORS.accent.primary,
  },

  // Category Section
  categorySection: {
    marginBottom: SPACING.xl,
  },
  categoryTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.secondary,
    marginBottom: SPACING.md,
  },

  // PR Card
  prCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  prRankContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.background.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  prRank: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    color: COLORS.text.tertiary,
  },
  prInfo: {
    flex: 1,
  },
  prExercise: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.primary,
  },
  prDate: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  prStats: {
    alignItems: 'flex-end',
  },
  prWeight: {
    ...TYPOGRAPHY.statSmall,
    color: COLORS.text.primary,
    fontSize: 18,
  },
  prReps: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
  },

  // Info Card
  infoCard: {
    backgroundColor: COLORS.tertiary.dim,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.tertiary.primary,
  },
  infoTitle: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  infoText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    lineHeight: 18,
  },
});
