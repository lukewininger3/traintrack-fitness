import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Application from 'expo-application';

import { useTheme } from '../src/contexts/ThemeContext';
import { useAuth } from '../src/contexts/AuthContext';
import { supabase } from '../src/config/supabase';
import { TYPOGRAPHY, SPACING, RADIUS } from '../src/theme/design';

const CATEGORIES = [
  { key: 'bug', label: 'Bug' },
  { key: 'feature', label: 'Feature Idea' },
  { key: 'account', label: 'Account / Privacy' },
  { key: 'general', label: 'Other' },
];

export default function FeedbackScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [category, setCategory] = useState('general');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    try {
      const { error } = await supabase.from('feedback').insert({
        user_id: user?.id ?? null,
        category,
        message: trimmed,
        contact_email: user?.email ?? (email.trim() || null),
        app_version: `${Application.nativeApplicationVersion ?? '?'} (${Application.nativeBuildVersion ?? '?'})`,
        platform: `${Platform.OS} ${Platform.Version}`,
      });
      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Thank you!', 'Your feedback has been sent.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (error) {
      console.error('Error sending feedback:', error);
      Alert.alert('Error', 'Could not send feedback. Please check your connection and try again.');
    } finally {
      setIsSending(false);
    }
  };

  const canSend = message.trim().length > 0 && !isSending;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Send Feedback</Text>
        <View style={styles.headerRight} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.intro, { color: colors.text.secondary }]}>
            Found a bug, have an idea, or need help with your account? Let us know.
          </Text>

          <Text style={[styles.label, { color: colors.text.tertiary }]}>TOPIC</Text>
          <View style={styles.chips}>
            {CATEGORIES.map(c => {
              const selected = c.key === category;
              return (
                <Pressable
                  key={c.key}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setCategory(c.key);
                  }}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selected ? colors.accent.primary : colors.surface.card,
                      borderColor: selected ? colors.accent.primary : colors.surface.border,
                    },
                  ]}
                >
                  <Text style={[styles.chipText, { color: selected ? colors.text.inverse : colors.text.primary }]}>
                    {c.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.label, { color: colors.text.tertiary }]}>MESSAGE</Text>
          <TextInput
            style={[styles.input, styles.messageInput, { color: colors.text.primary, backgroundColor: colors.surface.card, borderColor: colors.surface.border }]}
            placeholder="Tell us what's on your mind..."
            placeholderTextColor={colors.text.tertiary}
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={5000}
            textAlignVertical="top"
          />

          {!user && (
            <>
              <Text style={[styles.label, { color: colors.text.tertiary }]}>EMAIL (OPTIONAL, SO WE CAN REPLY)</Text>
              <TextInput
                style={[styles.input, { color: colors.text.primary, backgroundColor: colors.surface.card, borderColor: colors.surface.border }]}
                placeholder="you@example.com"
                placeholderTextColor={colors.text.tertiary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </>
          )}

          <Pressable
            onPress={handleSend}
            disabled={!canSend}
            style={[styles.sendButton, { backgroundColor: colors.accent.primary, opacity: canSend ? 1 : 0.5 }]}
          >
            {isSending ? (
              <ActivityIndicator color={colors.text.inverse} />
            ) : (
              <Text style={[styles.sendText, { color: colors.text.inverse }]}>Send Feedback</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
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
  scrollContent: {
    paddingHorizontal: SPACING.screenPadding,
    paddingBottom: SPACING.xxxl,
  },
  intro: {
    ...TYPOGRAPHY.body,
    lineHeight: 24,
    marginBottom: SPACING.xl,
  },
  label: {
    ...TYPOGRAPHY.caption,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  chipText: {
    ...TYPOGRAPHY.body,
  },
  input: {
    ...TYPOGRAPHY.body,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.md,
  },
  messageInput: {
    minHeight: 160,
  },
  sendButton: {
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  sendText: {
    ...TYPOGRAPHY.bodyBold,
  },
});
