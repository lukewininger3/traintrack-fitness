import { router } from 'expo-router';
import { AtSign, Check, Loader, User, X } from 'lucide-react-native';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';
import { containsObjectionableContent } from '../../utils/moderation';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../../theme/design';

export default function UsernameSetupScreen() {
  const insets = useSafeAreaInsets();
  const { user, refreshProfile } = useAuth();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const displayNameRef = useRef(null);

  // Generate suggested username from email
  useEffect(() => {
    if (user?.email) {
      const emailPrefix = user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      setDisplayName(emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1));
    }
  }, [user?.email]);

  // Debounced username availability check
  useEffect(() => {
    if (!username || username.length < 3) {
      setIsAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsChecking(true);
      setError('');

      // Validate username format
      if (!/^[a-z0-9_]+$/.test(username)) {
        setIsAvailable(false);
        setError('Only lowercase letters, numbers, and underscores');
        setIsChecking(false);
        return;
      }

      if (username.length > 20) {
        setIsAvailable(false);
        setError('Maximum 20 characters');
        setIsChecking(false);
        return;
      }

      try {
        const { data, error: queryError } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', username)
          .single();

        if (queryError && queryError.code === 'PGRST116') {
          // No match found - username is available
          setIsAvailable(true);
        } else if (data) {
          setIsAvailable(false);
          setError('Username already taken');
        } else {
          setIsAvailable(true);
        }
      } catch (err) {
        console.error('Error checking username:', err);
        setIsAvailable(null);
      } finally {
        setIsChecking(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [username]);

  const handleUsernameChange = (text) => {
    // Only allow lowercase letters, numbers, and underscores
    const cleaned = text.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(cleaned);
    setIsAvailable(null);
    setError('');
  };

  const handleSave = async () => {
    if (!username || username.length < 3 || !isAvailable) {
      setError('Please enter a valid username');
      return;
    }

    if (containsObjectionableContent(username) || containsObjectionableContent(displayName)) {
      setError('Please choose a name without offensive language');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const initials = (displayName || username).substring(0, 2).toUpperCase();

      const { error: insertError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          username: username,
          display_name: displayName || username,
          avatar_initials: initials,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (insertError) throw insertError;

      // Refresh the profile in AuthContext
      await refreshProfile();

      // Navigate to main app
      router.replace('/(tabs)');
    } catch (err) {
      console.error('Error saving profile:', err);
      // Unique violation: taken by a profile this user can't see (e.g. someone who blocked them)
      setError(err.code === '23505' ? 'Username already taken' : (err.message || 'Failed to save profile'));
    } finally {
      setIsSaving(false);
    }
  };

  const canSave = username.length >= 3 && isAvailable && !isChecking && !isSaving;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={FadeInDown.delay(100).springify().damping(15)}
          style={styles.header}
        >
          <View style={styles.iconContainer}>
            <User size={32} color={COLORS.accent.primary} strokeWidth={2} />
          </View>
          <Text style={styles.title}>Create Your Profile</Text>
          <Text style={styles.subtitle}>
            Choose a unique username so friends can find you
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(200).springify().damping(15)}
          style={styles.form}
        >
          {/* Username Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>USERNAME</Text>
            <View style={[
              styles.inputContainer,
              isAvailable === true && styles.inputValid,
              isAvailable === false && styles.inputInvalid,
            ]}>
              <AtSign size={18} color={COLORS.text.tertiary} strokeWidth={2} />
              <TextInput
                style={styles.input}
                placeholder="your_username"
                placeholderTextColor={COLORS.text.tertiary}
                value={username}
                onChangeText={handleUsernameChange}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={20}
                returnKeyType="next"
                onSubmitEditing={() => displayNameRef.current?.focus()}
              />
              {isChecking ? (
                <Loader size={18} color={COLORS.text.tertiary} strokeWidth={2} />
              ) : isAvailable === true ? (
                <Check size={18} color={COLORS.success} strokeWidth={2.5} />
              ) : isAvailable === false ? (
                <X size={18} color={COLORS.error} strokeWidth={2.5} />
              ) : null}
            </View>
            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : username.length > 0 && username.length < 3 ? (
              <Text style={styles.hintText}>Minimum 3 characters</Text>
            ) : isAvailable === true ? (
              <Text style={styles.successText}>Username available!</Text>
            ) : null}
          </View>

          {/* Display Name Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>DISPLAY NAME</Text>
            <View style={styles.inputContainer}>
              <User size={18} color={COLORS.text.tertiary} strokeWidth={2} />
              <TextInput
                style={styles.input}
                placeholder="Your Name"
                placeholderTextColor={COLORS.text.tertiary}
                ref={displayNameRef}
                value={displayName}
                onChangeText={setDisplayName}
                maxLength={30}
                returnKeyType="done"
                onSubmitEditing={() => (canSave ? handleSave() : Keyboard.dismiss())}
              />
            </View>
            <Text style={styles.hintText}>This is how you&apos;ll appear to friends</Text>
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(300).springify().damping(15)}
          style={styles.footer}
        >
          <Pressable
            style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!canSave}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={COLORS.text.inverse} />
            ) : (
              <Text style={styles.saveButtonText}>Continue</Text>
            )}
          </Pressable>

          <Text style={styles.footerNote}>
            You can change your display name later in settings
          </Text>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  content: {
    flexGrow: 1,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.accent.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  form: {
    gap: SPACING.xl,
  },
  inputGroup: {
    gap: SPACING.sm,
  },
  label: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.secondary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.elevated,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  inputValid: {
    borderColor: COLORS.success,
  },
  inputInvalid: {
    borderColor: COLORS.error,
  },
  input: {
    flex: 1,
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
    paddingVertical: SPACING.md,
  },
  hintText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    marginLeft: SPACING.xs,
  },
  errorText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.error,
    marginLeft: SPACING.xs,
  },
  successText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.success,
    marginLeft: SPACING.xs,
  },
  footer: {
    marginTop: SPACING.xxl,
    gap: SPACING.md,
  },
  saveButton: {
    backgroundColor: COLORS.accent.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.inverse,
    fontSize: 16,
  },
  footerNote: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    textAlign: 'center',
  },
});
