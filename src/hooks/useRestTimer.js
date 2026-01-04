import { useCallback, useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';

/**
 * Custom hook for rest timer functionality
 * @param {Object} options - Timer options
 * @param {number} options.initialDuration - Initial duration in seconds (default: 90)
 * @param {boolean} options.hapticEnabled - Whether haptic feedback is enabled (default: true)
 * @param {Function} options.onComplete - Callback when timer completes
 */
export default function useRestTimer({
  initialDuration = 90,
  hapticEnabled = true,
  onComplete,
} = {}) {
  const [duration, setDuration] = useState(initialDuration);
  const [timeRemaining, setTimeRemaining] = useState(initialDuration);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const intervalRef = useRef(null);

  // Clear interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Timer countdown logic
  useEffect(() => {
    if (!isRunning || timeRemaining <= 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          setIsComplete(true);

          // Haptic feedback on completion
          if (hapticEnabled) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }

          // Call completion callback
          if (onComplete) {
            onComplete();
          }

          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, hapticEnabled, onComplete]);

  // Start the timer
  const start = useCallback(() => {
    if (hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setIsComplete(false);
    setIsRunning(true);
  }, [hapticEnabled]);

  // Pause the timer
  const pause = useCallback(() => {
    if (hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setIsRunning(false);
  }, [hapticEnabled]);

  // Toggle between start and pause
  const toggle = useCallback(() => {
    if (isRunning) {
      pause();
    } else {
      start();
    }
  }, [isRunning, start, pause]);

  // Reset the timer to current duration
  const reset = useCallback(() => {
    if (hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setIsRunning(false);
    setIsComplete(false);
    setTimeRemaining(duration);
  }, [duration, hapticEnabled]);

  // Set a new duration and reset timer
  const setNewDuration = useCallback((newDuration) => {
    if (hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setDuration(newDuration);
    setTimeRemaining(newDuration);
    setIsComplete(false);
  }, [hapticEnabled]);

  // Start timer with a specific duration
  const startWithDuration = useCallback((newDuration) => {
    if (hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setDuration(newDuration);
    setTimeRemaining(newDuration);
    setIsComplete(false);
    setIsRunning(true);
  }, [hapticEnabled]);

  // Format time as MM:SS
  const formatTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Calculate progress percentage (0-1)
  const progress = duration > 0 ? (duration - timeRemaining) / duration : 0;

  return {
    // State
    timeRemaining,
    duration,
    isRunning,
    isComplete,
    progress,
    formattedTime: formatTime(timeRemaining),

    // Actions
    start,
    pause,
    toggle,
    reset,
    setDuration: setNewDuration,
    startWithDuration,
    formatTime,
  };
}
