import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DARK_COLORS, LIGHT_COLORS, ACTIVITY_COLORS } from '../theme/design';

const THEME_STORAGE_KEY = '@traintrack_theme';

const ThemeContext = createContext({
  isDark: true,
  colors: DARK_COLORS,
  toggleTheme: () => {},
  getActivityColor: () => ACTIVITY_COLORS.Other,
});

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(true);
  const [colors, setColors] = useState(DARK_COLORS);

  // Load saved theme preference on mount
  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme !== null) {
        const isDarkMode = savedTheme === 'dark';
        setIsDark(isDarkMode);
        setColors(isDarkMode ? DARK_COLORS : LIGHT_COLORS);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const toggleTheme = async () => {
    try {
      const newIsDark = !isDark;
      setIsDark(newIsDark);
      setColors(newIsDark ? DARK_COLORS : LIGHT_COLORS);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newIsDark ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  // Get activity color with proper muted background for current theme
  const getActivityColor = useCallback((activityType) => {
    const activity = colors.activity?.[activityType] || colors.activity?.Other;
    return activity || ACTIVITY_COLORS.Other;
  }, [colors]);

  const value = useMemo(() => ({
    isDark,
    colors,
    toggleTheme,
    getActivityColor,
  }), [isDark, colors, getActivityColor]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default ThemeContext;
