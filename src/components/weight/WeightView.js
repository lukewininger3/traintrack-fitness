import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
  FlatList,
  ScrollView,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFocusEffect } from '@react-navigation/native';
import Animated, { FadeIn, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { ArrowDown, ArrowUp, ChevronRight, ClipboardList, Image as ImageIcon, Minus, Plus, Scale, Target, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import WeightChart from './WeightChart';
import WeightDateSelect from './WeightDateSelect';
import { useTheme } from '../../contexts/ThemeContext';
import {
  addWeightEntry,
  clearWeightGoal,
  deleteWeightEntry,
  loadLocalWeightData,
  loadWeightData,
  setWeightGoal,
  waitForWeightCloudSync,
} from '../../utils/weightStorage';
import { formatDateForStorage, getTodayString, parseLocalDate } from '../../utils/dateFormatter';
import { TYPOGRAPHY, SPACING, RADIUS } from '../../theme/design';

const RANGES = [
  { key: '1W', days: 7, label: 'past week' },
  { key: '1M', days: 30, label: 'past month' },
  { key: '3M', days: 90, label: 'past 3 months' },
  { key: '6M', days: 182, label: 'past 6 months' },
  { key: '1Y', days: 365, label: 'past year' },
  { key: 'ALL', days: null, label: 'all time' },
];
const CHART_HEIGHT = 240;

const round1 = (n) => Math.round(n * 10) / 10;
const signed = (n) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(1)}`;

const dayLabel = (dateString) => {
  const today = getTodayString();
  if (dateString === today) return 'Today';
  const y = new Date();
  y.setDate(y.getDate() - 1);
  if (dateString === formatDateForStorage(y)) return 'Yesterday';
  const d = parseLocalDate(dateString);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) });
};

/**
 * Whether a change is good news given the goal: down is good when losing,
 * up when gaining. null when there's no goal (shown neutral).
 */
const isGoodChange = (change, direction) => {
  if (!change) return null;
  if (direction === 'lose') return change < 0;
  if (direction === 'gain') return change > 0;
  return null;
};

/**
 * Weight tracking: hero number, interactive chart, stats, goal and history.
 * Rendered inside the Progress tab's scroll view (Weight sub tab).
 */
export default function WeightView() {
  const { colors } = useTheme();
  const [chartWidth, setChartWidth] = useState(0);
  const [data, setData] = useState(null);
  const [rangeKey, setRangeKey] = useState('1M');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [logSheet, setLogSheet] = useState(null); // { date: Date }
  const [showGoalSheet, setShowGoalSheet] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const reload = useCallback(async () => {
    setData(await loadLocalWeightData());
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const local = await loadWeightData();
        if (active) setData(local);
        // Pick up anything the background cloud refresh brings in
        await waitForWeightCloudSync();
        const fresh = await loadLocalWeightData();
        if (active) setData(fresh);
      })();
      return () => { active = false; };
    }, [])
  );

  const unit = data?.settings?.unit || 'lbs';
  const goal = data?.goal || null;
  const entries = useMemo(() => data?.entries || [], [data]);
  const latest = entries[0] || null;
  const range = RANGES.find(r => r.key === rangeKey);

  // Points in the selected range, oldest first
  const points = useMemo(() => {
    let cutoff = null;
    if (range.days) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - range.days);
      cutoff = d.getTime();
    }
    return entries
      .map(e => ({ t: parseLocalDate(e.date).getTime(), weight: e.weight, entry: e }))
      .filter(p => cutoff == null || p.t >= cutoff)
      .sort((a, b) => a.t - b.t);
  }, [entries, range]);

  const stats = useMemo(() => {
    if (points.length === 0) return null;
    const weights = points.map(p => p.weight);
    const sum = weights.reduce((a, b) => a + b, 0);
    return {
      change: points.length > 1 ? round1(weights[weights.length - 1] - weights[0]) : null,
      average: sum / weights.length,
      low: Math.min(...weights),
      high: Math.max(...weights),
      count: weights.length,
    };
  }, [points]);

  const selected = selectedIndex >= 0 ? points[selectedIndex] : null;
  const handleSelect = useCallback((i) => setSelectedIndex(i), []);

  const changeRange = (key) => {
    if (key === rangeKey) return;
    Haptics.selectionAsync();
    setSelectedIndex(-1);
    setRangeKey(key);
  };

  const openLog = (dateString) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLogSheet({ date: dateString ? parseLocalDate(dateString) : new Date() });
  };

  const confirmDelete = (entry) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Delete weigh-in?', `${entry.weight.toFixed(1)} ${unit} on ${dayLabel(entry.date)}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteWeightEntry(entry.id);
          setLogSheet(null);
          reload();
        },
      },
    ]);
  };

  // ---- Hero numbers ---------------------------------------------------------
  let heroWeight = latest?.weight;
  let heroCaption = latest ? dayLabel(latest.date) : '';
  let heroChange = stats?.change ?? null;
  let heroChangeLabel = range.label;
  if (selected) {
    heroWeight = selected.weight;
    heroCaption = dayLabel(selected.entry.date);
    heroChange = selectedIndex > 0 ? round1(selected.weight - points[selectedIndex - 1].weight) : null;
    heroChangeLabel = 'from previous';
  }
  const heroGood = isGoodChange(heroChange, goal?.direction);
  const changeColor = heroGood === null ? colors.text.secondary : heroGood ? colors.success : colors.error;
  const changeBg = heroGood === null ? colors.surface.cardActive : heroGood ? colors.successDim : colors.errorDim;

  const todayLogged = latest?.date === getTodayString();

  const logSheetElement = logSheet && (
    <LogSheet
      initialDate={logSheet.date}
      entries={entries}
      unit={unit}
      colors={colors}
      onClose={() => setLogSheet(null)}
      onSaved={() => { setLogSheet(null); reload(); }}
      onDelete={confirmDelete}
    />
  );

  return (
    <View>
      {data && entries.length === 0 ? (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.accent.primaryDim }]}>
            <Scale size={32} color={colors.accent.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>Track your weight</Text>
          <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
            Log a weigh-in each day and watch your trend take shape.
          </Text>
          <Pressable style={[styles.primaryButton, { backgroundColor: colors.accent.primary }]} onPress={() => openLog()}>
            <Text style={[styles.primaryButtonText, { color: colors.text.inverse }]}>Log your first weigh-in</Text>
          </Pressable>
        </View>
      ) : data ? (
        <Animated.View entering={FadeIn.duration(250)}>
          {/* Hero */}
          <View style={styles.hero}>
            <Text style={[styles.heroCaption, { color: colors.text.tertiary }]}>{heroCaption.toUpperCase()}</Text>
            <View style={styles.heroRow}>
              <Text style={[styles.heroValue, { color: colors.text.primary }]}>{heroWeight?.toFixed(1)}</Text>
              <Text style={[styles.heroUnit, { color: colors.text.tertiary }]}>{unit}</Text>
            </View>
            <View style={styles.heroChangeRow}>
              {heroChange !== null ? (
                <View style={[styles.changePill, { backgroundColor: changeBg }]}>
                  {heroChange !== 0 && (heroChange < 0
                    ? <ArrowDown size={13} color={changeColor} strokeWidth={2.75} />
                    : <ArrowUp size={13} color={changeColor} strokeWidth={2.75} />)}
                  <Text style={[styles.changePillText, { color: changeColor }]}>
                    {Math.abs(heroChange).toFixed(1)} {unit}
                  </Text>
                </View>
              ) : null}
              <Text style={[styles.heroChangeLabel, { color: colors.text.tertiary }]}>
                {heroChange !== null ? heroChangeLabel : selected ? 'first in range' : `${stats?.count || 0} weigh-in ${range.label}`}
              </Text>
            </View>
          </View>

          {/* Chart */}
          <View
            style={[styles.card, { backgroundColor: colors.surface.card, borderColor: colors.surface.border }]}
            onLayout={e => setChartWidth(Math.floor(e.nativeEvent.layout.width - SPACING.md * 2 - 2))}
          >
            {chartWidth === 0 ? (
              <View style={{ height: CHART_HEIGHT }} />
            ) : points.length > 0 ? (
              <WeightChart
                points={points}
                goalWeight={goal?.targetWeight ?? null}
                width={chartWidth}
                height={CHART_HEIGHT}
                colors={colors}
                unit={unit}
                animationKey={rangeKey}
                onSelect={handleSelect}
              />
            ) : (
              <View style={[styles.chartEmpty, { height: CHART_HEIGHT }]}>
                <Text style={[styles.chartEmptyText, { color: colors.text.tertiary }]}>No weigh-ins in the {range.label}</Text>
              </View>
            )}
            <RangeTabs value={rangeKey} onChange={changeRange} colors={colors} />
          </View>
          {points.length > 1 && (
            <Text style={[styles.hint, { color: colors.text.tertiary }]}>Drag across the chart to see each day</Text>
          )}

          {todayLogged ? (
            <Pressable
              style={[styles.primaryButton, styles.logToday, { backgroundColor: colors.accent.primaryDim }]}
              onPress={() => openLog()}
            >
              <Plus size={18} color={colors.accent.primary} strokeWidth={2.75} />
              <Text style={[styles.primaryButtonText, { color: colors.accent.primary }]}>Log weight</Text>
            </Pressable>
          ) : (
            <Pressable
              style={[styles.primaryButton, styles.logToday, { backgroundColor: colors.accent.primary }]}
              onPress={() => openLog()}
            >
              <Plus size={18} color={colors.text.inverse} strokeWidth={2.75} />
              <Text style={[styles.primaryButtonText, { color: colors.text.inverse }]}>Log today&apos;s weight</Text>
            </Pressable>
          )}

          {/* Stats */}
          {stats && (
            <View style={styles.statsGrid}>
              <StatTile label="Change" value={stats.change === null ? '—' : signed(stats.change)} unit={unit} colors={colors} />
              <StatTile label="Average" value={stats.average.toFixed(1)} unit={unit} colors={colors} />
              <StatTile label="Lowest" value={stats.low.toFixed(1)} unit={unit} colors={colors} />
              <StatTile label="Highest" value={stats.high.toFixed(1)} unit={unit} colors={colors} />
            </View>
          )}

          {/* Goal */}
          <GoalCard goal={goal} entries={entries} unit={unit} colors={colors} onEdit={() => setShowGoalSheet(true)} />

          {/* History */}
          <Pressable
            onPress={() => { Haptics.selectionAsync(); setShowHistory(true); }}
            style={({ pressed }) => [
              styles.card,
              styles.historyButton,
              { backgroundColor: pressed ? colors.surface.cardHover : colors.surface.card, borderColor: colors.surface.border },
            ]}
          >
            <ClipboardList size={18} color={colors.accent.primary} />
            <View style={styles.historyButtonText}>
              <Text style={[styles.goalTitle, { color: colors.text.primary }]}>History</Text>
              <Text style={[styles.historyNotes, { color: colors.text.tertiary }]}>
                {entries.length} weigh-in{entries.length === 1 ? '' : 's'} · view, edit or delete
              </Text>
            </View>
            <ChevronRight size={18} color={colors.text.tertiary} />
          </Pressable>
        </Animated.View>
      ) : null}

      {showHistory ? (
        <HistorySheet
          entries={entries}
          goal={goal}
          unit={unit}
          colors={colors}
          onClose={() => setShowHistory(false)}
          onEdit={openLog}
          onDelete={confirmDelete}
        >
          {logSheetElement}
        </HistorySheet>
      ) : logSheetElement}
      {showGoalSheet && (
        <GoalSheet
          goal={goal}
          current={latest?.weight}
          unit={unit}
          colors={colors}
          onClose={() => setShowGoalSheet(false)}
          onSaved={() => { setShowGoalSheet(false); reload(); }}
        />
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------

function RangeTabs({ value, onChange, colors }) {
  const [width, setWidth] = useState(0);
  const tabWidth = width / RANGES.length;
  const index = RANGES.findIndex(r => r.key === value);

  const indicator = useAnimatedStyle(() => ({
    transform: [{ translateX: withSpring(index * tabWidth, { damping: 20, stiffness: 260, mass: 0.6 }) }],
  }), [index, tabWidth]);

  return (
    <View
      style={[styles.tabs, { backgroundColor: colors.background.tertiary }]}
      onLayout={e => setWidth(e.nativeEvent.layout.width - 6)}
    >
      {width > 0 && (
        <Animated.View style={[styles.tabIndicator, { width: tabWidth, backgroundColor: colors.surface.elevated }, indicator]} />
      )}
      {RANGES.map(r => (
        <Pressable key={r.key} style={styles.tab} onPress={() => onChange(r.key)} hitSlop={4}>
          <Text style={[styles.tabText, { color: r.key === value ? colors.text.primary : colors.text.tertiary }]}>{r.key}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function StatTile({ label, value, unit, colors }) {
  return (
    <View style={[styles.statTile, { backgroundColor: colors.surface.card, borderColor: colors.surface.border }]}>
      <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>{label.toUpperCase()}</Text>
      <Text style={[styles.statValue, { color: colors.text.primary }]}>
        {value} <Text style={[styles.statUnit, { color: colors.text.tertiary }]}>{unit}</Text>
      </Text>
    </View>
  );
}

function GoalCard({ goal, entries, unit, colors, onEdit }) {
  const current = entries[0]?.weight;

  if (!goal) {
    return (
      <Pressable
        onPress={onEdit}
        style={[styles.card, styles.goalEmpty, { backgroundColor: colors.surface.card, borderColor: colors.surface.border }]}
      >
        <Target size={18} color={colors.tertiary.primary} />
        <Text style={[styles.goalEmptyText, { color: colors.text.primary }]}>Set a goal weight</Text>
        <ChevronRight size={18} color={colors.text.tertiary} />
      </Pressable>
    );
  }

  const target = goal.targetWeight;
  const start = goal.startWeight ?? entries[entries.length - 1]?.weight ?? current;
  const remaining = current != null ? round1(current - target) : null;
  const reached = remaining !== null && (
    goal.direction === 'lose' ? remaining <= 0 : goal.direction === 'gain' ? remaining >= 0 : Math.abs(remaining) <= 1
  );
  const total = start - target;
  const progress = total === 0 || current == null ? (reached ? 1 : 0) : Math.min(1, Math.max(0, (start - current) / total));

  return (
    <Pressable onPress={onEdit} style={[styles.card, styles.goalCard, { backgroundColor: colors.surface.card, borderColor: colors.surface.border }]}>
      <View style={styles.goalTop}>
        <View style={styles.goalTitleRow}>
          <Target size={16} color={colors.tertiary.primary} />
          <Text style={[styles.goalTitle, { color: colors.text.primary }]}>Goal: {target.toFixed(1)} {unit}</Text>
        </View>
        <Text style={[styles.goalEdit, { color: colors.text.tertiary }]}>Edit</Text>
      </View>
      <Text style={[styles.goalRemaining, { color: reached ? colors.success : colors.text.secondary }]}>
        {reached
          ? 'Goal reached — nice work!'
          : remaining === null ? '' : `${Math.abs(remaining).toFixed(1)} ${unit} to go`}
      </Text>
      <View style={[styles.progressTrack, { backgroundColor: colors.background.tertiary }]}>
        <Animated.View
          entering={FadeIn.duration(400)}
          style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: reached ? colors.success : colors.tertiary.primary }]}
        />
      </View>
      <View style={styles.goalEnds}>
        <Text style={[styles.goalEndText, { color: colors.text.tertiary }]}>Start {start?.toFixed(1)}</Text>
        <Text style={[styles.goalEndText, { color: colors.text.tertiary }]}>{Math.round(progress * 100)}%</Text>
      </View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------

function HistorySheet({ entries, goal, unit, colors, onClose, onEdit, onDelete, children }) {
  const [photo, setPhoto] = useState(null);

  const renderItem = ({ item: entry, index }) => {
    const older = entries[index + 1];
    const delta = older ? round1(entry.weight - older.weight) : null;
    const good = isGoodChange(delta, goal?.direction);
    const deltaColor = good === null ? colors.text.tertiary : good ? colors.success : colors.error;
    return (
      <Pressable
        onPress={() => onEdit(entry.date)}
        onLongPress={() => onDelete(entry)}
        style={({ pressed }) => [
          styles.historyRow,
          index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.surface.divider },
          pressed && { backgroundColor: colors.surface.cardHover },
        ]}
      >
        <View style={styles.historyLeft}>
          <Text style={[styles.historyDate, { color: colors.text.primary }]}>{dayLabel(entry.date)}</Text>
          {!!entry.notes && (
            <Text style={[styles.historyNotes, { color: colors.text.tertiary }]} numberOfLines={1}>{entry.notes}</Text>
          )}
        </View>
        {entry.media?.length > 0 && (
          <Pressable
            onPress={() => setPhoto(entry.media[0])}
            hitSlop={8}
            style={[styles.historyPhoto, { backgroundColor: colors.accent.primaryDim }]}
          >
            <ImageIcon size={15} color={colors.accent.primary} />
          </Pressable>
        )}
        <View style={styles.historyRight}>
          <Text style={[styles.historyWeight, { color: colors.text.primary }]}>
            {entry.weight.toFixed(1)} <Text style={{ color: colors.text.tertiary }}>{unit}</Text>
          </Text>
          {delta !== null && (
            <Text style={[styles.historyDelta, { color: deltaColor }]}>{delta === 0 ? '0.0' : signed(delta)}</Text>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.historySheet, { backgroundColor: colors.background.primary }]}>
        <View style={styles.sheetHeader}>
          <Text style={[styles.sheetTitle, { color: colors.text.primary }]}>History</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <X size={22} color={colors.text.tertiary} />
          </Pressable>
        </View>
        <Text style={[styles.historyHint, { color: colors.text.tertiary }]}>Tap to edit · press and hold to delete</Text>
        <FlatList
          data={entries}
          keyExtractor={e => String(e.id)}
          renderItem={renderItem}
          style={[styles.historyList, { backgroundColor: colors.surface.card, borderColor: colors.surface.border }]}
          contentContainerStyle={styles.historyListContent}
          initialNumToRender={20}
          ListEmptyComponent={(
            <Text style={[styles.chartEmptyText, styles.historyEmpty, { color: colors.text.tertiary }]}>No weigh-ins yet</Text>
          )}
        />
      </View>
      {children}
      {photo && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setPhoto(null)}>
          <Pressable style={[styles.photoViewer, { backgroundColor: colors.overlay.heavy }]} onPress={() => setPhoto(null)}>
            <Image source={{ uri: photo.uri }} style={styles.photoImage} resizeMode="contain" />
            <View style={styles.photoClose}>
              <X size={28} color="#fff" />
            </View>
          </Pressable>
        </Modal>
      )}
    </Modal>
  );
}

// Insets come from the app's root provider: inside a modal SafeAreaView doesn't
// see the status bar / home indicator
function FullScreenSheet({ title, onClose, colors, children }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <GestureHandlerRootView style={[styles.fullScreen, { backgroundColor: colors.background.primary, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fullScreen}>
          <View style={[styles.sheetHeader, styles.fullScreenHeader]}>
            <Text style={[styles.sheetTitle, { color: colors.text.primary }]}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <X size={24} color={colors.text.tertiary} />
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={styles.fullScreenContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

function Sheet({ title, onClose, colors, children }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetWrap}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay.medium }]} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.background.elevated, paddingBottom: insets.bottom + SPACING.md }]}>
          <View style={[styles.grabber, { backgroundColor: colors.surface.border }]} />
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.text.primary }]}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <X size={22} color={colors.text.tertiary} />
            </Pressable>
          </View>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function LogSheet({ initialDate, entries, unit, colors, onClose, onSaved, onDelete }) {
  const { isDark } = useTheme();
  const findEntry = (d) => entries.find(e => e.date === formatDateForStorage(d)) || null;
  const initialEntry = findEntry(initialDate);
  const [date, setDate] = useState(initialDate);
  const [existing, setExisting] = useState(initialEntry);
  // Blank for a day that isn't logged yet
  const [weight, setWeight] = useState(initialEntry ? initialEntry.weight.toFixed(1) : '');
  const [notes, setNotes] = useState(initialEntry?.notes || '');
  const [saving, setSaving] = useState(false);
  const [wheelsOpen, setWheelsOpen] = useState(false);
  const inputRef = useRef(null);

  // ± starts from the last weigh-in when the box is still empty
  const bump = (delta) => {
    const typed = parseFloat(weight.replace(',', '.'));
    const n = isNaN(typed) ? entries[0]?.weight : typed;
    if (n == null) return;
    Haptics.selectionAsync();
    setWeight(Math.max(0, round1(isNaN(typed) ? n : n + delta)).toFixed(1));
  };

  // Picking a logged day loads it for editing; picking an unlogged day after a
  // logged one clears the form (a weight typed for a new day is kept)
  const changeDate = (d) => {
    const entry = findEntry(d);
    setDate(d);
    setExisting(entry);
    if (entry) {
      setWeight(entry.weight.toFixed(1));
      setNotes(entry.notes || '');
    } else if (existing) {
      setWeight('');
      setNotes('');
    }
  };

  const save = async () => {
    const n = parseFloat(weight.replace(',', '.'));
    if (isNaN(n) || n < 20 || n > 1500) {
      Alert.alert('Check your entry', 'Please enter a valid weight.');
      return;
    }
    setSaving(true);
    // Local noon, so the date can't shift across a timezone boundary
    const d = new Date(date);
    d.setHours(12, 0, 0, 0);
    const result = await addWeightEntry(round1(n), notes.trim(), d);
    setSaving(false);
    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSaved();
    } else {
      Alert.alert('Could not save', 'Please try again.');
    }
  };

  return (
    <FullScreenSheet title={existing ? 'Edit weigh-in' : 'Log weight'} onClose={onClose} colors={colors}>
      <WeightDateSelect
        date={date}
        onChange={changeDate}
        entries={entries}
        unit={unit}
        wheelsOpen={wheelsOpen}
        onWheelsOpenChange={setWheelsOpen}
        colors={colors}
        isDark={isDark}
      />

      <View style={styles.weightRow}>
        <Pressable
          onPress={() => bump(-0.1)}
          onLongPress={() => bump(-1)}
          style={[styles.stepButton, { backgroundColor: colors.surface.cardActive }]}
        >
          <Minus size={22} color={colors.text.primary} />
        </Pressable>
        <Pressable style={styles.weightInputWrap} onPress={() => inputRef.current?.focus()}>
          <TextInput
            ref={inputRef}
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
            placeholder="0.0"
            placeholderTextColor={colors.text.tertiary}
            selectTextOnFocus
            maxLength={6}
            onFocus={() => setWheelsOpen(false)}
            style={[styles.weightInput, { color: colors.text.primary }]}
          />
          <Text style={[styles.weightUnit, { color: colors.text.tertiary }]}>{unit}</Text>
        </Pressable>
        <Pressable
          onPress={() => bump(0.1)}
          onLongPress={() => bump(1)}
          style={[styles.stepButton, { backgroundColor: colors.surface.cardActive }]}
        >
          <Plus size={22} color={colors.text.primary} />
        </Pressable>
      </View>
      <Text style={[styles.stepHint, { color: colors.text.tertiary }]}>Tap ± for 0.1 · hold for 1</Text>

      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Note (optional)"
        placeholderTextColor={colors.text.tertiary}
        maxLength={200}
        onFocus={() => setWheelsOpen(false)}
        style={[styles.notesInput, { color: colors.text.primary, backgroundColor: colors.surface.card, borderColor: colors.surface.border }]}
      />

      <Pressable
        onPress={save}
        disabled={saving || !weight}
        style={[styles.primaryButton, { backgroundColor: colors.accent.primary, opacity: saving || !weight ? 0.5 : 1 }]}
      >
        <Text style={[styles.primaryButtonText, { color: colors.text.inverse }]}>{existing ? 'Update' : 'Save'}</Text>
      </Pressable>
      {existing && (
        <Pressable onPress={() => onDelete(existing)} style={styles.deleteButton}>
          <Text style={[styles.deleteText, { color: colors.error }]}>Delete this weigh-in</Text>
        </Pressable>
      )}
    </FullScreenSheet>
  );
}

