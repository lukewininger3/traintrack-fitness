import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Pressable,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeInDown, FadeIn, FadeOut } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  BellOff,
  Clock,
  Dumbbell,
  Flame,
  Scale,
  Trophy,
  CalendarDays,
  Moon,
  Sun,
  FileText,
  Shield,
  Download,
  Trash2,
  ChevronRight,
  CreditCard,
  Smartphone,
  Check,
} from 'lucide-react-native';
import Constants from 'expo-constants';

import { useTheme } from '../src/contexts/ThemeContext';
import { exportUserData, deleteAccount, clearAllLocalData } from '../src/utils/dataExport';
import { useAuth } from '../src/contexts/AuthContext';
import { useNotifications } from '../src/contexts/NotificationContext';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../src/theme/design';
import { formatTimeForDisplay, DAY_NAMES, parseTimeString, formatTimeString } from '../src/utils/notificationStorage';

export default function SettingsScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const { user } = useAuth();
  const {
    settings,
    isPermissionGranted,
    requestPermissions,
    updateSetting,
  } = useNotifications();
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerType, setPickerType] = useState(null); // 'time' or 'day'
  const [pickerConfig, setPickerConfig] = useState({
    key: '',
    title: '',
    initialValue: '',
  });

  // Time picker state
  const [selectedHour, setSelectedHour] = useState(9);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState('AM');

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleToggle = useCallback(async (key, value) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (value && !isPermissionGranted) {
      const granted = await requestPermissions();
      if (!granted) {
        Alert.alert(
          'Notifications Disabled',
          'Please enable notifications in your device settings to receive reminders.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }
    }

    await updateSetting(key, value);
  }, [isPermissionGranted, requestPermissions, updateSetting]);

  const openTimePicker = (key, title, initialTime) => {
    const { hours, minutes } = parseTimeString(initialTime);
    const hour12 = hours % 12 || 12;
    const period = hours >= 12 ? 'PM' : 'AM';

    setSelectedHour(hour12);
    setSelectedMinute(minutes);
    setSelectedPeriod(period);
    setPickerConfig({ key, title, initialValue: initialTime });
    setPickerType('time');
    setPickerVisible(true);
  };

  const openDayPicker = () => {
    setPickerConfig({ key: 'weeklyRecapDay', title: 'Select Day', initialValue: settings.weeklyRecapDay });
    setPickerType('day');
    setPickerVisible(true);
  };

  const handleTimeSave = async () => {
    let hours24 = selectedHour;
    if (selectedPeriod === 'PM' && selectedHour !== 12) {
      hours24 = selectedHour + 12;
    } else if (selectedPeriod === 'AM' && selectedHour === 12) {
      hours24 = 0;
    }

    const timeString = formatTimeString(hours24, selectedMinute);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await updateSetting(pickerConfig.key, timeString);
    setPickerVisible(false);
  };

  const handleDaySelect = async (value) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await updateSetting('weeklyRecapDay', value);
    setPickerVisible(false);
  };

  const handleExportData = async () => {
    if (isExporting) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    Alert.alert(
      'Export Data',
      'This will export all your workout data, weight logs, and settings to a JSON file that you can save or share.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export',
          onPress: async () => {
            setIsExporting(true);
            try {
              await exportUserData();
            } finally {
              setIsExporting(false);
            }
          },
        },
      ]
    );
  };

  const handleClearData = () => {
    if (isDeleting) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    const isLoggedIn = !!user;
    const message = isLoggedIn
      ? 'This will permanently delete all your workout data, weight logs, goals, and settings from this device AND your cloud account. This action cannot be undone.'
      : 'This will permanently delete all your workout data, weight logs, goals, and settings from this device. This action cannot be undone.';

    Alert.alert(
      'Delete All Data',
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: () => {
            // Second confirmation for safety
            Alert.alert(
              'Are you absolutely sure?',
              'This will delete ALL your fitness data permanently. There is no way to recover it.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Delete All',
                  style: 'destructive',
                  onPress: async () => {
                    setIsDeleting(true);
                    try {
                      if (isLoggedIn) {
                        const result = await deleteAccount();
                        if (result.success) {
                          Alert.alert('Account Deleted', 'All your data has been permanently deleted.');
                          router.replace('/');
                        } else {
                          Alert.alert('Error', 'Failed to delete some data. Please try again.');
                        }
                      } else {
                        const result = await clearAllLocalData();
                        if (result.success) {
                          Alert.alert('Data Cleared', 'All local data has been deleted.');
                          router.replace('/');
                        } else {
                          Alert.alert('Error', 'Failed to clear data. Please try again.');
                        }
                      }
                    } finally {
                      setIsDeleting(false);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const handleRestorePurchases = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Restore Purchases', 'No previous purchases found.', [{ text: 'OK' }]);
  };

  const appVersion = Constants.expoConfig?.version || '1.0.0';
  const buildNumber = Constants.expoConfig?.ios?.buildNumber || '1';

  const hours = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Settings</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Permission Banner */}
        {!isPermissionGranted && (
          <Animated.View entering={FadeInDown.duration(300)}>
            <Pressable
              style={[styles.permissionBanner, { backgroundColor: colors.warningDim }]}
              onPress={requestPermissions}
            >
              <View style={[styles.permissionIcon, { backgroundColor: colors.warning }]}>
                <BellOff size={16} color={colors.background.primary} />
              </View>
              <View style={styles.permissionText}>
                <Text style={[styles.permissionTitle, { color: colors.text.primary }]}>Enable Notifications</Text>
                <Text style={[styles.permissionSubtitle, { color: colors.text.secondary }]}>Tap to allow workout reminders</Text>
              </View>
              <ChevronRight size={20} color={colors.text.tertiary} />
            </Pressable>
          </Animated.View>
        )}

        {/* Notifications Section */}
        <Animated.View entering={FadeInDown.delay(50).duration(300)}>
          <Text style={[styles.sectionLabel, { color: colors.text.tertiary }]}>NOTIFICATIONS</Text>

          <View style={[styles.card, { backgroundColor: colors.surface.card, borderColor: colors.surface.border }]}>
            <NotificationItem
              icon={<Dumbbell size={18} color={colors.accent.primary} />}
              title="Workout Reminders"
              subtitle="Get reminded about planned workouts"
              enabled={settings.workoutReminders}
              onToggle={(v) => handleToggle('workoutReminders', v)}
              time={settings.workoutReminderTime}
              onTimePress={() => openTimePicker('workoutReminderTime', 'Reminder Time', settings.workoutReminderTime)}
              colors={colors}
            />
          </View>

          <View style={[styles.card, { backgroundColor: colors.surface.card, borderColor: colors.surface.border }]}>
            <NotificationItem
              icon={<Flame size={18} color={colors.warning} />}
              title="Streak Alerts"
              subtitle="Evening nudge to protect your streak"
              enabled={settings.streakReminders}
              onToggle={(v) => handleToggle('streakReminders', v)}
              time={settings.streakReminderTime}
              onTimePress={() => openTimePicker('streakReminderTime', 'Alert Time', settings.streakReminderTime)}
              colors={colors}
            />
          </View>

          <View style={[styles.card, { backgroundColor: colors.surface.card, borderColor: colors.surface.border }]}>
            <NotificationItem
              icon={<Scale size={18} color={colors.tertiary.primary} />}
              title="Weight Log Reminder"
              subtitle="Daily reminder to log your weight"
              enabled={settings.weightLogReminders}
              onToggle={(v) => handleToggle('weightLogReminders', v)}
              time={settings.weightLogReminderTime}
              onTimePress={() => openTimePicker('weightLogReminderTime', 'Reminder Time', settings.weightLogReminderTime)}
              colors={colors}
            />
          </View>

          <View style={[styles.card, { backgroundColor: colors.surface.card, borderColor: colors.surface.border }]}>
            <NotificationItem
              icon={<Trophy size={18} color={colors.secondary.primary} />}
              title="PR Celebrations"
              subtitle="Get notified when you hit a personal record"
              enabled={settings.prCelebrations}
              onToggle={(v) => handleToggle('prCelebrations', v)}
              colors={colors}
            />
          </View>

          <View style={[styles.card, { backgroundColor: colors.surface.card, borderColor: colors.surface.border }]}>
            <NotificationItem
              icon={<CalendarDays size={18} color={colors.accent.primary} />}
              title="Weekly Recap"
              subtitle="Summary of your weekly progress"
              enabled={settings.weeklyRecap}
              onToggle={(v) => handleToggle('weeklyRecap', v)}
              day={settings.weeklyRecap ? DAY_NAMES[settings.weeklyRecapDay] : null}
              onDayPress={openDayPicker}
              time={settings.weeklyRecapTime}
              onTimePress={() => openTimePicker('weeklyRecapTime', 'Recap Time', settings.weeklyRecapTime)}
              colors={colors}
            />
          </View>
        </Animated.View>

        {/* Appearance Section */}
        <Animated.View entering={FadeInDown.delay(100).duration(300)}>
          <Text style={[styles.sectionLabel, { color: colors.text.tertiary }]}>APPEARANCE</Text>
          <View style={[styles.card, { backgroundColor: colors.surface.card, borderColor: colors.surface.border }]}>
            <View style={styles.row}>
              <View style={[styles.iconContainer, { backgroundColor: isDark ? colors.accent.muted : colors.warningDim }]}>
                {isDark ? <Moon size={18} color={colors.accent.primary} /> : <Sun size={18} color={colors.warning} />}
              </View>
              <View style={styles.rowContent}>
                <Text style={[styles.rowTitle, { color: colors.text.primary }]}>Dark Mode</Text>
                <Text style={[styles.rowSubtitle, { color: colors.text.secondary }]}>
                  {isDark ? 'Currently using dark theme' : 'Currently using light theme'}
                </Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  toggleTheme();
                }}
                trackColor={{ false: colors.surface.border, true: colors.accent.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </Animated.View>

        {/* Data Section */}
        <Animated.View entering={FadeInDown.delay(150).duration(300)}>
          <Text style={[styles.sectionLabel, { color: colors.text.tertiary }]}>DATA & PRIVACY</Text>
          <View style={[styles.card, { backgroundColor: colors.surface.card, borderColor: colors.surface.border }]}>
            <LinkRow icon={<Download size={18} color={colors.accent.primary} />} title="Export Workout Data" onPress={handleExportData} colors={colors} />
            <View style={[styles.separator, { backgroundColor: colors.surface.divider }]} />
            <LinkRow icon={<Shield size={18} color={colors.text.secondary} />} title="Privacy Policy" onPress={() => router.push('/privacy-policy')} colors={colors} />
            <View style={[styles.separator, { backgroundColor: colors.surface.divider }]} />
            <LinkRow icon={<FileText size={18} color={colors.text.secondary} />} title="Terms of Service" onPress={() => router.push('/terms-of-service')} colors={colors} />
          </View>

          <View style={[styles.card, { backgroundColor: colors.surface.card, borderColor: colors.surface.border }]}>
            <LinkRow icon={<Trash2 size={18} color={colors.error} />} title="Clear All Data" titleColor={colors.error} onPress={handleClearData} colors={colors} />
          </View>
        </Animated.View>

        {/* Subscription Section */}
        <Animated.View entering={FadeInDown.delay(200).duration(300)}>
          <Text style={[styles.sectionLabel, { color: colors.text.tertiary }]}>SUBSCRIPTION</Text>
          <View style={[styles.card, { backgroundColor: colors.surface.card, borderColor: colors.surface.border }]}>
            <LinkRow icon={<CreditCard size={18} color={colors.accent.primary} />} title="Restore Purchases" onPress={handleRestorePurchases} colors={colors} />
          </View>
        </Animated.View>

        {/* About Section */}
        <Animated.View entering={FadeInDown.delay(250).duration(300)}>
          <Text style={[styles.sectionLabel, { color: colors.text.tertiary }]}>ABOUT</Text>
          <View style={[styles.card, { backgroundColor: colors.surface.card, borderColor: colors.surface.border }]}>
            <View style={styles.row}>
              <View style={[styles.iconContainer, { backgroundColor: colors.surface.cardHover }]}>
                <Smartphone size={18} color={colors.text.secondary} />
              </View>
              <View style={styles.rowContent}>
                <Text style={[styles.rowTitle, { color: colors.text.primary }]}>Version</Text>
              </View>
              <Text style={[styles.rowValue, { color: colors.text.tertiary }]}>{appVersion} ({buildNumber})</Text>
            </View>
          </View>

          <Text style={[styles.footer, { color: colors.text.tertiary }]}>Made with care for fitness enthusiasts</Text>
        </Animated.View>
      </ScrollView>

      {/* Bottom Sheet Picker */}
      {pickerVisible && (
        <Pressable style={styles.pickerOverlay} onPress={() => setPickerVisible(false)}>
          <Animated.View
            entering={FadeIn.duration(150)}
            exiting={FadeOut.duration(100)}
            style={styles.pickerOverlayBg}
          />
          <Animated.View entering={FadeInDown.duration(200)}>
            <Pressable
              style={[styles.pickerSheet, { backgroundColor: colors.background.elevated }]}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.pickerHandle} />
              <Text style={[styles.pickerTitle, { color: colors.text.primary }]}>{pickerConfig.title}</Text>

              {pickerType === 'time' ? (
                <>
                  {/* Time Display */}
                  <View style={[styles.timeDisplay, { backgroundColor: colors.accent.muted }]}>
                    <Text style={[styles.timeDisplayText, { color: colors.accent.primary }]}>
                      {selectedHour}:{String(selectedMinute).padStart(2, '0')} {selectedPeriod}
                    </Text>
                  </View>

                  {/* Three Column Picker */}
                  <View style={styles.dialContainer}>
                    {/* Hour Column */}
                    <View style={styles.dialColumn}>
                      <Text style={[styles.dialLabel, { color: colors.text.tertiary }]}>HOUR</Text>
                      <ScrollView style={styles.dialScroll} showsVerticalScrollIndicator={false}>
                        {hours.map((hour) => (
                          <Pressable
                            key={`hour-${hour}`}
                            style={[styles.dialOption, selectedHour === hour && { backgroundColor: colors.accent.primary }]}
                            onPress={() => {
                              Haptics.selectionAsync();
                              setSelectedHour(hour);
                            }}
                          >
                            <Text style={[styles.dialOptionText, { color: selectedHour === hour ? colors.text.inverse : colors.text.primary }]}>
                              {hour}
                            </Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>

                    {/* Minute Column */}
                    <View style={styles.dialColumn}>
                      <Text style={[styles.dialLabel, { color: colors.text.tertiary }]}>MIN</Text>
                      <ScrollView style={styles.dialScroll} showsVerticalScrollIndicator={false}>
                        {minutes.map((minute) => (
                          <Pressable
                            key={`minute-${minute}`}
                            style={[styles.dialOption, selectedMinute === minute && { backgroundColor: colors.accent.primary }]}
                            onPress={() => {
                              Haptics.selectionAsync();
                              setSelectedMinute(minute);
                            }}
                          >
                            <Text style={[styles.dialOptionText, { color: selectedMinute === minute ? colors.text.inverse : colors.text.primary }]}>
                              {String(minute).padStart(2, '0')}
                            </Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>

                    {/* AM/PM Column */}
                    <View style={styles.dialColumn}>
                      <Text style={[styles.dialLabel, { color: colors.text.tertiary }]}>AM/PM</Text>
                      <View style={styles.periodContainer}>
                        <Pressable
                          style={[styles.dialOption, selectedPeriod === 'AM' && { backgroundColor: colors.accent.primary }]}
                          onPress={() => {
                            Haptics.selectionAsync();
                            setSelectedPeriod('AM');
                          }}
                        >
                          <Text style={[styles.dialOptionText, { color: selectedPeriod === 'AM' ? colors.text.inverse : colors.text.primary }]}>
                            AM
                          </Text>
                        </Pressable>
                        <Pressable
                          style={[styles.dialOption, selectedPeriod === 'PM' && { backgroundColor: colors.accent.primary }]}
                          onPress={() => {
                            Haptics.selectionAsync();
                            setSelectedPeriod('PM');
                          }}
                        >
                          <Text style={[styles.dialOptionText, { color: selectedPeriod === 'PM' ? colors.text.inverse : colors.text.primary }]}>
                            PM
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>

                  {/* Save Button */}
                  <View style={styles.pickerActions}>
                    <Pressable
                      style={[styles.cancelButton, { borderColor: colors.surface.border }]}
                      onPress={() => setPickerVisible(false)}
                    >
                      <Text style={[styles.cancelButtonText, { color: colors.text.secondary }]}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.saveButton, { backgroundColor: colors.accent.primary }]}
                      onPress={handleTimeSave}
                    >
                      <Text style={[styles.saveButtonText, { color: colors.text.inverse }]}>Save</Text>
                    </Pressable>
                  </View>
                </>
              ) : (
                <ScrollView style={styles.dayScroll} showsVerticalScrollIndicator={false}>
                  {DAY_NAMES.map((day, index) => {
                    const isSelected = index === settings.weeklyRecapDay;
                    return (
                      <Pressable
                        key={day}
                        style={[styles.dayOption, isSelected && { backgroundColor: colors.accent.muted }]}
                        onPress={() => handleDaySelect(index)}
                      >
                        <Text style={[styles.dayOptionText, { color: isSelected ? colors.accent.primary : colors.text.primary }]}>
                          {day}
                        </Text>
                        {isSelected && <Check size={18} color={colors.accent.primary} />}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}
            </Pressable>
          </Animated.View>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

// Notification Item Component
function NotificationItem({ icon, title, subtitle, enabled, onToggle, time, onTimePress, day, onDayPress, colors }) {
  return (
    <View style={styles.notificationItem}>
      <View style={styles.notificationHeader}>
        <View style={[styles.iconContainer, { backgroundColor: colors.surface.cardHover }]}>
          {icon}
        </View>
        <View style={styles.notificationContent}>
          <Text style={[styles.rowTitle, { color: colors.text.primary }]}>{title}</Text>
          <Text style={[styles.rowSubtitle, { color: colors.text.secondary }]}>{subtitle}</Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={onToggle}
          trackColor={{ false: colors.surface.border, true: colors.accent.primary }}
          thumbColor="#FFFFFF"
        />
      </View>

      {enabled && (time || day) && (
        <View style={styles.notificationOptions}>
          {day && onDayPress && (
            <Pressable
              style={[styles.optionChip, { backgroundColor: colors.surface.cardHover }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onDayPress();
              }}
            >
              <CalendarDays size={14} color={colors.text.tertiary} />
              <Text style={[styles.optionText, { color: colors.text.secondary }]}>{day}</Text>
              <ChevronRight size={14} color={colors.text.tertiary} />
            </Pressable>
          )}
          {time && onTimePress && (
            <Pressable
              style={[styles.optionChip, { backgroundColor: colors.surface.cardHover }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onTimePress();
              }}
            >
              <Clock size={14} color={colors.text.tertiary} />
              <Text style={[styles.optionText, { color: colors.text.secondary }]}>{formatTimeForDisplay(time)}</Text>
              <ChevronRight size={14} color={colors.text.tertiary} />
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

// Link Row Component
function LinkRow({ icon, title, titleColor, onPress, colors }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
    >
      <View style={[styles.iconContainer, { backgroundColor: colors.surface.cardHover }]}>
        {icon}
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowTitle, { color: titleColor || colors.text.primary }]}>{title}</Text>
      </View>
      <ChevronRight size={18} color={colors.text.tertiary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  backButton: {
    padding: SPACING.sm,
    marginLeft: -SPACING.sm,
  },
  headerTitle: {
    ...TYPOGRAPHY.h3,
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  sectionLabel: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: SPACING.xl,
    marginBottom: SPACING.sm,
    marginLeft: SPACING.xs,
  },
  card: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContent: {
    flex: 1,
  },
  rowTitle: {
    ...TYPOGRAPHY.body,
    fontWeight: '500',
  },
  rowSubtitle: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
  },
  rowValue: {
    ...TYPOGRAPHY.body,
  },
  separator: {
    height: 1,
    marginLeft: SPACING.md + 36 + SPACING.sm,
  },
  notificationItem: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  notificationContent: {
    flex: 1,
  },
  notificationOptions: {
    flexDirection: 'row',
    marginTop: SPACING.sm,
    marginLeft: 36 + SPACING.sm,
    gap: SPACING.sm,
    flexWrap: 'wrap',
  },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
    gap: SPACING.xs,
  },
  optionText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '500',
  },
  permissionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  permissionIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionText: {
    flex: 1,
  },
  permissionTitle: {
    ...TYPOGRAPHY.bodyMedium,
  },
  permissionSubtitle: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
  },
  footer: {
    ...TYPOGRAPHY.caption,
    textAlign: 'center',
    marginTop: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  // Bottom Sheet Picker
  pickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
  },
  pickerOverlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.overlay.heavy,
  },
  pickerSheet: {
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xxxl,
    paddingHorizontal: SPACING.lg,
  },
  pickerHandle: {
    width: 36,
    height: 4,
    backgroundColor: COLORS.surface.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  pickerTitle: {
    ...TYPOGRAPHY.h4,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  // Time Display
  timeDisplay: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.lg,
  },
  timeDisplayText: {
    fontSize: 32,
    fontWeight: '600',
  },
  // Three Column Dial
  dialContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  dialColumn: {
    flex: 1,
  },
  dialLabel: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  dialScroll: {
    height: 180,
  },
  periodContainer: {
    gap: SPACING.sm,
  },
  dialOption: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  dialOptionText: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '600',
  },
  // Picker Actions
  pickerActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    ...TYPOGRAPHY.bodyMedium,
  },
  saveButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  saveButtonText: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '600',
  },
  // Day Picker
  dayScroll: {
    maxHeight: 300,
  },
  dayOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.xs,
  },
  dayOptionText: {
    ...TYPOGRAPHY.body,
    fontWeight: '500',
  },
});
