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
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../theme/design';
import { useTimer } from '../contexts/TimerContext';
import { DURATION_PRESETS } from '../utils/timerStorage';

/**
 * Rest Timer Floating Button
 * Shows a small floating button that expands to full overlay when tapped
 * Uses global TimerContext so timer persists across screens
 */
export default function RestTimerButton() {
  const timer = useTimer();
  const [showSettings, setShowSettings] = useState(false);

  return (
    <>
      {/* Floating Button (bottom-left corner) */}
      <Pressable
        style={[
          styles.floatingButton,
          timer.isRunning && styles.floatingButtonActive,
          timer.isComplete && styles.floatingButtonComplete,
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
                stroke={COLORS.surface.border}
                strokeWidth={3}
                fill="transparent"
              />
              {/* Progress circle - starts full and depletes as time runs down */}
              <Circle
                cx={34}
                cy={34}
                r={30}
                stroke={COLORS.accent.primary}
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
            timer.isRunning && styles.floatingButtonTextActive,
            timer.isComplete && styles.floatingButtonTextComplete,
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
          <Pressable style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>REST TIMER</Text>
              <View style={styles.headerButtons}>
                <Pressable
                  style={styles.headerButton}
                  onPress={() => setShowSettings(!showSettings)}
                  accessibilityLabel="Timer settings"
                  accessibilityRole="button"
                >
                  <Settings
                    size={20}
                    color={showSettings ? COLORS.accent.primary : COLORS.text.secondary}
                    strokeWidth={2}
                  />
                </Pressable>
                <Pressable
                  style={styles.headerButton}
                  onPress={() => timer.setIsExpanded(false)}
                  accessibilityLabel="Close timer"
                  accessibilityRole="button"
                >
                  <X size={20} color={COLORS.text.secondary} strokeWidth={2} />
                </Pressable>
              </View>
            </View>

            {/* Settings Panel */}
            {showSettings && (
              <View style={styles.settingsPanel}>
                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>Auto-Start Timer</Text>
                    <Text style={styles.settingDescription}>
                      Start rest timer automatically after logging a set
                    </Text>
                  </View>
                  <Switch
                    value={timer.isAutoMode}
                    onValueChange={() => timer.toggleTimerMode()}
                    trackColor={{
                      false: COLORS.surface.border,
                      true: COLORS.accent.primaryDim,
                    }}
                    thumbColor={
                      timer.isAutoMode
                        ? COLORS.accent.primary
                        : COLORS.text.tertiary
                    }
                  />
                </View>
                <View style={styles.settingDivider} />
                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>Haptic Feedback</Text>
                  <Switch
                    value={timer.settings.hapticEnabled}
                    onValueChange={(value) => timer.updateSetting('hapticEnabled', value)}
                    trackColor={{
                      false: COLORS.surface.border,
                      true: COLORS.accent.primaryDim,
                    }}
                    thumbColor={
                      timer.settings.hapticEnabled
                        ? COLORS.accent.primary
                        : COLORS.text.tertiary
                    }
                  />
                </View>
              </View>
            )}

            {/* Timer Display */}
            <View style={styles.timerContainer}>
              {/* Progress Ring with SVG */}
              <View style={styles.progressRing}>
                <Svg width={200} height={200} style={styles.progressSvgLarge}>
                  {/* Background circle */}
                  <Circle
                    cx={100}
                    cy={100}
                    r={96}
                    stroke={COLORS.surface.border}
                    strokeWidth={4}
                    fill="transparent"
                  />
                  {/* Progress circle - depletes as time runs down */}
                  <Circle
                    cx={100}
                    cy={100}
                    r={96}
                    stroke={timer.isComplete ? COLORS.success : COLORS.accent.primary}
                    strokeWidth={4}
                    fill="transparent"
                    strokeDasharray={`${2 * Math.PI * 96}`}
                    strokeDashoffset={`${2 * Math.PI * 96 * timer.progress}`}
                    strokeLinecap="round"
                    transform="rotate(-90, 100, 100)"
                  />
                </Svg>
                {/* Inner Circle */}
                <View style={styles.timerInner}>
                  <Text
                    style={[
                      styles.timerText,
                      timer.isRunning && styles.timerTextActive,
                      timer.isComplete && styles.timerTextComplete,
                    ]}
                  >
                    {timer.formattedTime}
                  </Text>
                  <Text style={styles.timerLabel}>
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
                style={styles.controlButton}
                onPress={timer.reset}
              >
                <RotateCcw size={24} color={COLORS.text.secondary} strokeWidth={2} />
              </Pressable>

              <Pressable
                style={[
                  styles.playButton,
                  timer.isRunning && styles.playButtonActive,
                ]}
                onPress={timer.toggle}
              >
                {timer.isRunning ? (
                  <Pause size={32} color={COLORS.text.inverse} strokeWidth={2.5} />
                ) : (
                  <Play
                    size={32}
                    color={COLORS.text.inverse}
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
                    timer.duration === preset.value && styles.presetButtonActive,
                  ]}
                  onPress={() => timer.setDuration(preset.value)}
                >
                  <Text
                    style={[
                      styles.presetText,
                      timer.duration === preset.value && styles.presetTextActive,
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
    backgroundColor: COLORS.background.elevated,
    borderWidth: 2,
    borderColor: COLORS.surface.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  floatingButtonActive: {
    borderColor: COLORS.accent.primary,
    backgroundColor: COLORS.accent.primaryDim,
  },
  floatingButtonComplete: {
    borderColor: COLORS.success,
    backgroundColor: 'rgba(0, 255, 136, 0.15)',
  },
  floatingButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text.secondary,
  },
  floatingButtonTextActive: {
    color: COLORS.accent.primary,
  },
  floatingButtonTextComplete: {
    color: COLORS.success,
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
    backgroundColor: COLORS.background.secondary,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
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
    color: COLORS.text.secondary,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  headerButton: {
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surface.card,
  },

  // Settings
  settingsPanel: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
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
    color: COLORS.text.primary,
  },
  settingDescription: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  settingDivider: {
    height: 1,
    backgroundColor: COLORS.surface.border,
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
    backgroundColor: COLORS.surface.card,
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
    backgroundColor: COLORS.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    ...TYPOGRAPHY.stat,
    color: COLORS.text.primary,
  },
  timerTextActive: {
    color: COLORS.accent.primary,
  },
  timerTextComplete: {
    color: COLORS.success,
  },
  timerLabel: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.tertiary,
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
    backgroundColor: COLORS.surface.card,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.accent.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  playButtonActive: {
    backgroundColor: COLORS.secondary.primary,
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
    backgroundColor: COLORS.surface.card,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
  },
  presetButtonActive: {
    backgroundColor: COLORS.accent.primaryDim,
    borderColor: COLORS.surface.borderAccent,
  },
  presetText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  presetTextActive: {
    color: COLORS.accent.primary,
  },
});