function GoalSheet({ goal, current, unit, colors, onClose, onSaved }) {
  const [target, setTarget] = useState(goal ? goal.targetWeight.toFixed(1) : '');

  const save = async () => {
    const n = parseFloat(target.replace(',', '.'));
    if (isNaN(n) || n < 20 || n > 1500) {
      Alert.alert('Check your entry', 'Please enter a valid goal weight.');
      return;
    }
    const direction = current == null ? 'lose' : n < current ? 'lose' : n > current ? 'gain' : 'maintain';
    await setWeightGoal(round1(n), direction);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSaved();
  };

  const remove = async () => {
    await clearWeightGoal();
    onSaved();
  };

  return (
    <Sheet title={goal ? 'Edit goal' : 'Set a goal'} onClose={onClose} colors={colors}>
      <View style={styles.weightRow}>
        <View style={styles.weightInputWrap}>
          <TextInput
            value={target}
            onChangeText={setTarget}
            keyboardType="decimal-pad"
            placeholder={current ? current.toFixed(1) : '0.0'}
            placeholderTextColor={colors.text.tertiary}
            autoFocus
            selectTextOnFocus
            maxLength={6}
            style={[styles.weightInput, { color: colors.text.primary }]}
          />
          <Text style={[styles.weightUnit, { color: colors.text.tertiary }]}>{unit}</Text>
        </View>
      </View>
      {current != null && (
        <Text style={[styles.stepHint, { color: colors.text.tertiary }]}>Currently {current.toFixed(1)} {unit}</Text>
      )}
      <Pressable
        onPress={save}
        disabled={!target}
        style={[styles.primaryButton, styles.goalSave, { backgroundColor: colors.accent.primary, opacity: target ? 1 : 0.5 }]}
      >
        <Text style={[styles.primaryButtonText, { color: colors.text.inverse }]}>Save goal</Text>
      </Pressable>
      {goal && (
        <Pressable onPress={remove} style={styles.deleteButton}>
          <Text style={[styles.deleteText, { color: colors.error }]}>Remove goal</Text>
        </Pressable>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  hero: { paddingBottom: SPACING.md },
  heroCaption: { ...TYPOGRAPHY.label },
  heroRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: SPACING.xs },
  heroValue: { ...TYPOGRAPHY.stat, fontSize: 56, lineHeight: 60, fontVariant: ['tabular-nums'] },
  heroUnit: { ...TYPOGRAPHY.h3, marginLeft: SPACING.sm },
  heroChangeRow: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.sm, minHeight: 26 },
  changePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    marginRight: SPACING.sm,
  },
  changePillText: { fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  heroChangeLabel: { ...TYPOGRAPHY.caption },

  card: { borderWidth: 1, borderRadius: RADIUS.lg, padding: SPACING.md },
  chartEmpty: { alignItems: 'center', justifyContent: 'center' },
  chartEmptyText: { ...TYPOGRAPHY.body },
  hint: { ...TYPOGRAPHY.caption, textAlign: 'center', marginTop: SPACING.sm },

  tabs: { flexDirection: 'row', borderRadius: RADIUS.md, padding: 3, marginTop: SPACING.md },
  tabIndicator: { position: 'absolute', top: 3, bottom: 3, left: 3, borderRadius: RADIUS.sm + 2 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 7 },
  tabText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },

  logToday: { marginTop: SPACING.lg, flexDirection: 'row', gap: SPACING.sm },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.lg },
  statTile: { flexBasis: '48%', flexGrow: 1, borderWidth: 1, borderRadius: RADIUS.md, padding: SPACING.md },
  statLabel: { ...TYPOGRAPHY.label, fontSize: 10 },
  statValue: { ...TYPOGRAPHY.statSmall, marginTop: SPACING.sm, fontVariant: ['tabular-nums'] },
  statUnit: { fontSize: 13, fontWeight: '600', letterSpacing: 0 },

  goalEmpty: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.lg },
  goalEmptyText: { ...TYPOGRAPHY.bodyBold, flex: 1 },
  goalCard: { marginTop: SPACING.lg },
  goalTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  goalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  goalTitle: { ...TYPOGRAPHY.bodyBold },
  goalEdit: { ...TYPOGRAPHY.caption },
  goalRemaining: { ...TYPOGRAPHY.body, marginTop: SPACING.xs },
  progressTrack: { height: 8, borderRadius: 4, marginTop: SPACING.md, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4 },
  goalEnds: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.xs },
  goalEndText: { ...TYPOGRAPHY.caption },

  historyButton: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginTop: SPACING.lg },
  historyButtonText: { flex: 1 },
  historySheet: { flex: 1, paddingHorizontal: SPACING.screenPadding, paddingTop: SPACING.sm },
  historyHint: { ...TYPOGRAPHY.caption, marginBottom: SPACING.md },
  historyList: { flexGrow: 0, borderWidth: 1, borderRadius: RADIUS.lg },
  historyListContent: { paddingBottom: SPACING.xs },
  historyEmpty: { textAlign: 'center', paddingVertical: SPACING.xl },
  historyRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: 13 },
  historyLeft: { flex: 1, marginRight: SPACING.sm },
  historyDate: { ...TYPOGRAPHY.bodyBold },
  historyNotes: { ...TYPOGRAPHY.caption, marginTop: 2 },
  historyPhoto: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md },
  photoViewer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  photoImage: { width: '92%', height: '75%' },
  photoClose: { position: 'absolute', top: 60, right: 24 },
  historyRight: { alignItems: 'flex-end' },
  historyWeight: { ...TYPOGRAPHY.bodyBold, fontVariant: ['tabular-nums'] },
  historyDelta: { fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'], marginTop: 1 },

  empty: { alignItems: 'center', paddingVertical: SPACING.xxl, paddingHorizontal: SPACING.md },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { ...TYPOGRAPHY.h2, marginTop: SPACING.lg },
  emptyText: { ...TYPOGRAPHY.body, textAlign: 'center', marginTop: SPACING.sm, marginBottom: SPACING.xl },

  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
    paddingVertical: 15,
    paddingHorizontal: SPACING.lg,
    alignSelf: 'stretch',
  },
  primaryButtonText: { ...TYPOGRAPHY.bodyBold, fontSize: 16 },

  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  fullScreen: { flex: 1 },
  fullScreenHeader: { paddingHorizontal: SPACING.screenPadding },
  fullScreenContent: { paddingHorizontal: SPACING.screenPadding, paddingBottom: SPACING.xl },
  sheet: {
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: SPACING.screenPadding,
    paddingBottom: SPACING.md,
  },
  grabber: { width: 40, height: 5, borderRadius: 3, alignSelf: 'center', marginTop: SPACING.sm },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  sheetTitle: { ...TYPOGRAPHY.h3 },
  weightRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: SPACING.lg },
  stepButton: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  weightInputWrap: { flex: 1, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center' },
  weightInput: {
    fontSize: 56,
    fontWeight: '800',
    letterSpacing: -2,
    textAlign: 'center',
    minWidth: 120,
    padding: 0,
    fontVariant: ['tabular-nums'],
  },
  weightUnit: { ...TYPOGRAPHY.h3, marginLeft: SPACING.xs },
  stepHint: { ...TYPOGRAPHY.caption, textAlign: 'center', marginTop: SPACING.sm },
  notesInput: {
    ...TYPOGRAPHY.body,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },
  goalSave: { marginTop: SPACING.lg },
  deleteButton: { alignItems: 'center', paddingVertical: SPACING.md },
  deleteText: { ...TYPOGRAPHY.bodyBold },
});
