import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { loadTimerSettings, saveTimerSettings, TIMER_MODES } from '../utils/timerStorage';

const TimerContext = createContext(null);

export function TimerProvider({ children }) {
  const [duration, setDuration] = useState(90);
  const [timeRemaining, setTimeRemaining] = useState(90);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [settings, setSettings] = useState({
    hapticEnabled: true,
    autoStart: false,
    timerMode: TIMER_MODES.MANUAL,
  });
  const intervalRef = useRef(null);

  // Load settings on mount
  useEffect(() => {
    loadTimerSettings().then((loaded) => {
      setSettings(loaded);
      if (loaded.lastUsedDuration) {
        setDuration(loaded.lastUsedDuration);
        setTimeRemaining(loaded.lastUsedDuration);
      }
    });
  }, []);

  // Clear interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Keep screen awake while timer is running
  useEffect(() => {
    if (isRunning) {
      // Prevent screen from sleeping during rest timer
      activateKeepAwakeAsync('rest-timer').catch((err) => {
        console.warn('Failed to activate keep awake:', err);
      });
    } else {
      // Allow screen to sleep when timer is not running
      deactivateKeepAwake('rest-timer');
    }

    return () => {
      // Cleanup: deactivate on unmount
      deactivateKeepAwake('rest-timer');
    };
  }, [isRunning]);

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
          if (settings.hapticEnabled) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
  }, [isRunning, settings.hapticEnabled]);

  // Start the timer
  const start = useCallback(() => {
    if (settings.hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setIsComplete(false);
    setIsRunning(true);
  }, [settings.hapticEnabled]);

  // Pause the timer
  const pause = useCallback(() => {
    if (settings.hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setIsRunning(false);
  }, [settings.hapticEnabled]);

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
    if (settings.hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setIsRunning(false);
    setIsComplete(false);
    setTimeRemaining(duration);
  }, [duration, settings.hapticEnabled]);

  // Set a new duration and reset timer
  const setNewDuration = useCallback((newDuration) => {
    if (settings.hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setDuration(newDuration);
    setTimeRemaining(newDuration);
    setIsComplete(false);
    saveTimerSettings({ lastUsedDuration: newDuration });
  }, [settings.hapticEnabled]);

  // Start timer with a specific duration
  const startWithDuration = useCallback((newDuration) => {
    if (settings.hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setDuration(newDuration);
    setTimeRemaining(newDuration);
    setIsComplete(false);
    setIsRunning(true);
    saveTimerSettings({ lastUsedDuration: newDuration });
  }, [settings.hapticEnabled]);

  // Format time as MM:SS (with bounds checking)
  const formatTime = useCallback((seconds) => {
    const safeSeconds = Math.max(0, Math.floor(seconds || 0));
    const mins = Math.floor(safeSeconds / 60);
    const secs = safeSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Update a setting
  const updateSetting = useCallback(async (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    await saveTimerSettings(newSettings);
  }, [settings]);

  // Called when a set is logged - auto-starts timer if in auto mode
  const onSetLogged = useCallback(() => {
    if (settings.timerMode === TIMER_MODES.AUTO) {
      // Reset and start the timer with current duration
      if (settings.hapticEnabled) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      setTimeRemaining(duration);
      setIsComplete(false);
      setIsRunning(true);
    }
  }, [settings.timerMode, settings.hapticEnabled, duration]);

  // Toggle timer mode between auto and manual
  const toggleTimerMode = useCallback(async () => {
    const newMode = settings.timerMode === TIMER_MODES.AUTO ? TIMER_MODES.MANUAL : TIMER_MODES.AUTO;
    const newSettings = { ...settings, timerMode: newMode };
    setSettings(newSettings);
    await saveTimerSettings(newSettings);
  }, [settings]);

  // Check if timer is in auto mode
  const isAutoMode = settings.timerMode === TIMER_MODES.AUTO;

  // Calculate progress percentage (0-1) with bounds checking
  const safeTimeRemaining = Math.max(0, timeRemaining);
  const safeDuration = Math.max(1, duration); // Avoid division by zero
  const progress = Math.min(1, Math.max(0, (safeDuration - safeTimeRemaining) / safeDuration));

  const value = {
    // State
    timeRemaining,
    duration,
    isRunning,
    isComplete,
    isExpanded,
    progress,
    formattedTime: formatTime(timeRemaining),
    settings,
    isAutoMode,

    // Actions
    start,
    pause,
    toggle,
    reset,
    setDuration: setNewDuration,
    startWithDuration,
    formatTime,
    setIsExpanded,
    updateSetting,
    onSetLogged,
    toggleTimerMode,
  };

  return (
    <TimerContext.Provider value={value}>
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
}

export { TIMER_MODES };
export default TimerContext;
