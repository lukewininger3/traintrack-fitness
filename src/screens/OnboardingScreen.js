import React, { useState, useRef } from 'react';
import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Dumbbell, Target, Calendar, Zap, ChevronRight } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../theme/design';

const ONBOARDING_KEY = '@traintrack_onboarding';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const FITNESS_GOALS = [
  { id: 'strength', label: 'Build Strength', icon: '💪' },
  { id: 'endurance', label: 'Improve Endurance', icon: '🏃' },
  { id: 'general', label: 'General Fitness', icon: '⚡' },
  { id: 'weight_loss', label: 'Lose Weight', icon: '🔥' },
];

const EXPERIENCE_LEVELS = [
  { id: 'beginner', label: 'Beginner', description: 'New to working out' },
  { id: 'intermediate', label: 'Intermediate', description: '1-3 years of training' },
  { id: 'advanced', label: 'Advanced', description: '3+ years of consistent training' },
];

const WEEKLY_TARGETS = [2, 3, 4, 5, 6];

export default function OnboardingScreen() {
  const { user, refreshProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [fitnessGoal, setFitnessGoal] = useState(null);
  const [experienceLevel, setExperienceLevel] = useState(null);
  const [weeklyTarget, setWeeklyTarget] = useState(4);
  const [saving, setSaving] = useState(false);
  const flatListRef = useRef(null);

  const totalSteps = 4;

  const goToStep = (nextStep) => {
    setStep(nextStep);
    flatListRef.current?.scrollToIndex({ index: nextStep, animated: true });
  };

  const handleNext = () => {
    if (step < totalSteps - 1) {
      goToStep(step + 1);
    }
  };

  const handleComplete = async () => {
    if (saving) return;
    setSaving(true);

    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, JSON.stringify({
        completed: true,
        fitnessGoal,
        experienceLevel,
        weeklyTarget,
      }));
      await refreshProfile();
      router.replace('/(tabs)');
    } catch (err) {
      console.error('Onboarding error:', err);
      router.replace('/(tabs)');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    setSaving(true);
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, JSON.stringify({ completed: true }));
      await refreshProfile();
    } catch {}
    router.replace('/(tabs)');
  };

  const canProceed = () => {
    switch (step) {
      case 0: return true; // Welcome, always can proceed
      case 1: return fitnessGoal !== null;
      case 2: return experienceLevel !== null;
      case 3: return true; // Weekly target has default
      default: return false;
    }
  };

  const steps = [
    // Step 0: Welcome
    () => (
      <View style={styles.stepContainer}>
        <View style={styles.welcomeIconContainer}>
          <Dumbbell size={56} color={COLORS.accent.primary} strokeWidth={1.5} />
        </View>
        <Text style={styles.welcomeTitle}>Welcome to{'\n'}TrainTrack</Text>
        <Text style={styles.welcomeSubtitle}>
          Let's personalize your experience to help you reach your fitness goals faster.
        </Text>
      </View>
    ),

    // Step 1: Fitness Goal
    () => (
      <View style={styles.stepContainer}>
        <View style={styles.stepIconWrapper}>
          <Target size={28} color={COLORS.accent.primary} strokeWidth={2} />
        </View>
        <Text style={styles.stepTitle}>What's your primary goal?</Text>
        <Text style={styles.stepSubtitle}>This helps us tailor your experience</Text>

        <View style={styles.optionsContainer}>
          {FITNESS_GOALS.map((goal) => (
            <Pressable
              key={goal.id}
              style={[
                styles.optionCard,
                fitnessGoal === goal.id && styles.optionCardSelected,
              ]}
              onPress={() => setFitnessGoal(goal.id)}
            >
              <Text style={styles.optionIcon}>{goal.icon}</Text>
              <Text style={[
                styles.optionLabel,
                fitnessGoal === goal.id && styles.optionLabelSelected,
              ]}>
                {goal.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    ),

    // Step 2: Experience Level
    () => (
      <View style={styles.stepContainer}>
        <View style={styles.stepIconWrapper}>
          <Zap size={28} color={COLORS.secondary.primary} strokeWidth={2} />
        </View>
        <Text style={styles.stepTitle}>Your experience level?</Text>
        <Text style={styles.stepSubtitle}>We'll adjust recommendations accordingly</Text>

        <View style={styles.optionsContainer}>
          {EXPERIENCE_LEVELS.map((level) => (
            <Pressable
              key={level.id}
              style={[
                styles.levelCard,
                experienceLevel === level.id && styles.levelCardSelected,
              ]}
              onPress={() => setExperienceLevel(level.id)}
            >
              <Text style={[
                styles.levelLabel,
                experienceLevel === level.id && styles.levelLabelSelected,
              ]}>
                {level.label}
              </Text>
              <Text style={styles.levelDescription}>{level.description}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    ),

    // Step 3: Weekly Target
    () => (
      <View style={styles.stepContainer}>
        <View style={styles.stepIconWrapper}>
          <Calendar size={28} color={COLORS.tertiary.primary} strokeWidth={2} />
        </View>
        <Text style={styles.stepTitle}>Weekly workout target?</Text>
        <Text style={styles.stepSubtitle}>How many days per week do you want to train?</Text>

        <View style={styles.targetContainer}>
          {WEEKLY_TARGETS.map((target) => (
            <Pressable
              key={target}
              style={[
                styles.targetButton,
                weeklyTarget === target && styles.targetButtonSelected,
              ]}
              onPress={() => setWeeklyTarget(target)}
            >
              <Text style={[
                styles.targetNumber,
                weeklyTarget === target && styles.targetNumberSelected,
              ]}>
                {target}
              </Text>
              <Text style={[
                styles.targetLabel,
                weeklyTarget === target && styles.targetLabelSelected,
              ]}>
                days
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    ),
  ];

  return (
    <View style={styles.container}>
      {/* Progress Dots */}
      <View style={styles.progressContainer}>
        <Pressable onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
        <View style={styles.progressDots}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.progressDot,
                i === step && styles.progressDotActive,
                i < step && styles.progressDotComplete,
              ]}
            />
          ))}
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Steps */}
      <FlatList
        ref={flatListRef}
        data={steps}
        renderItem={({ item: StepComponent }) => (
          <View style={{ width: SCREEN_WIDTH }}>
            <StepComponent />
          </View>
        )}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => i.toString()}
      />

      {/* Bottom Button */}
      <View style={styles.bottomContainer}>
        <Pressable
          style={[
            styles.nextButton,
            !canProceed() && styles.nextButtonDisabled,
            step === totalSteps - 1 && styles.finishButton,
          ]}
          onPress={step === totalSteps - 1 ? handleComplete : handleNext}
          disabled={!canProceed() || saving}
        >
          <Text style={[
            styles.nextButtonText,
            step === totalSteps - 1 && styles.finishButtonText,
          ]}>
            {step === totalSteps - 1 ? (saving ? 'Setting up...' : 'Get Started') : 'Continue'}
          </Text>
          {step < totalSteps - 1 && (
            <ChevronRight size={20} color={COLORS.text.inverse} strokeWidth={2.5} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },

  // Progress
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: 60,
    paddingBottom: SPACING.md,
  },
  skipButton: {
    width: 40,
  },
  skipText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.tertiary,
  },
  progressDots: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.surface.border,
  },
  progressDotActive: {
    width: 24,
    backgroundColor: COLORS.accent.primary,
  },
  progressDotComplete: {
    backgroundColor: COLORS.accent.primary,
  },

  // Steps
  stepContainer: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: 40,
    alignItems: 'center',
  },

  // Welcome
  welcomeIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.accent.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  welcomeTitle: {
    ...TYPOGRAPHY.h1,
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 42,
  },
  welcomeSubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: SPACING.lg,
  },

  // Step Common
  stepIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.surface.card,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  stepTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  stepSubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },

  // Options
  optionsContainer: {
    width: '100%',
    gap: SPACING.sm,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.lg,
  },
  optionCardSelected: {
    backgroundColor: COLORS.accent.primaryDim,
    borderColor: COLORS.accent.primary,
  },
  optionIcon: {
    fontSize: 24,
  },
  optionLabel: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text.primary,
  },
  optionLabelSelected: {
    color: COLORS.accent.primary,
  },

  // Level Cards
  levelCard: {
    width: '100%',
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.lg,
  },
  levelCardSelected: {
    backgroundColor: COLORS.secondary.dim,
    borderColor: COLORS.secondary.primary,
  },
  levelLabel: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  levelLabelSelected: {
    color: COLORS.secondary.primary,
  },
  levelDescription: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
  },

  // Weekly Target
  targetContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  targetButton: {
    width: 56,
    height: 72,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface.card,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetButtonSelected: {
    backgroundColor: COLORS.tertiary.dim,
    borderColor: COLORS.tertiary.primary,
  },
  targetNumber: {
    ...TYPOGRAPHY.statMedium,
    color: COLORS.text.primary,
    fontSize: 24,
  },
  targetNumberSelected: {
    color: COLORS.tertiary.primary,
  },
  targetLabel: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  targetLabelSelected: {
    color: COLORS.tertiary.primary,
  },

  // Bottom
  bottomContainer: {
    padding: SPACING.xl,
    paddingBottom: 40,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.accent.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.lg,
  },
  nextButtonDisabled: {
    opacity: 0.4,
  },
  nextButtonText: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text.inverse,
  },
  finishButton: {
    backgroundColor: COLORS.accent.primary,
  },
  finishButtonText: {
    color: COLORS.text.inverse,
  },
});
