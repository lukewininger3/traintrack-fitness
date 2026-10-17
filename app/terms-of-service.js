import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../src/contexts/ThemeContext';
import { TYPOGRAPHY, SPACING, RADIUS } from '../src/theme/design';

export default function TermsOfServiceScreen() {
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
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Terms of Service</Text>
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

        <Paragraph colors={colors}>
          Welcome to TrainTrack. By using our mobile application, you agree to these Terms of
          Service. Please read them carefully.
        </Paragraph>

        <Section title="1. Acceptance of Terms" colors={colors}>
          <Paragraph colors={colors}>
            By accessing or using TrainTrack, you agree to be bound by these Terms of Service
            and our Privacy Policy. If you do not agree to these terms, please do not use the app.
          </Paragraph>
        </Section>

        <Section title="2. Description of Service" colors={colors}>
          <Paragraph colors={colors}>
            TrainTrack is a free fitness tracking application that allows you to log workouts,
            track progress, set goals, and optionally connect with friends.
          </Paragraph>
        </Section>

        <Section title="3. User Accounts" colors={colors}>
          <Paragraph colors={colors}>
            To use TrainTrack, you need to create an account. You must be at least 13 years old.
            You are responsible for:
          </Paragraph>
          <BulletPoint colors={colors}>Maintaining the confidentiality of your account credentials</BulletPoint>
          <BulletPoint colors={colors}>All activities that occur under your account</BulletPoint>
          <BulletPoint colors={colors}>Providing accurate and complete information</BulletPoint>
          <BulletPoint colors={colors}>Notifying us of any unauthorized use of your account</BulletPoint>
        </Section>

        <Section title="4. Community Guidelines" colors={colors}>
          <Paragraph colors={colors}>
            TrainTrack has zero tolerance for objectionable content or abusive users. You agree
            not to post usernames, display names, profile pictures, or comments
            that:
          </Paragraph>
          <BulletPoint colors={colors}>Harass, bully, threaten, or intimidate anyone</BulletPoint>
          <BulletPoint colors={colors}>Contain hate speech or discriminate based on race, ethnicity, religion, gender, sexual orientation, disability, or any other characteristic</BulletPoint>
          <BulletPoint colors={colors}>Are sexually explicit, violent, or otherwise offensive</BulletPoint>
          <BulletPoint colors={colors}>Are spam, scams, or impersonate another person</BulletPoint>
          <Paragraph colors={colors} style={{ marginTop: SPACING.md }}>
            You can report any user or comment, and block any user, from within
            the app. We review reports within 24 hours and will remove offending content and
            suspend or permanently ban users who violate these guidelines.
          </Paragraph>
        </Section>

        <Section title="5. Acceptable Use" colors={colors}>
          <Paragraph colors={colors}>
            You also agree not to:
          </Paragraph>
          <BulletPoint colors={colors}>Use the service for any illegal purpose</BulletPoint>
          <BulletPoint colors={colors}>Attempt to access other users&apos; accounts or data</BulletPoint>
          <BulletPoint colors={colors}>Interfere with or disrupt the service</BulletPoint>
          <BulletPoint colors={colors}>Upload malicious content or code</BulletPoint>
          <BulletPoint colors={colors}>Violate any applicable laws or regulations</BulletPoint>
        </Section>

        <Section title="6. User Content" colors={colors}>
          <Paragraph colors={colors}>
            You retain ownership of content you create (workout data, photos, etc.). By using
            TrainTrack, you grant us a limited license to store and display your content as
            necessary to provide the service.
          </Paragraph>
          <Paragraph colors={colors} style={{ marginTop: SPACING.md }}>
            When sharing workouts with friends, you grant them permission to view that content.
            You are responsible for any content you share.
          </Paragraph>
        </Section>

        <Section title="7. Health Disclaimer" colors={colors}>
          <Paragraph colors={colors}>
            TrainTrack is a fitness tracking tool and does not provide medical advice. The
            information provided is for general informational purposes only.
          </Paragraph>
          <BulletPoint colors={colors}>
            Consult a healthcare professional before starting any exercise program
          </BulletPoint>
          <BulletPoint colors={colors}>
            We are not responsible for any injuries resulting from exercises you perform
          </BulletPoint>
          <BulletPoint colors={colors}>
            Stop exercising immediately if you experience pain, dizziness, or discomfort
          </BulletPoint>
        </Section>

        <Section title="8. Intellectual Property" colors={colors}>
          <Paragraph colors={colors}>
            TrainTrack and its original content, features, and functionality are owned by us
            and are protected by international copyright, trademark, and other intellectual
            property laws.
          </Paragraph>
        </Section>

        <Section title="9. Termination" colors={colors}>
          <Paragraph colors={colors}>
            We may terminate or suspend your account at any time for violations of these terms.
            You may permanently delete your account at any time from Settings &gt; Delete Account.
          </Paragraph>
        </Section>

        <Section title="10. Limitation of Liability" colors={colors}>
          <Paragraph colors={colors}>
            To the maximum extent permitted by law, TrainTrack and its affiliates shall not be
            liable for any indirect, incidental, special, consequential, or punitive damages
            resulting from your use of the service.
          </Paragraph>
        </Section>

        <Section title="11. Changes to Terms" colors={colors}>
          <Paragraph colors={colors}>
            We reserve the right to modify these terms at any time. We will notify users of
            significant changes. Continued use of the service after changes constitutes
            acceptance of the new terms.
          </Paragraph>
        </Section>

        <Section title="12. Governing Law" colors={colors}>
          <Paragraph colors={colors}>
            These terms shall be governed by and construed in accordance with the laws of the
            United States, without regard to its conflict of law provisions.
          </Paragraph>
        </Section>

        <Section title="13. Contact" colors={colors}>
          <Paragraph colors={colors}>
            For questions about these Terms of Service, email traintrack.app.support@gmail.com or use
            Settings &gt; Send Feedback in the app.
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
