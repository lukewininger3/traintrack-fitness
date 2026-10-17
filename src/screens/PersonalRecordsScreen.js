import { router } from 'expo-router';
import { Award, ChevronLeft, Crown, Info, Search, TrendingUp, Trophy, X } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../theme/design';
import {
  calculateOneRepMax,
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
  const [searchQuery, setSearchQuery] = useState('');
  const [showInfoModal, setShowInfoModal] = useState(false);

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

  // Filter PRs by search query and category
  const filteredPRsByCategory = useMemo(() => {
    if (!searchQuery.trim()) return prsByCategory;

    const query = searchQuery.toLowerCase();
    const filtered = {};

    for (const [category, categoryPRs] of Object.entries(prsByCategory)) {
      const matchingPRs = categoryPRs.filter(pr =>
        pr.exercise.toLowerCase().includes(query)
      );
      if (matchingPRs.length > 0) {
        filtered[category] = matchingPRs;
      }
    }

    return filtered;
  }, [prsByCategory, searchQuery]);

  const filteredCategories = Object.keys(filteredPRsByCategory).sort();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={COLORS.text.primary} strokeWidth={2} />
        </Pressable>
        <Text style={styles.headerTitle}>PERSONAL RECORDS</Text>
        <Pressable onPress={() => setShowInfoModal(true)} style={styles.infoButton}>
          <Info size={20} color={COLORS.text.secondary} strokeWidth={2} />
        </Pressable>
      </View>

      {/* Info Modal */}
      <Modal
        visible={showInfoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInfoModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowInfoModal(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>How PRs are Tracked</Text>
              <Pressable onPress={() => setShowInfoModal(false)} hitSlop={8}>
                <X size={20} color={COLORS.text.secondary} strokeWidth={2} />
              </Pressable>
            </View>
            <Text style={styles.modalText}>
              Personal Records are tracked by both raw weight and estimated one-rep max (1RM). A new PR is set when you lift heavier weight or achieve a higher estimated 1RM through more reps.
            </Text>
            <View style={styles.formulaContainer}>
              <Text style={styles.formulaLabel}>1RM FORMULA (EPLEY)</Text>
              <Text style={styles.formulaText}>1RM = Weight × (1 + Reps ÷ 30)</Text>
            </View>
            <Text style={styles.modalTextSmall}>
              Example: 185 lbs × 8 reps = 234 lbs estimated 1RM
            </Text>
          </View>
        </Pressable>
      </Modal>

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

          </View>
        )}

        {/* Search Bar */}
        {prs.length > 0 && (
          <View style={styles.searchContainer}>
            <View style={styles.searchInputWrapper}>
              <Search size={18} color={COLORS.text.tertiary} strokeWidth={2} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search exercises..."
                placeholderTextColor={COLORS.text.tertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                  <X size={18} color={COLORS.text.tertiary} strokeWidth={2} />
                </Pressable>
              )}
            </View>
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

        {/* No Search Results */}
        {prs.length > 0 && filteredCategories.length === 0 && searchQuery.trim() && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Search size={48} color={COLORS.text.tertiary} strokeWidth={1.5} />
            </View>
            <Text style={styles.emptyTitle}>No Results</Text>
            <Text style={styles.emptySubtitle}>
              No exercises match &ldquo;{searchQuery}&rdquo;
            </Text>
          </View>
        )}

        {/* Category Filter */}
        {filteredCategories.length > 0 && !searchQuery.trim() && (
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
        {(searchQuery.trim()
          ? filteredCategories
          : selectedCategory
            ? [selectedCategory]
            : filteredCategories
        ).map((category) => {
          const categoryPRs = filteredPRsByCategory[category] || [];
          if (categoryPRs.length === 0) return null;

          return (
            <View key={category} style={styles.categorySection}>
              <Text style={styles.categoryTitle}>{category.toUpperCase()}</Text>

              {categoryPRs.map((pr) => {
                // Calculate 1RM if not stored
                const estimated1RM = pr.estimatedOneRepMax || calculateOneRepMax(pr.weight, pr.reps);
                return (
                  <View key={pr.id || pr.exercise} style={styles.prCard}>
                    <View style={styles.prIconContainer}>
                      <Trophy size={20} color={COLORS.warning} strokeWidth={2} />
                    </View>

                    <View style={styles.prInfo}>
                      <Text style={styles.prExercise}>{pr.exercise}</Text>
                      <Text style={styles.prDate}>{pr.date}</Text>
                    </View>

                    <View style={styles.prStats}>
                      {estimated1RM > 0 && (
                        <View style={styles.pr1RMMain}>
                          <Text style={styles.pr1RMValue}>{Math.round(estimated1RM)}</Text>
                          <Text style={styles.pr1RMLabel}>1RM</Text>
                        </View>
                      )}
                      <Text style={styles.prSetInfo}>{pr.weight} lbs × {pr.reps}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          );
        })}

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
  infoButton: {
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

  // Search
  searchContainer: {
    marginBottom: SPACING.lg,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
    paddingVertical: SPACING.xs,
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
  prIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 214, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
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
  pr1RMMain: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  pr1RMValue: {
    ...TYPOGRAPHY.statMedium,
    color: COLORS.accent.primary,
    fontSize: 22,
  },
  pr1RMLabel: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accent.primary,
  },
  prSetInfo: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.primary,
  },
  modalText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  formulaContainer: {
    backgroundColor: COLORS.accent.primaryDim,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    alignItems: 'center',
  },
  formulaLabel: {
    ...TYPOGRAPHY.label,
    fontSize: 10,
    color: COLORS.text.tertiary,
    marginBottom: SPACING.xs,
  },
  formulaText: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 16,
    color: COLORS.accent.primary,
  },
  modalTextSmall: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    textAlign: 'center',
  },
});
