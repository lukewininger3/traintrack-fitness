import { Check, GripVertical, History, Link, MessageSquare, Plus, Trash2, TrendingUp, X } from 'lucide-react-native';
import React, { useState, useEffect, useRef } from 'react';
import { Alert, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  runOnJS,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../../../theme/design';

// Format time in minutes to mm:ss format
const formatPace = (paceInMinutes) => {
  if (!paceInMinutes || paceInMinutes <= 0 || !isFinite(paceInMinutes)) return null;
  const totalSeconds = Math.round(paceInMinutes * 60);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

// Calculate pace from distance and time
const calculatePace = (distance, time) => {
  const dist = parseFloat(distance) || 0;
  const t = parseFloat(time) || 0;
  if (dist > 0 && t > 0) {
    return t / dist; // minutes per mile
  }
  return 0;
};

// Input field with unit suffix and smart placeholder behavior
const SetInputField = React.forwardRef(({ value, onChangeText, placeholder, unit, keyboardType, isConfirmed, testID }, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const [hasBeenEdited, setHasBeenEdited] = useState(false);
  const internalRef = useRef(null);
  const inputRef = ref || internalRef;

  // Determine if field has a real value (including 0)
  // Convert to string to handle both string "0" and number 0
  const stringValue = value?.toString() || '';
  const hasValue = stringValue !== '';
  // Show greyed style only for truly empty, unfocused, unedited, unconfirmed fields
  // If confirmed, NEVER show placeholder style (user intentionally confirmed the set)
  const showPlaceholderStyle = !isConfirmed && !hasValue && !isFocused && !hasBeenEdited;
  const displayValue = isFocused ? stringValue : (hasValue ? stringValue : '');

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const handleChangeText = (text) => {
    setHasBeenEdited(true);
    onChangeText(text);
  };

  return (
    <View style={[
      styles.inputWithUnit,
      isConfirmed && styles.inputWithUnitConfirmed,
    ]}>
      <TextInput
        ref={inputRef}
        style={[
          styles.setInput,
          showPlaceholderStyle && styles.setInputPlaceholder,
        ]}
        value={displayValue}
        onChangeText={handleChangeText}
        onFocus={handleFocus}
        onBlur={handleBlur}
        keyboardType={keyboardType}
        placeholder={isFocused ? '' : '0'}
        placeholderTextColor={COLORS.text.tertiary}
        selectTextOnFocus
      />
      {unit ? (
        <Text style={[styles.unitSuffix, showPlaceholderStyle && styles.unitSuffixDim]}>{unit}</Text>
      ) : null}
    </View>
  );
});

// Animated checkmark for set confirmation
const ConfirmButton = ({ isConfirmed, canConfirm, onConfirm }) => {
  const scale = useSharedValue(1);

  const handlePress = () => {
    if (!isConfirmed && canConfirm) {
      scale.value = withSequence(
        withSpring(1.2, { damping: 8 }),
        withSpring(1, { damping: 12 })
      );
      onConfirm();
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={handlePress}
        style={[
          styles.confirmButton,
          isConfirmed && styles.confirmButtonActive,
          !canConfirm && !isConfirmed && styles.confirmButtonDisabled,
        ]}
        disabled={!canConfirm && !isConfirmed}
      >
        <Check
          size={14}
          color={isConfirmed ? COLORS.text.inverse : (canConfirm ? COLORS.success : COLORS.text.tertiary)}
          strokeWidth={2.5}
        />
      </Pressable>
    </Animated.View>
  );
};

// Collapsible previous session panel
const PreviousSessionPanel = ({ previousSession, isCardio, isVisible }) => {
  if (!previousSession || !previousSession.sets || previousSession.sets.length === 0 || !isVisible) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      style={styles.previousPanel}
    >
      <View style={styles.previousHeader}>
        <Text style={styles.previousDate}>{previousSession.date}</Text>
      </View>
      <View style={styles.previousSets}>
        {previousSession.sets.map((set, idx) => {
          if (isCardio) {
            const pace = calculatePace(set.distance, set.time);
            const paceFormatted = formatPace(pace);
            return (
              <View key={idx} style={styles.previousSetPill}>
                <Text style={styles.previousSetText}>
                  {set.distance || 0} mi • {set.time || 0} min{paceFormatted ? ` • ${paceFormatted}/mi` : ''}
                </Text>
              </View>
            );
          }
          return (
            <View key={idx} style={styles.previousSetPill}>
              <Text style={styles.previousSetText}>
                {set.weight || 0} lbs × {set.reps || 0}
              </Text>
            </View>
          );
        })}
      </View>
    </Animated.View>
  );
};

export default function ExerciseCard({
  exercise,
  index,
  onEdit,
  onDelete,
  onUpdateSets,
  onUpdateNotes,
  onSetConfirmed,
  previousSession,
  isCardioWorkout = false,
  onNotesFocus,
  totalExercises,
  allExercises = [],
  onUpdateSuperset,
  onMoveUp,
  onMoveDown,
  estimated1RM,
}) {
  const [showNotes, setShowNotes] = useState(!!exercise.notes);
  const [showPrevious, setShowPrevious] = useState(false);
  const [localNotes, setLocalNotes] = useState(exercise.notes || '');
  const [pendingFocusSetIndex, setPendingFocusSetIndex] = useState(null);

  // Refs for weight/distance inputs to enable auto-focus on new sets
  const weightInputRefs = useRef([]);

  // Drag-to-reorder state
  const dragTranslateY = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const swapThreshold = 120;
  const lastSwapOffset = useSharedValue(0);

  const triggerMoveUp = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onMoveUp?.(index);
  };
  const triggerMoveDown = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onMoveDown?.(index);
  };

  const dragGesture = Gesture.Pan()
    .activateAfterLongPress(250)
    .onStart(() => {
      isDragging.value = true;
      lastSwapOffset.value = 0;
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
    })
    .onUpdate((e) => {
      dragTranslateY.value = e.translationY;
      const delta = e.translationY - lastSwapOffset.value;
      if (delta > swapThreshold) {
        lastSwapOffset.value = e.translationY;
        runOnJS(triggerMoveDown)();
      } else if (delta < -swapThreshold) {
        lastSwapOffset.value = e.translationY;
        runOnJS(triggerMoveUp)();
      }
    })
    .onEnd(() => {
      isDragging.value = false;
      dragTranslateY.value = withSpring(0, { damping: 20, stiffness: 200 });
      lastSwapOffset.value = 0;
    });

  const dragAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: isDragging.value ? dragTranslateY.value * 0.4 : withSpring(0) },
      { scale: isDragging.value ? 1.02 : withSpring(1) },
    ],
    zIndex: isDragging.value ? 100 : 0,
    shadowOpacity: isDragging.value ? 0.3 : 0,
    shadowRadius: isDragging.value ? 8 : 0,
  }));
  const cardRef = useRef(null);
  const label = isCardioWorkout ? 'Session' : 'Exercise';

  const isCardioExercise = exercise.sets?.[0]?.distance !== undefined ||
    exercise.sets?.[0]?.time !== undefined ||
    isCardioWorkout;

  const hasPreviousSession = previousSession?.sets?.length > 0;

  // Check if this exercise is part of a superset
  const isInSuperset = exercise.supersetId != null;
  const supersetExercises = allExercises.filter(e => e.supersetId === exercise.supersetId && exercise.supersetId != null);
  const isFirstInSuperset = isInSuperset && allExercises.findIndex(e => e.supersetId === exercise.supersetId) === index;
  const isLastInSuperset = isInSuperset && allExercises.map((e, i) => ({ ...e, idx: i })).filter(e => e.supersetId === exercise.supersetId).pop()?.idx === index;

  // Sync local notes with exercise notes
  useEffect(() => {
    setLocalNotes(exercise.notes || '');
  }, [exercise.notes]);

  // Focus weight/distance input when a new set is added
  useEffect(() => {
    if (pendingFocusSetIndex !== null && weightInputRefs.current[pendingFocusSetIndex]) {
      // Small delay to ensure the input is rendered
      setTimeout(() => {
        weightInputRefs.current[pendingFocusSetIndex]?.focus();
        setPendingFocusSetIndex(null);
      }, 50);
    }
  }, [pendingFocusSetIndex, exercise.sets.length]);

  const handleDelete = () => {
    Alert.alert(
      `Delete ${label}`,
      'Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(index) }
      ]
    );
  };

  const handleSetUpdate = (setIndex, field, value) => {
    const updatedSets = [...exercise.sets];
    // Revert confirmed state when editing
    updatedSets[setIndex] = {
      ...updatedSets[setIndex],
      [field]: value,
      confirmed: false
    };
    onUpdateSets(index, updatedSets);
  };

  const handleSetConfirm = (setIndex) => {
    Keyboard.dismiss();
    const updatedSets = [...exercise.sets];
    updatedSets[setIndex] = {
      ...updatedSets[setIndex],
      confirmed: true
    };
    onUpdateSets(index, updatedSets);
    onSetConfirmed?.();
  };

  // Toggle notes - closes previous session if open
  const toggleNotes = () => {
    if (!showNotes) {
      setShowPrevious(false);
    }
    setShowNotes(!showNotes);
  };

  // Toggle previous session - closes notes if open
  const togglePrevious = () => {
    if (!showPrevious) {
      setShowNotes(false);
    }
    setShowPrevious(!showPrevious);
  };

  const handleAddSet = () => {
    let newSet;
    if (isCardioExercise) {
      newSet = { distance: '', time: '', pace: '', confirmed: false };
    } else {
      newSet = { weight: '', reps: '', confirmed: false };
    }
    const newSetIndex = exercise.sets.length;
    onUpdateSets(index, [...exercise.sets, newSet]);
    // Trigger focus on the new set's weight/distance input
    setPendingFocusSetIndex(newSetIndex);
  };

  const handleRemoveSet = (setIndex) => {
    if (exercise.sets.length <= 1) return;
    Alert.alert(
      `Remove Set ${setIndex + 1}?`,
      null,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const updatedSets = exercise.sets.filter((_, i) => i !== setIndex);
            onUpdateSets(index, updatedSets);
          },
        },
      ]
    );
  };

  const handleNotesBlur = () => {
    if (localNotes !== exercise.notes) {
      onUpdateNotes(index, localNotes);
    }
  };

  // Handle notes focus - scroll to make it visible
  const handleNotesFocus = () => {
    if (cardRef.current && onNotesFocus) {
      cardRef.current.measureInWindow((x, y, width, height) => {
        // Scroll to position the card higher on screen to account for keyboard
        onNotesFocus(Math.max(0, y - 100));
      });
    }
  };

  // Superset toggle - controls link between this exercise and the one below
  const handleSupersetToggle = () => {
    if (index < totalExercises - 1) {
      const nextExercise = allExercises[index + 1];
      const isLinkedToNext = exercise.supersetId && nextExercise?.supersetId === exercise.supersetId;

      if (isLinkedToNext) {
        // Currently linked to next exercise - unlink by removing next from superset
        onUpdateSuperset?.(index + 1, null);
      } else {
        // Not linked to next exercise - create link
        if (exercise.supersetId) {
          // This exercise is in a superset, add next exercise to it
          onUpdateSuperset?.(index + 1, exercise.supersetId);
        } else if (nextExercise?.supersetId) {
          // Next exercise is in a superset, join it
          onUpdateSuperset?.(index, nextExercise.supersetId);
        } else {
          // Neither in a superset, create new one
          const newSupersetId = Date.now();
          onUpdateSuperset?.(index, newSupersetId);
          onUpdateSuperset?.(index + 1, newSupersetId);
        }
      }
    }
  };

  // Check if this exercise is linked to the one below (for button highlighting)
  const isLinkedToNext = exercise.supersetId && index < totalExercises - 1 &&
    allExercises[index + 1]?.supersetId === exercise.supersetId;

  const canConfirmSet = (set) => {
    if (isCardioExercise) {
      return (parseFloat(set.distance) > 0 || parseFloat(set.time) > 0);
    }
    // Allow 0 weight for bodyweight exercises - just require reps > 0
    return (parseFloat(set.reps) > 0);
  };

  const canDrag = totalExercises > 1 && (onMoveUp || onMoveDown);

  return (
    <Animated.View style={canDrag ? dragAnimatedStyle : undefined}>
      {/* Superset connector line - shows above card if part of superset and not first */}
      {isInSuperset && !isFirstInSuperset && (
        <View style={styles.supersetConnector}>
          <View style={styles.supersetLine} />
          <View style={styles.supersetBadge}>
            <Text style={styles.supersetBadgeText}>SUPERSET</Text>
          </View>
          <View style={styles.supersetLine} />
        </View>
      )}

      <View
        ref={cardRef}
        style={styles.exerciseCard}
      >
        {/* Header */}
        <View style={styles.exerciseHeader}>
          {/* Drag handle - long press + pan to reorder */}
          {canDrag && (
            <GestureDetector gesture={dragGesture}>
              <Animated.View style={styles.dragHandle}>
                <GripVertical size={16} color={COLORS.text.tertiary} strokeWidth={2} />
              </Animated.View>
            </GestureDetector>
          )}
          <View style={styles.exerciseNameRow}>
            <Text style={styles.exerciseName}>{exercise.name}</Text>
            {estimated1RM && !isCardioExercise && (
              <View style={styles.oneRMBadge}>
                <TrendingUp size={10} color={COLORS.accent.primary} strokeWidth={2.5} />
                <Text style={styles.oneRMText}>{Math.round(estimated1RM)}</Text>
              </View>
            )}
          </View>
          <View style={styles.exerciseActions}>
            {/* Superset button - links with exercise below */}
            {!isCardioWorkout && index < totalExercises - 1 && (
              <Pressable
                onPress={handleSupersetToggle}
                style={[styles.actionButton, isLinkedToNext && styles.actionButtonSuperset]}
              >
                <Link
                  size={15}
                  color={isLinkedToNext ? COLORS.warning : COLORS.text.tertiary}
                  strokeWidth={2}
                />
              </Pressable>
            )}
            {hasPreviousSession && (
              <Pressable
                onPress={togglePrevious}
                style={[styles.actionButton, showPrevious && styles.actionButtonActive]}
              >
                <History
                  size={15}
                  color={showPrevious ? COLORS.tertiary.primary : COLORS.text.tertiary}
                  strokeWidth={2}
                />
              </Pressable>
            )}
            <Pressable
              onPress={toggleNotes}
              style={[styles.actionButton, showNotes && styles.actionButtonActive]}
            >
              <MessageSquare
                size={15}
                color={showNotes || exercise.notes ? COLORS.tertiary.primary : COLORS.text.tertiary}
                fill={exercise.notes ? COLORS.tertiary.primary : 'transparent'}
                strokeWidth={2}
              />
            </Pressable>
            <Pressable
              onPress={handleDelete}
              style={styles.actionButton}
          >
            <Trash2
              size={15}
              color={COLORS.error}
              strokeWidth={2}
            />
          </Pressable>
        </View>
      </View>

        {/* Previous Session Panel (toggleable) */}
        <PreviousSessionPanel
          previousSession={previousSession}
          isCardio={isCardioExercise}
          isVisible={showPrevious}
        />

        {/* Notes Section (collapsible) */}
        {showNotes && (
          <View style={styles.notesSection}>
            <TextInput
              style={styles.notesInput}
              value={localNotes}
              onChangeText={setLocalNotes}
              onBlur={handleNotesBlur}
              onFocus={handleNotesFocus}
              placeholder="Add notes..."
              placeholderTextColor={COLORS.text.tertiary}
              multiline
            />
          </View>
        )}

        {/* Sets */}
        <View style={styles.setsContainer}>
          {/* Column Headers */}
          <View style={styles.setHeaderRow}>
            <View style={styles.removeSetHeader} />
            <View style={styles.setNumberHeader} />
            {isCardioExercise ? (
              <>
                <Text style={styles.setHeaderLabel}>Dist</Text>
                <Text style={styles.setHeaderLabel}>Time</Text>
                <Text style={[styles.setHeaderLabel, styles.setHeaderLabelPace]}>Pace</Text>
              </>
            ) : (
              <>
                <Text style={styles.setHeaderLabel}>Weight</Text>
                <Text style={styles.setHeaderLabel}>Reps</Text>
              </>
            )}
            <View style={styles.setActionsHeader} />
          </View>

          {exercise.sets.map((set, setIdx) => {
            const isConfirmed = set.confirmed || false;
            const pace = isCardioExercise ? calculatePace(set.distance, set.time) : 0;
            const paceFormatted = formatPace(pace);

            return (
              <View
                key={setIdx}
                style={[
                  styles.setRow,
                  isConfirmed && styles.setRowConfirmed
                ]}
              >
                <Pressable
                  onPress={() => handleRemoveSet(setIdx)}
                  style={[styles.removeSetButton, exercise.sets.length <= 1 && styles.removeSetButtonDisabled]}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  disabled={exercise.sets.length <= 1}
                >
                  <X
                    size={12}
                    color={exercise.sets.length <= 1 ? COLORS.surface.border : COLORS.error}
                    strokeWidth={2.5}
                  />
                </Pressable>
                <View style={[styles.setNumber, isConfirmed && styles.setNumberConfirmed]}>
                  <Text style={[styles.setNumberText, isConfirmed && styles.setNumberTextConfirmed]}>
                    {setIdx + 1}
                  </Text>
                </View>

                {isCardioExercise ? (
                  <>
                    <SetInputField
                      ref={(el) => { weightInputRefs.current[setIdx] = el; }}
                      value={set.distance?.toString() || ''}
                      onChangeText={(value) => handleSetUpdate(setIdx, 'distance', value)}
                      keyboardType="decimal-pad"
                      unit="mi"
                      isConfirmed={isConfirmed}
                    />
                    <SetInputField
                      value={set.time?.toString() || ''}
                      onChangeText={(value) => handleSetUpdate(setIdx, 'time', value)}
                      keyboardType="decimal-pad"
                      unit="min"
                      isConfirmed={isConfirmed}
                    />
                    <View style={styles.paceDisplay}>
                      <Text style={[styles.paceText, !paceFormatted && styles.paceTextEmpty]}>
                        {paceFormatted || '--:--'}
                      </Text>
                      <Text style={styles.paceUnit}>/mi</Text>
                    </View>
                  </>
                ) : (
                  <>
                    <SetInputField
                      ref={(el) => { weightInputRefs.current[setIdx] = el; }}
                      value={set.weight?.toString() || ''}
                      onChangeText={(value) => handleSetUpdate(setIdx, 'weight', value)}
                      keyboardType="decimal-pad"
                      unit="lbs"
                      isConfirmed={isConfirmed}
                    />
                    <SetInputField
                      value={set.reps?.toString() || ''}
                      onChangeText={(value) => handleSetUpdate(setIdx, 'reps', value)}
                      keyboardType="number-pad"
                      unit=""
                      isConfirmed={isConfirmed}
                    />
                  </>
                )}

                {/* Confirm */}
                <View style={styles.setActions}>
                  <ConfirmButton
                    isConfirmed={isConfirmed}
                    canConfirm={canConfirmSet(set)}
                    onConfirm={() => handleSetConfirm(setIdx)}
                  />
                </View>
              </View>
            );
          })}

          {/* Add Set Button */}
          <Pressable onPress={handleAddSet} style={styles.addSetButton}>
            <Plus size={14} color={COLORS.accent.primary} strokeWidth={2.5} />
            <Text style={styles.addSetText}>Add Set</Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  exerciseCard: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.sm,
    marginBottom: SPACING.sm
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs
  },
  exerciseNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  exerciseName: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 14,
    color: COLORS.text.primary,
  },
  oneRMBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.accent.primaryDim,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    marginLeft: SPACING.sm,
  },
  oneRMText: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.accent.primary,
  },
  exerciseActions: {
    flexDirection: 'row',
    gap: SPACING.xs,
    alignItems: 'center',
  },
  dragHandle: {
    paddingRight: SPACING.sm,
    paddingVertical: SPACING.xs,
    marginRight: SPACING.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButton: {
    padding: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  actionButtonActive: {
    backgroundColor: COLORS.tertiary.dim,
  },
  actionButtonSuperset: {
    backgroundColor: 'rgba(255, 193, 7, 0.15)',
  },

  // Superset styles
  supersetConnector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: -SPACING.xs,
    marginBottom: SPACING.xs,
  },
  supersetLine: {
    flex: 1,
    height: 2,
    backgroundColor: COLORS.warning,
    opacity: 0.4,
  },
  supersetBadge: {
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    marginHorizontal: SPACING.sm,
  },
  supersetBadgeText: {
    ...TYPOGRAPHY.label,
    fontSize: 8,
    color: COLORS.warning,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  // Previous Session Panel
  previousPanel: {
    backgroundColor: COLORS.tertiary.dim,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  previousHeader: {
    marginBottom: SPACING.xs,
  },
  previousDate: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    color: COLORS.tertiary.primary,
    fontWeight: '600',
  },
  previousSets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  previousSetPill: {
    backgroundColor: 'rgba(0, 212, 255, 0.15)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  previousSetText: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.tertiary.primary,
    fontWeight: '600',
  },

  // Notes
  notesSection: {
    marginBottom: SPACING.sm,
  },
  notesInput: {
    backgroundColor: COLORS.background.elevated,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    padding: SPACING.sm,
    ...TYPOGRAPHY.caption,
    color: COLORS.text.primary,
    minHeight: 50,
    textAlignVertical: 'top',
  },

  // Sets
  setsContainer: {
    gap: 6,
  },
  setHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 2,
    marginBottom: 2,
  },
  removeSetHeader: {
    width: 20,
  },
  setNumberHeader: {
    width: 26,
    marginRight: SPACING.md,
  },
  setHeaderLabel: {
    ...TYPOGRAPHY.label,
    fontSize: 9,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    flex: 1,
    marginHorizontal: SPACING.xs,
  },
  setHeaderLabelPace: {
    flex: 0.7,
  },
  setActionsHeader: {
    width: 32,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 2,
    borderRadius: RADIUS.sm,
  },
  setRowConfirmed: {
    backgroundColor: 'rgba(0, 255, 136, 0.06)',
  },
  removeSetButton: {
    width: 20,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeSetButtonDisabled: {
    opacity: 0.3,
  },
  setNumber: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent.primaryDim,
    borderRadius: RADIUS.sm,
    marginRight: SPACING.md,
  },
  setNumberConfirmed: {
    backgroundColor: COLORS.success,
  },
  setNumberText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.accent.primary,
    fontSize: 11,
  },
  setNumberTextConfirmed: {
    color: COLORS.text.inverse,
  },
  // Input with unit container
  inputWithUnit: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.elevated,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    height: 34,
    marginHorizontal: SPACING.xs,
    paddingRight: 4,
  },
  inputWithUnitConfirmed: {
    borderColor: 'rgba(0, 255, 136, 0.3)',
    backgroundColor: 'rgba(0, 255, 136, 0.05)',
  },
  setInput: {
    flex: 1,
    paddingVertical: 0,
    paddingHorizontal: 6,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
    textAlign: 'center',
    height: 32,
  },
  setInputPlaceholder: {
    color: COLORS.text.tertiary,
  },
  setInputConfirmed: {
    color: COLORS.text.primary,
  },
  unitSuffix: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginRight: 2,
  },
  unitSuffixDim: {
    color: COLORS.text.tertiary,
  },

  // Pace display
  paceDisplay: {
    flex: 0.7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: SPACING.xs,
  },
  paceText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.accent.primary,
  },
  paceTextEmpty: {
    color: COLORS.text.tertiary,
  },
  paceUnit: {
    fontSize: 10,
    fontWeight: '500',
    color: COLORS.text.tertiary,
    marginLeft: 1,
  },

  // Set Actions
  setActions: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
  },

  // Confirm Button
  confirmButton: {
    width: 24,
    height: 24,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surface.card,
    borderWidth: 1.5,
    borderColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonActive: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  confirmButtonDisabled: {
    borderColor: COLORS.surface.border,
    opacity: 0.4,
  },

  addSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: 6,
    marginTop: 2,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.surface.border,
    borderStyle: 'dashed',
  },
  addSetText: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.accent.primary,
  },
});
