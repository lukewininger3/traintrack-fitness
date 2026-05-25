import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../src/contexts/ThemeContext';
import { TYPOGRAPHY, SPACING, RADIUS } from '../src/theme/design';

export default function PrivacyPolicyScreen() {
  const { colors } = useTheme();

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Privacy Policy</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.lastUpdated, { color: colors.text.tertiary }]}>
          Last updated: January 2025
        </Text>

        <Section title="1. Information We Collect" colors={colors}>
          <Paragraph colors={colors}>
            TrainTrack collects information you provide directly to us, including:
          </Paragraph>
          <BulletPoint colors={colors}>Account information (email, username)</BulletPoint>
          <BulletPoint colors={colors}>Workout data (exercises, weights, reps, dates)</BulletPoint>
          <BulletPoint colors={colors}>Body metrics (weight entries, progress photos)</BulletPoint>
          <BulletPoint colors={colors}>Goals and preferences</BulletPoint>
        </Section>

        <Section title="2. How We Use Your Information" colors={colors}>
          <Paragraph colors={colors}>
            We use the information we collect to:
          </Paragraph>
          <BulletPoint colors={colors}>Provide and maintain the TrainTrack service</BulletPoint>
          <BulletPoint colors={colors}>Sync your data across devices</BulletPoint>
          <BulletPoint colors={colors}>Send you notifications and reminders (with your consent)</BulletPoint>
          <BulletPoint colors={colors}>Improve and personalize your experience</BulletPoint>
          <BulletPoint colors={colors}>Respond to your comments and questions</BulletPoint>
        </Section>

        <Section title="3. Data Storage and Security" colors={colors}>
          <Paragraph colors={colors}>
            Your workout data is stored locally on your device and, if you create an account,
            securely synced to our cloud servers powered by Supabase. We implement
            industry-standard security measures to protect your personal information.
          </Paragraph>
          <Paragraph colors={colors}>
            Progress photos are stored locally on your device and are never uploaded to our
            servers unless you explicitly choose to share them.
          </Paragraph>
        </Section>

        <Section title="4. Data Sharing" colors={colors}>
          <Paragraph colors={colors}>
            We do not sell your personal information. We may share your information only in
            the following circumstances:
          </Paragraph>
          <BulletPoint colors={colors}>With your consent (e.g., sharing workouts with friends)</BulletPoint>
          <BulletPoint colors={colors}>To comply with legal obligations</BulletPoint>
          <BulletPoint colors={colors}>To protect our rights and prevent fraud</BulletPoint>
        </Section>

        <Section title="5. Your Rights" colors={colors}>
          <Paragraph colors={colors}>
            You have the right to:
          </Paragraph>
          <BulletPoint colors={colors}>Access your personal data</BulletPoint>
          <BulletPoint colors={colors}>Export your workout data</BulletPoint>
          <BulletPoint colors={colors}>Delete your account and associated data</BulletPoint>
          <BulletPoint colors={colors}>Opt out of notifications at any time</BulletPoint>
        </Section>

        <Section title="6. Third-Party Services" colors={colors}>
          <Paragraph colors={colors}>
            TrainTrack may integrate with third-party services such as Apple Health and
            Google Fit. When you connect these services, their respective privacy policies apply
            to the data shared with them.
          </Paragraph>
        </Section>

        <Section title="7. Children's Privacy" colors={colors}>
          <Paragraph colors={colors}>
            TrainTrack is not intended for children under 13 years of age. We do not knowingly
            collect personal information from children under 13.
          </Paragraph>
        </Section>

        <Section title="8. Changes to This Policy" colors={colors}>
          <Paragraph colors={colors}>
            We may update this privacy policy from time to time. We will notify you of any
            changes by posting the new policy on this page and updating the "Last updated" date.
          </Paragraph>
        </Section>

        <Section title="9. Contact Us" colors={colors}>
          <Paragraph colors={colors}>
            If you have any questions about this Privacy Policy, please contact us at:
          </Paragraph>
          <Paragraph colors={colors} style={{ marginTop: SPACING.sm }}>
            support@traintrackfitness.com
          </Paragraph>
        </Section>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children, colors }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{title}</Text>
      {children}
    </View>
  );
}

function Paragraph({ children, colors, style }) {
  return (
    <Text style={[styles.paragraph, { color: colors.text.secondary }, style]}>
      {children}
    </Text>
  );
}

function BulletPoint({ children, colors }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={[styles.bullet, { color: colors.accent.primary }]}>{'\u2022'}</Text>
      <Text style={[styles.bulletText, { color: colors.text.secondary }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.screenPadding,
    paddingVertical: SPACING.md,
  },
  backButton: {
    padding: SPACING.sm,
    marginLeft: -SPACING.sm,
  },
  headerTitle: {
    ...TYPOGRAPHY.h3,
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.screenPadding,
  },
  lastUpdated: {
    ...TYPOGRAPHY.caption,
    marginBottom: SPACING.xl,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h4,
    marginBottom: SPACING.md,
  },
  paragraph: {
    ...TYPOGRAPHY.body,
    lineHeight: 24,
  },
  bulletRow: {
    flexDirection: 'row',
    marginTop: SPACING.sm,
    paddingLeft: SPACING.sm,
  },
  bullet: {
    ...TYPOGRAPHY.body,
    marginRight: SPACING.sm,
  },
  bulletText: {
    ...TYPOGRAPHY.body,
    flex: 1,
    lineHeight: 24,
  },
  bottomSpacer: {
    height: SPACING.xxxl,
  },
});
