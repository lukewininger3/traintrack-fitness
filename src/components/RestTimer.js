import { Pause, Play, RotateCcw, Settings, X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { TYPOGRAPHY, SPACING, RADIUS } from '../theme/design';
import { useTimer } from '../contexts/TimerContext';
import { useTheme } from '../contexts/ThemeContext';
import { DURATION_PRESETS } from '../utils/timerStorage';

/**
 * Rest Timer Floating Button
 * Shows a small floating button that expands to full overlay when tapped
 * Uses global TimerContext so timer persists across screens
 */
export default function RestTimerButton() {
  const timer = useTimer();
  const { colors: themeColors } = useTheme();
  const [showSettings, setShowSettings] = useState(false);

  return (
    <>
      {/* Floating Button (bottom-left corner) */}
      <Pressable
        style={[
          styles.floatingButton,
          { backgroundColor: themeColors.background.elevated, borderColor: themeColors.surface.border },
          timer.isRunning && { borderColor: themeColors.accent.primary, backgroundColor: themeColors.accent.primaryDim },
          timer.isComplete && { borderColor: themeColors.success, backgroundColor: themeColors.successDim },
        ]}
        onPress={() => timer.setIsExpanded(true)}
        accessibilityLabel={`Rest timer: ${timer.formattedTime}`}
        accessibilityRole="button"
      >
        {/* Circular Progress Ring - depletes as time runs down */}
        {timer.isRunning && (
          <View style={styles.progressRingContainer}>
            <Svg width={68} height={68} style={styles.progressSvg}>
              {/* Background circle */}
              <Circle
                cx={34}
                cy={34}
                r={30}
                stroke={themeColors.surface.border}
                strokeWidth={3}
                fill="transparent"
              />
              {/* Progress circle - starts full and depletes as time runs down */}
              <Circle
                cx={34}
                cy={34}
                r={30}
                stroke={themeColors.accent.primary}
                strokeWidth={3}
                fill="transparent"
                strokeDasharray={`${2 * Math.PI * 30}`}
                strokeDashoffset={`${2 * Math.PI * 30 * timer.progress}`}
                strokeLinecap="round"
                transform="rotate(-90, 34, 34)"
              />
            </Svg>
          </View>
        )}
        <Text
          style={[
            styles.floatingButtonText,
            { color: themeColors.text.secondary },
            timer.isRunning && { color: themeColors.accent.primary },
            timer.isComplete && { color: themeColors.success },
          ]}
        >
          {timer.formattedTime}
        </Text>
      </Pressable>

      {/* Expanded Overlay */}
      <Modal
        visible={timer.isExpanded}
        transparent
        animationType="fade"
        onRequestClose={() => timer.setIsExpanded(false)}
      >
        <Pressable style={styles.overlay} onPress={() => timer.setIsExpanded(false)}>
          <Pressable style={[styles.container, { backgroundColor: themeColors.background.secondary, borderColor: themeColors.surface.border }]}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={[styles.headerTitle, { color: themeColors.text.secondary }]}>REST TIMER</Text>
              <View style={styles.headerButtons}>
                <Pressable
                  style={[styles.headerButton, { backgroundColor: themeColors.surface.card }]}
                  onPress={() => setShowSettings(!showSettings)}
                  accessibilityLabel="Timer settings"
                  accessibilityRole="button"
                >
                  <Settings
                    size={20}
                    color={showSettings ? themeColors.accent.primary : themeColors.text.secondary}
                    strokeWidth={2}
                  />
                </Pressable>
                <Pressable
                  style={[styles.headerButton, { backgroundColor: themeColors.surface.card }]}
                  onPress={() => timer.setIsExpanded(false)}
                  accessibilityLabel="Close timer"
                  accessibilityRole="button"
                >
                  <X size={20} color={themeColors.text.secondary} strokeWidth={2} />
                </Pressable>
              </View>
            </View>

            {/* Settings Panel */}
            {showSettings && (
              <View style={[styles.settingsPanel, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }]}>
                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <Text style={[styles.settingLabel, { color: themeColors.text.primary }]}>Auto-Start Timer</Text>
                    <Text style={[styles.settingDescription, { color: themeColors.text.tertiary }]}>
                      Start rest timer automatically after logging a set
                    </Text>
                  </View>
                  <Switch
                    value={timer.isAutoMode}
                    onValueChange={() => timer.toggleTimerMode()}
                    trackColor={{
                      false: themeColors.surface.border,
                      true: themeColors.accent.primaryDim,
                    }}
                    thumbColor={
                      timer.isAutoMode
                        ? themeColors.accent.primary
                        : themeColors.text.tertiary
                    }
                  />
                </View>
                <View style={[styles.settingDivider, { backgroundColor: themeColors.surface.border }]} />
                <View style={styles.settingRow}>
                  <Text style={[styles.settingLabel, { color: themeColors.text.primary }]}>Haptic Feedback</Text>
                  <Switch
                    value={timer.settings.hapticEnabled}
                    onValueChange={(value) => timer.updateSetting('hapticEnabled', value)}
                    trackColor={{
                      false: themeColors.surface.border,
                      true: themeColors.accent.primaryDim,
                    }}
                    thumbColor={
                      timer.settings.hapticEnabled
                        ? themeColors.accent.primary
                        : themeColors.text.tertiary
                    }
                  />
                </View>
              </View>
            )}

            {/* Timer Display */}
            <View style={styles.timerContainer}>
              {/* Progress Ring with SVG */}
              <View style={[styles.progressRing, { backgroundColor: themeColors.surface.card }]}>
                <Svg width={200} height={200} style={styles.progressSvgLarge}>
                  {/* Background circle */}
                  <Circle
                    cx={100}
                    cy={100}
                    r={96}
                    stroke={themeColors.surface.border}
                    strokeWidth={4}
                    fill="transparent"
                  />
                  {/* Progress circle - depletes as time runs down */}
                  <Circle
                    cx={100}
                    cy={100}
                    r={96}
                    stroke={timer.isComplete ? themeColors.success : themeColors.accent.primary}
                    strokeWidth={4}
                    fill="transparent"
                    strokeDasharray={`${2 * Math.PI * 96}`}
                    strokeDashoffset={`${2 * Math.PI * 96 * timer.progress}`}
                    strokeLinecap="round"
                    transform="rotate(-90, 100, 100)"
                  />
                </Svg>
                {/* Inner Circle */}
                <View style={[styles.timerInner, { backgroundColor: themeColors.background.secondary }]}>
                  <Text
                    style={[
                      styles.timerText,
                      { color: themeColors.text.primary },
                      timer.isRunning && { color: themeColors.accent.primary },
                      timer.isComplete && { color: themeColors.success },
                    ]}
                  >
                    {timer.formattedTime}
                  </Text>
                  <Text style={[styles.timerLabel, { color: themeColors.text.tertiary }]}>
                    {timer.isComplete
                      ? 'COMPLETE'
                      : timer.isRunning
                      ? 'RESTING'
                      : 'READY'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Controls */}
            <View style={styles.controls}>
              <Pressable
                style={[styles.controlButton, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }]}
                onPress={timer.reset}
              >
                <RotateCcw size={24} color={themeColors.text.secondary} strokeWidth={2} />
              </Pressable>

              <Pressable
                style={[
                  styles.playButton,
                  { backgroundColor: themeColors.accent.primary, shadowColor: themeColors.accent.primary },
                  timer.isRunning && { backgroundColor: themeColors.secondary.primary },
                ]}
                onPress={timer.toggle}
              >
                {timer.isRunning ? (
                  <Pause size={32} color={themeColors.text.inverse} strokeWidth={2.5} />
                ) : (
                  <Play
                    size={32}
                    color={themeColors.text.inverse}
                    strokeWidth={2.5}
                    style={{ marginLeft: 4 }}
                  />
                )}
              </Pressable>
            </View>

            {/* Duration Presets */}
            <View style={styles.presets}>
              {DURATION_PRESETS.map((preset) => (
                <Pressable
                  key={preset.value}
                  style={[
                    styles.presetButton,
                    { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border },
                    timer.duration === preset.value && { backgroundColor: themeColors.accent.primaryDim, borderColor: themeColors.surface.borderAccent },
                  ]}
                  onPress={() => timer.setDuration(preset.value)}
                >
                  <Text
                    style={[
                      styles.presetText,
                      { color: themeColors.text.secondary },
                      timer.duration === preset.value && { color: themeColors.accent.primary },
                    ]}
                  >
                    {preset.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // Floating Button - positioned bottom-left
  floatingButton: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  floatingButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressRingContainer: {
    position: 'absolute',
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressSvg: {
    position: 'absolute',
  },

  // Overlay
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    maxWidth: 400,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    borderWidth: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  headerTitle: {
    ...TYPOGRAPHY.label,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  headerButton: {
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
  },

  // Settings
  settingsPanel: {
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  settingInfo: {
    flex: 1,
    marginRight: SPACING.md,
  },
  settingLabel: {
    ...TYPOGRAPHY.body,
  },
  settingDescription: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
  },
  settingDivider: {
    height: 1,
    marginVertical: SPACING.sm,
  },

  // Timer Display
  timerContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  progressRing: {
    width: 200,
    height: 200,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressSvgLarge: {
    position: 'absolute',
  },
  timerInner: {
    width: 180,
    height: 180,
    borderRadius: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    ...TYPOGRAPHY.stat,
  },
  timerLabel: {
    ...TYPOGRAPHY.label,
    marginTop: SPACING.xs,
  },

  // Controls
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },

  // Presets
  presets: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  presetButton: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  presetText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
  },
});
