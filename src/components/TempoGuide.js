import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { Play, Pause, ChevronUp, ChevronDown, Settings, X, Volume2 } from 'lucide-react-native';
import { TYPOGRAPHY, SPACING, RADIUS } from '../theme/design';
import { useTheme } from '../contexts/ThemeContext';

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

// Generate a simple WAV beep sound as base64
const generateBeepWav = (frequency, durationMs = 150, volume = 0.5) => {
  const sampleRate = 44100;
  const numSamples = Math.floor(sampleRate * durationMs / 1000);
  const numChannels = 1;
  const bitsPerSample = 16;

  // Create WAV header
  const dataSize = numSamples * numChannels * (bitsPerSample / 8);
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF header
  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
  view.setUint16(32, numChannels * (bitsPerSample / 8), true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // Generate sine wave
  for (let i = 0; i < numSamples; i++) {
    // Apply envelope (fade in/out) for cleaner sound
    let envelope = 1;
    const fadeLength = numSamples * 0.1;
    if (i < fadeLength) {
      envelope = i / fadeLength;
    } else if (i > numSamples - fadeLength) {
      envelope = (numSamples - i) / fadeLength;
    }

    const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * volume * envelope;
    const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
    view.setInt16(44 + i * 2, intSample, true);
  }

  // Convert to base64
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

// Pre-generate beep sounds - higher pitch for lift, lower for lower
const LIFT_BEEP_BASE64 = generateBeepWav(880, 150, 0.6); // A5 - higher pitch
const LOWER_BEEP_BASE64 = generateBeepWav(440, 200, 0.6); // A4 - lower pitch

export default function TempoGuide({ visible, onClose }) {
  const { colors: themeColors } = useTheme();
  const [isRunning, setIsRunning] = useState(false);
  const [liftDuration, setLiftDuration] = useState(2); // seconds
  const [lowerDuration, setLowerDuration] = useState(3); // seconds
  const [currentPhase, setCurrentPhase] = useState(null); // 'lift' | 'lower' | null
  const [countdown, setCountdown] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [useSound, setUseSound] = useState(true);

  const intervalRef = useRef(null);
  const phaseRef = useRef('lift');
  const countdownRef = useRef(0);
  const liftSoundRef = useRef(null);
  const lowerSoundRef = useRef(null);

  // Initialize audio sounds
  useEffect(() => {
    const loadSounds = async () => {
      try {
        // Configure audio mode for playback through speaker/headphones
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });

        // Load lift sound
        const { sound: liftSound } = await Audio.Sound.createAsync(
          { uri: `data:audio/wav;base64,${LIFT_BEEP_BASE64}` },
          { shouldPlay: false }
        );
        liftSoundRef.current = liftSound;

        // Load lower sound
        const { sound: lowerSound } = await Audio.Sound.createAsync(
          { uri: `data:audio/wav;base64,${LOWER_BEEP_BASE64}` },
          { shouldPlay: false }
        );
        lowerSoundRef.current = lowerSound;
      } catch (error) {
        console.warn('Failed to load tempo sounds:', error);
      }
    };

    loadSounds();

    return () => {
      // Cleanup sounds
      if (liftSoundRef.current) {
        liftSoundRef.current.unloadAsync();
      }
      if (lowerSoundRef.current) {
        lowerSoundRef.current.unloadAsync();
      }
    };
  }, []);

  // Play sound or haptic feedback for phase changes
  const playBeep = useCallback(async (isLift) => {
    if (useSound) {
      try {
        const sound = isLift ? liftSoundRef.current : lowerSoundRef.current;
        if (sound) {
          await sound.setPositionAsync(0);
          await sound.playAsync();
        }
      } catch (error) {
        // Fallback to haptics if sound fails
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
    } else {
      // Haptic fallback when sound is disabled
      if (isLift) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setTimeout(() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }, 100);
      }
    }
  }, [useSound]);

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
    <View style={[styles.container, { backgroundColor: themeColors.surface.elevated, borderColor: themeColors.surface.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: themeColors.text.primary }]}>Tempo Guide</Text>
        <View style={styles.headerButtons}>
          <Pressable
            onPress={() => setShowSettings(!showSettings)}
            style={styles.iconButton}
            hitSlop={8}
          >
            <Settings size={20} color={themeColors.text.secondary} />
          </Pressable>
          <Pressable onPress={onClose} style={styles.iconButton} hitSlop={8}>
            <X size={20} color={themeColors.text.secondary} />
          </Pressable>
        </View>
      </View>

      {/* Settings Panel */}
      {showSettings && (
        <View style={[styles.settingsPanel, { backgroundColor: themeColors.background.tertiary }]}>
          <View style={styles.settingRow}>
            <View style={styles.settingLabel}>
              <ChevronUp size={16} color={themeColors.accent.primary} />
              <Text style={[styles.settingText, { color: themeColors.text.secondary }]}>Lift Duration</Text>
            </View>
            <View style={styles.settingControls}>
              <Pressable
                onPress={() => adjustDuration('lift', -1)}
                style={[styles.adjustButton, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }]}
                disabled={isRunning}
              >
                <Text style={[styles.adjustButtonText, { color: themeColors.text.primary }]}>−</Text>
              </Pressable>
              <Text style={[styles.durationValue, { color: themeColors.text.primary }]}>{liftDuration}s</Text>
              <Pressable
                onPress={() => adjustDuration('lift', 1)}
                style={[styles.adjustButton, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }]}
                disabled={isRunning}
              >
                <Text style={[styles.adjustButtonText, { color: themeColors.text.primary }]}>+</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingLabel}>
              <ChevronDown size={16} color={themeColors.secondary.primary} />
              <Text style={[styles.settingText, { color: themeColors.text.secondary }]}>Lower Duration</Text>
            </View>
            <View style={styles.settingControls}>
              <Pressable
                onPress={() => adjustDuration('lower', -1)}
                style={[styles.adjustButton, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }]}
                disabled={isRunning}
              >
                <Text style={[styles.adjustButtonText, { color: themeColors.text.primary }]}>−</Text>
              </Pressable>
              <Text style={[styles.durationValue, { color: themeColors.text.primary }]}>{lowerDuration}s</Text>
              <Pressable
                onPress={() => adjustDuration('lower', 1)}
                style={[styles.adjustButton, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }]}
                disabled={isRunning}
              >
                <Text style={[styles.adjustButtonText, { color: themeColors.text.primary }]}>+</Text>
              </Pressable>
            </View>
          </View>

          <Pressable
            onPress={() => setUseSound(!useSound)}
            style={styles.toggleRow}
          >
            <View style={styles.settingLabel}>
              <Volume2 size={16} color={themeColors.text.secondary} />
              <Text style={[styles.settingText, { color: themeColors.text.secondary }]}>Sound</Text>
            </View>
            <View style={[styles.toggle, { backgroundColor: themeColors.surface.border }, useSound && { backgroundColor: themeColors.accent.primary }]}>
              <View style={[styles.toggleKnob, { backgroundColor: themeColors.text.primary }, useSound && { backgroundColor: themeColors.text.inverse, transform: [{ translateX: 20 }] }]} />
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
              currentPhase === 'lift'
                ? { backgroundColor: themeColors.accent.primaryDim }
                : { backgroundColor: themeColors.secondary.dim }
            ]}>
              {currentPhase === 'lift' ? (
                <ChevronUp size={48} color={themeColors.accent.primary} strokeWidth={3} />
              ) : (
                <ChevronDown size={48} color={themeColors.secondary.primary} strokeWidth={3} />
              )}
            </View>
            <Text style={[styles.phaseText, { color: themeColors.text.secondary }]}>
              {currentPhase === 'lift' ? 'LIFT' : 'LOWER'}
            </Text>
            <Text style={[styles.countdownText, { color: themeColors.text.primary }]}>{countdown}</Text>
          </>
        ) : (
          <View style={styles.readyState}>
            <Text style={[styles.tempoPreview, { color: themeColors.text.primary }]}>
              {liftDuration}s up • {lowerDuration}s down
            </Text>
            <Text style={[styles.readyHint, { color: themeColors.text.tertiary }]}>Press play to start</Text>
          </View>
        )}
      </View>

      {/* Play/Pause Button */}
      <Pressable
        onPress={toggleRunning}
        style={[styles.playButton, { backgroundColor: themeColors.accent.primary }, isRunning && { backgroundColor: themeColors.secondary.primary }]}
      >
        {isRunning ? (
          <Pause size={28} color={themeColors.text.inverse} strokeWidth={2.5} />
        ) : (
          <Play size={28} color={themeColors.text.inverse} strokeWidth={2.5} />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
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
  },
  headerButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  iconButton: {
    padding: SPACING.xs,
  },
  settingsPanel: {
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
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustButtonText: {
    ...TYPOGRAPHY.h3,
  },
  durationValue: {
    ...TYPOGRAPHY.h4,
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
    padding: 2,
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  toggleKnobActive: {
    transform: [{ translateX: 20 }],
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
  phaseText: {
    ...TYPOGRAPHY.label,
    marginBottom: SPACING.xs,
  },
  countdownText: {
    ...TYPOGRAPHY.stat,
  },
  readyState: {
    alignItems: 'center',
  },
  tempoPreview: {
    ...TYPOGRAPHY.h3,
    marginBottom: SPACING.xs,
  },
  readyHint: {
    ...TYPOGRAPHY.caption,
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
});
