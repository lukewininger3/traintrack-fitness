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

  // Calculate progress for circular indicator
  const progressDegrees = timer.progress * 360;

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
      >
        <Text
          style={[
            styles.floatingButtonText,
            timer.isRunning && styles.floatingButtonTextActive,
            timer.isComplete && styles.floatingButtonTextComplete,
          ]}
        >
          {timer.formattedTime}
        </Text>
        {timer.isRunning && (
          <View style={styles.floatingButtonPulse} />
        )}
      </Pressable>

      {/* Expanded Overlay */}
      <Modal
        visible={timer.isExpanded}
        transparent
        animationType="fade"
        onRequestClose={() => timer.setIsExpanded(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>REST TIMER</Text>
              <View style={styles.headerButtons}>
                <Pressable
                  style={styles.headerButton}
                  onPress={() => setShowSettings(!showSettings)}
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
                >
                  <X size={20} color={COLORS.text.secondary} strokeWidth={2} />
                </Pressable>
              </View>
            </View>

            {/* Settings Panel */}
            {showSettings && (
              <View style={styles.settingsPanel}>
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
              {/* Progress Ring Background */}
              <View style={styles.progressRing}>
                {/* Progress Fill */}
                <View
                  style={[
                    styles.progressFill,
                    {
                      transform: [{ rotate: `${progressDegrees}deg` }],
                    },
                  ]}
                />
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

              <Pressable
                style={styles.controlButton}
                onPress={() => timer.setIsExpanded(false)}
              >
                <X size={24} color={COLORS.text.secondary} strokeWidth={2} />
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
          </View>
        </View>
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
  floatingButtonPulse: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: COLORS.accent.primary,
    opacity: 0.5,
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
  settingLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
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
    borderWidth: 4,
    borderColor: COLORS.surface.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  progressFill: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 4,
    borderColor: COLORS.accent.primary,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
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
