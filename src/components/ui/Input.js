import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, ANIMATIONS } from '../../theme/design';

const AnimatedView = Animated.createAnimatedComponent(View);

/**
 * Input Component
 *
 * A styled text input with label, error state, and focus animations.
 *
 * @param {string} label - Input label (optional)
 * @param {string} value - Input value
 * @param {function} onChangeText - Change handler
 * @param {string} placeholder - Placeholder text
 * @param {string} error - Error message (optional)
 * @param {string} hint - Hint text below input (optional)
 * @param {boolean} disabled - Disable input
 * @param {boolean} multiline - Enable multiline input
 * @param {number} numberOfLines - Number of lines for multiline
 * @param {string} keyboardType - Keyboard type
 * @param {boolean} secureTextEntry - Password input
 * @param {React.ReactNode} leftIcon - Icon on left side
 * @param {React.ReactNode} rightIcon - Icon on right side
 * @param {function} onRightIconPress - Press handler for right icon
 * @param {string} size - 'sm' | 'md' | 'lg' (default: 'md')
 * @param {object} style - Additional container styles
 * @param {object} inputStyle - Additional input styles
 * @param {string} returnKeyType - Return key type
 * @param {function} onSubmitEditing - Submit handler
 * @param {boolean} autoFocus - Auto focus on mount
 */
export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  hint,
  disabled = false,
  multiline = false,
  numberOfLines = 1,
  keyboardType = 'default',
  secureTextEntry = false,
  leftIcon,
  rightIcon,
  onRightIconPress,
  size = 'md',
  style,
  inputStyle,
  returnKeyType,
  onSubmitEditing,
  autoFocus = false,
  ...props
}) {
  const [isFocused, setIsFocused] = useState(false);
  const borderColor = useSharedValue(COLORS.surface.border);

  const animatedBorderStyle = useAnimatedStyle(() => ({
    borderColor: borderColor.value,
  }));

  const handleFocus = () => {
    setIsFocused(true);
    borderColor.value = withTiming(
      error ? COLORS.error : COLORS.accent.primary,
      { duration: ANIMATIONS.timing.duration }
    );
  };

  const handleBlur = () => {
    setIsFocused(false);
    borderColor.value = withTiming(
      error ? COLORS.error : COLORS.surface.border,
      { duration: ANIMATIONS.timing.duration }
    );
  };

  const sizeStyles = getSizeStyles(size);

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={styles.label}>{label}</Text>
      )}
      <AnimatedView
        style={[
          styles.inputContainer,
          sizeStyles.container,
          error && styles.errorBorder,
          disabled && styles.disabledContainer,
          animatedBorderStyle,
        ]}
      >
        {leftIcon && (
          <View style={styles.leftIconContainer}>
            {leftIcon}
          </View>
        )}
        <TextInput
          style={[
            styles.input,
            sizeStyles.input,
            leftIcon && styles.inputWithLeftIcon,
            rightIcon && styles.inputWithRightIcon,
            multiline && styles.multilineInput,
            disabled && styles.disabledInput,
            inputStyle,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.text.tertiary}
          editable={!disabled}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : 1}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          onFocus={handleFocus}
          onBlur={handleBlur}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          autoFocus={autoFocus}
          {...props}
        />
        {rightIcon && (
          <Pressable
            onPress={onRightIconPress}
            style={styles.rightIconContainer}
            disabled={!onRightIconPress}
          >
            {rightIcon}
          </Pressable>
        )}
      </AnimatedView>
      {(error || hint) && (
        <Text style={[styles.helperText, error && styles.errorText]}>
          {error || hint}
        </Text>
      )}
    </View>
  );
}

function getSizeStyles(size) {
  switch (size) {
    case 'sm':
      return {
        container: styles.smContainer,
        input: styles.smInput,
      };
    case 'lg':
      return {
        container: styles.lgContainer,
        input: styles.lgInput,
      };
    case 'md':
    default:
      return {
        container: styles.mdContainer,
        input: styles.mdInput,
      };
  }
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.elevated,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    color: COLORS.text.primary,
    ...TYPOGRAPHY.body,
  },
  multilineInput: {
    textAlignVertical: 'top',
    paddingTop: SPACING.md,
  },
  inputWithLeftIcon: {
    paddingLeft: 0,
  },
  inputWithRightIcon: {
    paddingRight: 0,
  },
  leftIconContainer: {
    paddingLeft: SPACING.md,
    justifyContent: 'center',
  },
  rightIconContainer: {
    paddingRight: SPACING.md,
    justifyContent: 'center',
  },
  helperText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    marginTop: SPACING.xs,
  },
  errorText: {
    color: COLORS.error,
  },
  errorBorder: {
    borderColor: COLORS.error,
  },
  disabledContainer: {
    opacity: 0.5,
  },
  disabledInput: {
    color: COLORS.text.tertiary,
  },

  // Size: small
  smContainer: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
  },
  smInput: {
    fontSize: 13,
  },

  // Size: medium (default)
  mdContainer: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  mdInput: {
    fontSize: 15,
  },

  // Size: large
  lgContainer: {
    paddingVertical: SPACING.lg - 4,
    paddingHorizontal: SPACING.md,
  },
  lgInput: {
    fontSize: 17,
  },
});

export default Input;
