import { router } from 'expo-router';
import { Activity, ChevronRight, Lock, Mail } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../../theme/design';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);
  const { signIn } = useAuth();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please enter both email and password');
      return;
    }

    if (!email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    const { data, error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      Alert.alert('Login Failed', error.message);
      return;
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Reset Password',
      'Password reset functionality coming soon!',
      [{ text: 'OK' }]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.logoContainer}>
            <View style={styles.logoRing}>
              <Activity size={48} color={COLORS.accent.primary} strokeWidth={2.5} />
            </View>
          </View>
          <Text style={styles.brandName}>TRAINTRACK</Text>
          <Text style={styles.tagline}>Track. Progress. Dominate.</Text>
        </View>

        {/* Form Card */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>SIGN IN</Text>

          {/* Email Input */}
          <View style={[
            styles.inputContainer,
            focusedInput === 'email' && styles.inputContainerFocused
          ]}>
            <View style={[
              styles.inputIcon,
              focusedInput === 'email' && styles.inputIconFocused
            ]}>
              <Mail
                size={20}
                color={focusedInput === 'email' ? COLORS.accent.primary : COLORS.text.tertiary}
                strokeWidth={2}
              />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Email address"
              placeholderTextColor={COLORS.text.tertiary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              editable={!loading}
              onFocus={() => setFocusedInput('email')}
              onBlur={() => setFocusedInput(null)}
            />
          </View>

          {/* Password Input */}
          <View style={[
            styles.inputContainer,
            focusedInput === 'password' && styles.inputContainerFocused
          ]}>
            <View style={[
              styles.inputIcon,
              focusedInput === 'password' && styles.inputIconFocused
            ]}>
              <Lock
                size={20}
                color={focusedInput === 'password' ? COLORS.accent.primary : COLORS.text.tertiary}
                strokeWidth={2}
              />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={COLORS.text.tertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              onFocus={() => setFocusedInput('password')}
              onBlur={() => setFocusedInput(null)}
            />
          </View>

          {/* Forgot Password */}
          <Pressable onPress={handleForgotPassword} style={styles.forgotButton}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </Pressable>

          {/* Sign In Button */}
          <Pressable
            style={[styles.signInButton, loading && styles.signInButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.text.inverse} size="small" />
            ) : (
              <>
                <Text style={styles.signInButtonText}>SIGN IN</Text>
                <ChevronRight size={20} color={COLORS.text.inverse} strokeWidth={2.5} />
              </>
            )}
          </Pressable>
        </View>

        {/* Sign Up Link */}
        <View style={styles.signUpContainer}>
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>NEW HERE?</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable
            onPress={() => router.push('/auth/signup')}
            style={styles.signUpButton}
          >
            <Text style={styles.signUpButtonText}>Create Account</Text>
            <ChevronRight size={18} color={COLORS.accent.primary} strokeWidth={2.5} />
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  scrollContent: {
    flexGrow: 1,
    padding: SPACING.lg,
    paddingTop: SPACING.xxxl + SPACING.xl,
  },

  // Hero Section
  heroSection: {
    alignItems: 'center',
    marginBottom: SPACING.xxxl,
  },
  logoContainer: {
    marginBottom: SPACING.lg,
  },
  logoRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.accent.primaryDim,
    borderWidth: 2,
    borderColor: COLORS.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.glow,
  },
  brandName: {
    ...TYPOGRAPHY.h1,
    color: COLORS.text.primary,
    letterSpacing: 4,
    marginBottom: SPACING.sm,
  },
  tagline: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    letterSpacing: 1,
  },

  // Form Card
  formCard: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  formTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.secondary,
    marginBottom: SPACING.lg,
  },

  // Input
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.elevated,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  inputContainerFocused: {
    borderColor: COLORS.accent.primary,
    backgroundColor: COLORS.background.tertiary,
  },
  inputIcon: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background.tertiary,
  },
  inputIconFocused: {
    backgroundColor: COLORS.accent.primaryDim,
  },
  input: {
    flex: 1,
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },

  // Forgot Password
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: SPACING.lg,
  },
  forgotText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.accent.primary,
    fontWeight: '600',
  },

  // Sign In Button
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
    ...SHADOWS.md,
  },
  signInButtonDisabled: {
    opacity: 0.6,
  },
  signInButtonText: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text.inverse,
    letterSpacing: 1,
  },

  // Sign Up
  signUpContainer: {
    marginTop: SPACING.md,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.surface.border,
  },
  dividerText: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.tertiary,
    marginHorizontal: SPACING.md,
    fontSize: 10,
  },
  signUpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent.primaryDim,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.surface.borderAccent,
    paddingVertical: SPACING.md,
    gap: SPACING.xs,
  },
  signUpButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.accent.primary,
  },
});
