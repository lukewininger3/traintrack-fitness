import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Play, Pause, ChevronUp, ChevronDown, Settings, X } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../theme/design';

/**
 * TempoGuide Component
 *
 * Provides audio/haptic cues for rep tempo during a set.
 * - "Lift" phase: Higher pitch beep
 * - "Lower" phase: Lower pitch beep
 *
 * Standard tempo notation: X-Y-Z-W
 * - X: Eccentric (lowering) seconds
 * - Y: Pause at bottom
 * - Z: Concentric (lifting) seconds
 * - W: Pause at top
 *
 * Simplified version: Just lift/lower durations
 */

export default function TempoGuide({ visible, onClose }) {
  const [isRunning, setIsRunning] = useState(false);
  const [liftDuration, setLiftDuration] = useState(2); // seconds
  const [lowerDuration, setLowerDuration] = useState(3); // seconds
  const [currentPhase, setCurrentPhase] = useState(null); // 'lift' | 'lower' | null
  const [countdown, setCountdown] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [useVibration, setUseVibration] = useState(true);

  const intervalRef = useRef(null);
  const phaseRef = useRef('lift');
  const countdownRef = useRef(0);

  // Play haptic feedback for phase changes
  const playBeep = useCallback(async (isLift) => {
    if (useVibration) {
      if (isLift) {
        // Strong single vibration for lift
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } else {
        // Double medium vibration for lower
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setTimeout(() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }, 100);
      }
    }
  }, [useVibration]);

  // Start/stop the tempo guide
  const toggleRunning = useCallback(() => {
    if (isRunning) {
      // Stop
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsRunning(false);
      setCurrentPhase(null);
      setCountdown(0);
    } else {
      // Start with lift phase
      phaseRef.current = 'lift';
      countdownRef.current = liftDuration;
      setCurrentPhase('lift');
      setCountdown(liftDuration);
      setIsRunning(true);

      // Initial beep
      playBeep(true);

      // Start interval
      intervalRef.current = setInterval(() => {
        countdownRef.current -= 1;

        if (countdownRef.current <= 0) {
          // Switch phases
          if (phaseRef.current === 'lift') {
            phaseRef.current = 'lower';
            countdownRef.current = lowerDuration;
            setCurrentPhase('lower');
            playBeep(false);
          } else {
            phaseRef.current = 'lift';
            countdownRef.current = liftDuration;
            setCurrentPhase('lift');
            playBeep(true);
          }
        }

        setCountdown(countdownRef.current);
      }, 1000);
    }
  }, [isRunning, liftDuration, lowerDuration, playBeep]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Stop when hidden
  useEffect(() => {
    if (!visible && isRunning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsRunning(false);
      setCurrentPhase(null);
      setCountdown(0);
    }
  }, [visible, isRunning]);

  if (!visible) return null;

  const adjustDuration = (type, delta) => {
    if (type === 'lift') {
      setLiftDuration(prev => Math.max(1, Math.min(10, prev + delta)));
    } else {
      setLowerDuration(prev => Math.max(1, Math.min(10, prev + delta)));
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Tempo Guide</Text>
        <View style={styles.headerButtons}>
          <Pressable
            onPress={() => setShowSettings(!showSettings)}
            style={styles.iconButton}
            hitSlop={8}
          >
            <Settings size={20} color={COLORS.text.secondary} />
          </Pressable>
          <Pressable onPress={onClose} style={styles.iconButton} hitSlop={8}>
            <X size={20} color={COLORS.text.secondary} />
          </Pressable>
        </View>
      </View>

      {/* Settings Panel */}
      {showSettings && (
        <View style={styles.settingsPanel}>
          <View style={styles.settingRow}>
            <View style={styles.settingLabel}>
              <ChevronUp size={16} color={COLORS.accent.primary} />
              <Text style={styles.settingText}>Lift Duration</Text>
            </View>
            <View style={styles.settingControls}>
              <Pressable
                onPress={() => adjustDuration('lift', -1)}
                style={styles.adjustButton}
                disabled={isRunning}
              >
                <Text style={styles.adjustButtonText}>−</Text>
              </Pressable>
              <Text style={styles.durationValue}>{liftDuration}s</Text>
              <Pressable
                onPress={() => adjustDuration('lift', 1)}
                style={styles.adjustButton}
                disabled={isRunning}
              >
                <Text style={styles.adjustButtonText}>+</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingLabel}>
              <ChevronDown size={16} color={COLORS.secondary.primary} />
              <Text style={styles.settingText}>Lower Duration</Text>
            </View>
            <View style={styles.settingControls}>
              <Pressable
                onPress={() => adjustDuration('lower', -1)}
                style={styles.adjustButton}
                disabled={isRunning}
              >
                <Text style={styles.adjustButtonText}>−</Text>
              </Pressable>
              <Text style={styles.durationValue}>{lowerDuration}s</Text>
              <Pressable
                onPress={() => adjustDuration('lower', 1)}
                style={styles.adjustButton}
                disabled={isRunning}
              >
                <Text style={styles.adjustButtonText}>+</Text>
              </Pressable>
            </View>
          </View>

          <Pressable
            onPress={() => setUseVibration(!useVibration)}
            style={styles.toggleRow}
          >
            <Text style={styles.settingText}>Vibration</Text>
            <View style={[styles.toggle, useVibration && styles.toggleActive]}>
              <View style={[styles.toggleKnob, useVibration && styles.toggleKnobActive]} />
            </View>
          </Pressable>
        </View>
      )}

      {/* Main Display */}
      <View style={styles.mainDisplay}>
        {isRunning ? (
          <>
            <View style={[
              styles.phaseIndicator,
              currentPhase === 'lift' ? styles.liftPhase : styles.lowerPhase
            ]}>
              {currentPhase === 'lift' ? (
                <ChevronUp size={48} color={COLORS.accent.primary} strokeWidth={3} />
              ) : (
                <ChevronDown size={48} color={COLORS.secondary.primary} strokeWidth={3} />
              )}
            </View>
            <Text style={styles.phaseText}>
              {currentPhase === 'lift' ? 'LIFT' : 'LOWER'}
            </Text>
            <Text style={styles.countdownText}>{countdown}</Text>
          </>
        ) : (
          <View style={styles.readyState}>
            <Text style={styles.tempoPreview}>
              {liftDuration}s up • {lowerDuration}s down
            </Text>
            <Text style={styles.readyHint}>Press play to start</Text>
          </View>
        )}
      </View>

      {/* Play/Pause Button */}
      <Pressable
        onPress={toggleRunning}
        style={[styles.playButton, isRunning && styles.pauseButton]}
      >
        {isRunning ? (
          <Pause size={28} color={COLORS.text.inverse} strokeWidth={2.5} />
        ) : (
          <Play size={28} color={COLORS.text.inverse} strokeWidth={2.5} />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface.elevated,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text.primary,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  iconButton: {
    padding: SPACING.xs,
  },
  settingsPanel: {
    backgroundColor: COLORS.background.tertiary,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  settingText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
  },
  settingControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  adjustButton: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface.card,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustButtonText: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.primary,
  },
  durationValue: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text.primary,
    width: 36,
    textAlign: 'center',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.xs,
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.surface.border,
    padding: 2,
  },
  toggleActive: {
    backgroundColor: COLORS.accent.primary,
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.text.primary,
  },
  toggleKnobActive: {
    transform: [{ translateX: 20 }],
    backgroundColor: COLORS.text.inverse,
  },
  mainDisplay: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
    marginBottom: SPACING.md,
  },
  phaseIndicator: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  liftPhase: {
    backgroundColor: COLORS.accent.primaryDim,
  },
  lowerPhase: {
    backgroundColor: COLORS.secondary.dim,
  },
  phaseText: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
  },
  countdownText: {
    ...TYPOGRAPHY.stat,
    color: COLORS.text.primary,
  },
  readyState: {
    alignItems: 'center',
  },
  tempoPreview: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  readyHint: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
  },
  playButton: {
    backgroundColor: COLORS.accent.primary,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  pauseButton: {
    backgroundColor: COLORS.secondary.primary,
  },
});
