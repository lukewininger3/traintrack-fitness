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
          Last updated: October 16, 2026
        </Text>

        <Section title="Information We Collect" colors={colors}>
          <Paragraph colors={colors}>
            TrainTrack collects the information you provide when you use the app:
          </Paragraph>
          <BulletPoint colors={colors}>Account information: email address, username, and display name</BulletPoint>
          <BulletPoint colors={colors}>Profile picture, if you choose to upload one</BulletPoint>
          <BulletPoint colors={colors}>Workout data: exercises, sets, weights, reps, durations, and dates</BulletPoint>
          <BulletPoint colors={colors}>Body metrics: weight entries and notes</BulletPoint>
          <BulletPoint colors={colors}>Goals, templates, custom exercises, and personal records</BulletPoint>
          <BulletPoint colors={colors}>Social activity: friends, friend requests, shared workouts, likes, and comments</BulletPoint>
          <BulletPoint colors={colors}>Reports and blocks you make, and feedback you send (with your app version and device type)</BulletPoint>
          <Paragraph colors={colors} style={{ marginTop: SPACING.md }}>
            We do not use advertising, analytics, or tracking services, and we do not collect
            your location.
          </Paragraph>
        </Section>

        <Section title="How We Use Your Information" colors={colors}>
          <BulletPoint colors={colors}>Provide the TrainTrack service and sync your data across devices</BulletPoint>
          <BulletPoint colors={colors}>Show your shared workouts and profile to your friends</BulletPoint>
          <BulletPoint colors={colors}>Send reminders you turn on (these are scheduled on your device)</BulletPoint>
          <BulletPoint colors={colors}>Review reports and keep the community safe</BulletPoint>
          <BulletPoint colors={colors}>Respond to your feedback and improve the app</BulletPoint>
        </Section>

        <Section title="What Other Users Can See" colors={colors}>
          <BulletPoint colors={colors}>
            Signed-in users can find you by username and see your display name, profile picture,
            week streak, and total workout count.
          </BulletPoint>
          <BulletPoint colors={colors}>
            Only your friends can see workouts you share and comments on them. You can turn off
            workout sharing in your profile.
          </BulletPoint>
          <BulletPoint colors={colors}>
            Your email address, weight entries, and unshared workouts are never visible to other users.
          </BulletPoint>
        </Section>

        <Section title="Data Storage and Security" colors={colors}>
          <Paragraph colors={colors}>
            Your data is stored on your device and in our cloud database, hosted by Supabase.
            Data is encrypted in transit, and access is restricted so users can only read data
            they are permitted to see.
          </Paragraph>
          <Paragraph colors={colors} style={{ marginTop: SPACING.md }}>
            Progress photos attached to weight entries stay on your device and are not uploaded.
            Profile pictures are uploaded so your friends can see them.
          </Paragraph>
        </Section>

        <Section title="Information Sharing" colors={colors}>
          <Paragraph colors={colors}>
            We do not sell or rent your personal information. We share it only:
          </Paragraph>
          <BulletPoint colors={colors}>With other users, as described above</BulletPoint>
          <BulletPoint colors={colors}>With Supabase, which stores data on our behalf</BulletPoint>
          <BulletPoint colors={colors}>When required by law, or to protect the safety of our users</BulletPoint>
        </Section>

        <Section title="Your Choices and Rights" colors={colors}>
          <BulletPoint colors={colors}>Export your data from Settings &gt; Export Workout Data</BulletPoint>
          <BulletPoint colors={colors}>Edit your username, display name, and profile picture at any time</BulletPoint>
          <BulletPoint colors={colors}>Turn notifications on or off in Settings</BulletPoint>
          <BulletPoint colors={colors}>Block users and manage blocked users in Settings</BulletPoint>
          <BulletPoint colors={colors}>
            Permanently delete your account and all associated data from Settings &gt; Delete
            Account. Deletion takes effect immediately and cannot be undone.
          </BulletPoint>
        </Section>

        <Section title="Children's Privacy" colors={colors}>
          <Paragraph colors={colors}>
            TrainTrack is not intended for children under 13 years of age. We do not knowingly
            collect personal information from children under 13. If you believe a child has
            created an account, please email traintrack.app.support@gmail.com and we will delete it.
          </Paragraph>
        </Section>

        <Section title="Changes to This Policy" colors={colors}>
          <Paragraph colors={colors}>
            We may update this privacy policy from time to time. We will post the updated policy
            in the app and update the &ldquo;Last updated&rdquo; date above.
          </Paragraph>
        </Section>

        <Section title="Contact Us" colors={colors}>
          <Paragraph colors={colors}>
            Questions or requests about your privacy? Email traintrack.app.support@gmail.com, or
            use Settings &gt; Send Feedback in the app and choose &ldquo;Account / Privacy&rdquo;.
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
