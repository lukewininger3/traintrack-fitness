import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  Activity,
  ChevronRight,
  Dumbbell,
  LayoutDashboard,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react-native';
import { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../theme/design';

const ONBOARDING_KEY = '@traintrack_onboarding';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Screenshot images - add your screenshots to assets/images/onboarding/
// Name them: dashboard.png, activities.png, goals.png, progress.png
// Set USE_SCREENSHOTS to true once images are added
const USE_SCREENSHOTS = true;

const ONBOARDING_IMAGES = USE_SCREENSHOTS ? {
  dashboard: require('../../assets/images/onboarding/dashboard.png'),
  activities: require('../../assets/images/onboarding/activities.png'),
  goals: require('../../assets/images/onboarding/goals.png'),
  progress: require('../../assets/images/onboarding/progress.png'),
} : {};

// Walkthrough steps showcasing app features
const WALKTHROUGH_STEPS = [
  {
    id: 'welcome',
    icon: Dumbbell,
    iconColor: COLORS.accent.primary,
    iconBg: COLORS.accent.primaryDim,
    title: 'Welcome to\nTrainTrack',
    subtitle: "Your personal fitness companion. Let's take a quick tour of what you can do.",
    features: null,
    screenshot: null, // No screenshot for welcome
  },
  {
    id: 'dashboard-calendar',
    icon: LayoutDashboard,
    iconColor: COLORS.accent.primary,
    iconBg: COLORS.accent.primaryDim,
    title: 'Dashboard',
    subtitle: 'View your activity calendar',
    features: [
      'View your activity calendar.',
      'Track weekly streaks',
    ],
    screenshot: 'dashboard',
    overlayPosition: 'bottom', // Standard overlay at bottom
  },
  {
    id: 'dashboard-workouts',
    icon: LayoutDashboard,
    iconColor: COLORS.accent.primary,
    iconBg: COLORS.accent.primaryDim,
    title: 'Dashboard',
    subtitle: 'Quick access to your daily workouts.',
    features: [
      'Quick access to your daily workouts',
    ],
    screenshot: 'dashboard',
    overlayPosition: 'top', // Overlay at top to reveal bottom content
  },
  {
    id: 'activities',
    icon: Activity,
    iconColor: COLORS.secondary.primary,
    iconBg: COLORS.secondary.dim,
    title: 'Activities',
    subtitle: 'Log every rep, set, and personal record.',
    features: [
      'Log every workout',
      'Track sets, reps, and weight',
      'Use saved templates',
    ],
    screenshot: 'activities',
  },
  {
    id: 'goals',
    icon: Target,
    iconColor: COLORS.tertiary.primary,
    iconBg: COLORS.tertiary.dim,
    title: 'Goals',
    subtitle: 'Set weekly goals and schedule workouts.',
    features: [
      'Plan workouts for the week',
      'Set weekly goals',
      'Stay on schedule',
    ],
    screenshot: 'goals',
  },
  {
    id: 'progress',
    icon: TrendingUp,
    iconColor: COLORS.accent.primary,
    iconBg: COLORS.accent.primaryDim,
    title: 'Track Progress',
    subtitle: 'Watch your gains over time.',
    features: [
      'View consistency stats',
      'Track personal records',
      'See strength trends over time',
    ],
    screenshot: 'progress',
  },
];

export default function OnboardingScreen() {
  const { refreshProfile } = useAuth();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const flatListRef = useRef(null);

  const totalSteps = WALKTHROUGH_STEPS.length;
  const STATUS_BAR_HEIGHT = insets.top;

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
        completedAt: new Date().toISOString(),
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

  const renderStep = ({ item: stepData }) => {
    const IconComponent = stepData.icon;
    const hasScreenshot = stepData.screenshot !== null && USE_SCREENSHOTS && ONBOARDING_IMAGES[stepData.screenshot];

    // Welcome screen or fallback when no screenshots
    if (!hasScreenshot) {
      return (
        <View style={[styles.stepContainer, { width: SCREEN_WIDTH }]}>
          <View style={[styles.iconContainer, { backgroundColor: stepData.iconBg }]}>
            <IconComponent
              size={56}
              color={stepData.iconColor}
              strokeWidth={1.5}
            />
          </View>
          <Text style={styles.welcomeTitle}>{stepData.title}</Text>
          <Text style={styles.welcomeSubtitle}>{stepData.subtitle}</Text>

          {/* Show features for non-welcome steps */}
          {stepData.features && (
            <View style={styles.featuresContainer}>
              {stepData.features.map((feature, idx) => (
                <View key={idx} style={styles.featureRow}>
                  <View style={[styles.featureBullet, { backgroundColor: stepData.iconBg }]}>
                    <Sparkles size={14} color={stepData.iconColor} strokeWidth={2} />
                  </View>
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      );
    }

    // Screenshot steps with overlay
    const isTopOverlay = stepData.overlayPosition === 'top';

    return (
      <View style={[styles.screenshotContainer, { width: SCREEN_WIDTH }]}>
        {/* Status bar area - matches the cropped screenshot */}
        <View style={[styles.statusBarArea, { height: STATUS_BAR_HEIGHT }]} />

        {/* Screenshot area - positioned below status bar */}
        <View style={styles.screenshotWrapper}>
          <Image
            source={ONBOARDING_IMAGES[stepData.screenshot]}
            style={styles.screenshotImage}
            resizeMode="cover"
          />

          {/* Gradient overlay for text readability */}
          <LinearGradient
            colors={isTopOverlay
              ? ['rgba(0,0,0,0.95)', 'rgba(0,0,0,0.85)', 'rgba(0,0,0,0.3)', 'transparent']
              : ['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.85)', 'rgba(0,0,0,0.95)']}
            locations={isTopOverlay ? [0, 0.4, 0.7, 1] : [0, 0.3, 0.6, 1]}
            style={[
              styles.screenshotOverlay,
              isTopOverlay && styles.screenshotOverlayTop,
            ]}
          >
            {/* Content */}
            <View style={[
              styles.overlayContent,
              isTopOverlay && styles.overlayContentTop,
            ]}>
              <View style={styles.overlayHeader}>
                <View style={[styles.overlayIconContainer, { backgroundColor: stepData.iconBg }]}>
                  <IconComponent
                    size={24}
                    color={stepData.iconColor}
                    strokeWidth={2}
                  />
                </View>
                <View style={styles.overlayTitleContainer}>
                  <Text style={styles.overlayTitle}>{stepData.title.replace('\n', ' ')}</Text>
                </View>
              </View>

              {stepData.features && (
                <View style={styles.overlayFeatures}>
                  {stepData.features.map((feature, idx) => (
                    <View key={idx} style={styles.overlayFeatureRow}>
                      <Sparkles size={12} color={stepData.iconColor} strokeWidth={2} />
                      <Text style={styles.overlayFeatureText}>{feature}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </LinearGradient>
        </View>
      </View>
    );
  };

  const currentStep = WALKTHROUGH_STEPS[step];
  const isScreenshotStep = currentStep?.screenshot !== null && USE_SCREENSHOTS && ONBOARDING_IMAGES[currentStep?.screenshot];

  return (
    <View style={styles.container}>
      {/* Steps */}
      <FlatList
        ref={flatListRef}
        data={WALKTHROUGH_STEPS}
        renderItem={renderStep}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
      />

      {/* Progress Dots - positioned on top */}
      <View style={styles.progressContainer}>
        <Pressable onPress={handleSkip} style={styles.skipButton}>
          <Text style={[styles.skipText, isScreenshotStep && styles.skipTextLight]}>
            Skip
          </Text>
        </Pressable>
        <View style={styles.progressDots}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.progressDot,
                isScreenshotStep && styles.progressDotLight,
                i === step && styles.progressDotActive,
                i < step && styles.progressDotComplete,
              ]}
            />
          ))}
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Bottom Button */}
      <View style={styles.bottomContainer}>
        <Pressable
          style={[
            styles.nextButton,
            step === totalSteps - 1 && styles.finishButton,
          ]}
          onPress={step === totalSteps - 1 ? handleComplete : handleNext}
          disabled={saving}
        >
          <Text style={[
            styles.nextButtonText,
            step === totalSteps - 1 && styles.finishButtonText,
          ]}>
            {step === totalSteps - 1 ? (saving ? 'Getting ready...' : "Let's Go") : 'Next'}
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  skipButton: {
    width: 40,
  },
  skipText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.tertiary,
  },
  skipTextLight: {
    color: 'rgba(255,255,255,0.7)',
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
  progressDotLight: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  progressDotActive: {
    width: 24,
    backgroundColor: COLORS.accent.primary,
  },
  progressDotComplete: {
    backgroundColor: COLORS.accent.primary,
  },

  // Welcome step (no screenshot)
  stepContainer: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: 120,
    alignItems: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  welcomeTitle: {
    ...TYPOGRAPHY.h1,
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: SPACING.md,
    lineHeight: 42,
  },
  welcomeSubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.xl,
  },

  // Feature cards (for fallback/no-screenshot mode)
  featuresContainer: {
    width: '100%',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.md,
  },
  featureBullet: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
    flex: 1,
  },

  // Screenshot steps
  screenshotContainer: {
    flex: 1,
  },
  statusBarArea: {
    backgroundColor: COLORS.background.primary,
  },
  screenshotWrapper: {
    flex: 1,
    position: 'relative',
  },
  screenshotImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  screenshotOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  screenshotOverlayTop: {
    justifyContent: 'flex-start',
  },
  overlayContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 120, // Space for bottom button
  },
  overlayContentTop: {
    paddingBottom: 0,
    paddingTop: 50, // Just below the header area
  },
  overlayHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  overlayIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayTitleContainer: {
    flex: 1,
  },
  overlayTitle: {
    ...TYPOGRAPHY.h2,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  overlaySubtitle: {
    ...TYPOGRAPHY.body,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 20,
  },
  overlayFeatures: {
    gap: SPACING.sm,
  },
  overlayFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  overlayFeatureText: {
    ...TYPOGRAPHY.body,
    color: '#FFFFFF',
    fontSize: 14,
  },

  // Bottom
  bottomContainer: {
    padding: SPACING.xl,
    paddingBottom: 40,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
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
