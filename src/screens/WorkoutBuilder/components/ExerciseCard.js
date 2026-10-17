import { Camera, Check, GripVertical, History, Link, MessageSquare, Play, Plus, X } from 'lucide-react-native';
import React, { useState, useEffect, useRef } from 'react';
import { Alert, Image, Keyboard, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { useVideoPlayer, VideoView } from 'expo-video';
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
import { TYPOGRAPHY, SPACING, RADIUS } from '../../../theme/design';
import { useTheme } from '../../../contexts/ThemeContext';
import { Swipeable } from '../../../components/ui/Swipeable';

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
const SetInputField = React.forwardRef(({ value, onChangeText, placeholder, unit, keyboardType, isConfirmed, testID, themeColors }, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const internalRef = useRef(null);
  const inputRef = ref || internalRef;

  // Determine if field has a real value (including 0)
  // Convert to string to handle both string "0" and number 0
  const stringValue = value?.toString() || '';
  const hasValue = stringValue !== '';

  // Always show "0" for numeric fields with no value - never show greyed out
  // If value is 0 or empty, display "0" in normal style
  const displayValue = hasValue ? stringValue : '0';

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
    // If field is empty when blurred, default to 0
    if (!stringValue || stringValue === '') {
      onChangeText('0');
    }
  };

  const handleChangeText = (text) => {
    onChangeText(text);
  };

  return (
    <View style={[
      styles.inputWithUnit,
      { backgroundColor: themeColors.background.elevated, borderColor: themeColors.surface.border },
      isConfirmed && { borderColor: themeColors.success + '50', backgroundColor: themeColors.success + '08' },
    ]}>
      <TextInput
        ref={inputRef}
        style={[styles.setInput, { color: themeColors.text.primary }]}
        value={isFocused ? stringValue : displayValue}
        onChangeText={handleChangeText}
        onFocus={handleFocus}
        onBlur={handleBlur}
        keyboardType={keyboardType}
        placeholder=""
        placeholderTextColor={themeColors.text.tertiary}
        selectTextOnFocus
      />
      {unit ? (
        <Text style={[styles.unitSuffix, { color: themeColors.text.secondary }]}>{unit}</Text>
      ) : null}
    </View>
  );
});
SetInputField.displayName = 'SetInputField';

// Animated checkmark for set confirmation
const ConfirmButton = ({ isConfirmed, canConfirm, onConfirm, themeColors }) => {
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
          { backgroundColor: themeColors.surface.card, borderColor: themeColors.success },
          isConfirmed && { backgroundColor: themeColors.success, borderColor: themeColors.success },
          !canConfirm && !isConfirmed && { borderColor: themeColors.surface.border, opacity: 0.4 },
        ]}
        disabled={!canConfirm && !isConfirmed}
      >
        <Check
          size={14}
          color={isConfirmed ? themeColors.text.inverse : (canConfirm ? themeColors.success : themeColors.text.tertiary)}
          strokeWidth={2.5}
        />
      </Pressable>
    </Animated.View>
  );
};

// Collapsible previous session panel
const PreviousSessionPanel = ({ previousSession, isCardio, isVisible, themeColors }) => {
  if (!previousSession || !previousSession.sets || previousSession.sets.length === 0 || !isVisible) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      style={[styles.previousPanel, { backgroundColor: themeColors.tertiary.dim }]}
    >
      <View style={styles.previousHeader}>
        <Text style={[styles.previousDate, { color: themeColors.tertiary.primary }]}>{previousSession.date}</Text>
      </View>
      <View style={styles.previousSets}>
        {previousSession.sets.map((set, idx) => {
          if (isCardio) {
            const pace = calculatePace(set.distance, set.time);
            const paceFormatted = formatPace(pace);
            return (
              <View key={idx} style={[styles.previousSetPill, { backgroundColor: themeColors.tertiary.primary + '25' }]}>
                <Text style={[styles.previousSetText, { color: themeColors.tertiary.primary }]}>
                  {set.distance || 0} mi • {set.time || 0} min{paceFormatted ? ` • ${paceFormatted}/mi` : ''}
                </Text>
              </View>
            );
          }
          return (
            <View key={idx} style={[styles.previousSetPill, { backgroundColor: themeColors.tertiary.primary + '25' }]}>
              <Text style={[styles.previousSetText, { color: themeColors.tertiary.primary }]}>
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
  onUpdateMedia,
  onSetConfirmed,
  previousSession,
  isCardioWorkout = false,
  onNotesFocus,
  totalExercises,
  allExercises = [],
  onUpdateSuperset,
  onMoveUp,
  onMoveDown,
}) {
  const { colors: themeColors } = useTheme();
  const [showNotes, setShowNotes] = useState(!!exercise.notes);
  const [showPrevious, setShowPrevious] = useState(false);
  const [showMedia, setShowMedia] = useState(false);
  const [localNotes, setLocalNotes] = useState(exercise.notes || '');
  const [pendingFocusSetIndex, setPendingFocusSetIndex] = useState(null);
  const [mediaViewerVisible, setMediaViewerVisible] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);

  // Video player for media viewer (expo-video)
  const videoSource = selectedMedia?.type === 'video' ? selectedMedia.uri : null;
  const videoPlayer = useVideoPlayer(videoSource, player => {
    if (player) {
      player.play();
    }
  });

  // Refs for weight/distance inputs to enable auto-focus on new sets
  const weightInputRefs = useRef([]);
  const notesInputRef = useRef(null);

  // Drag-to-reorder state
  const dragTranslateY = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const swapThreshold = 70; // Smaller threshold for faster multi-card dragging
  const lastSwapOffset = useSharedValue(0);

  const triggerMoveUp = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Break superset when reordering
    if (exercise.supersetId) {
      onUpdateSuperset?.(index, null);
    }
    onMoveUp?.(index);
  };
  const triggerMoveDown = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Break superset when reordering
    if (exercise.supersetId) {
      onUpdateSuperset?.(index, null);
    }
    onMoveDown?.(index);
  };

  const dragGesture = Gesture.Pan()
    .activateAfterLongPress(200)
    .activeOffsetY([-5, 5])
    .failOffsetX([-20, 20])
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
      // Focus the notes input after it renders
      setTimeout(() => {
        notesInputRef.current?.focus();
        onNotesFocus?.();
      }, 100);
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

  // Toggle media section
  const toggleMedia = () => {
    setShowMedia(!showMedia);
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

  // Helper to generate video thumbnail
  const generateVideoThumbnail = async (videoUri) => {
    try {
      const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
        time: 500, // Get frame at 500ms
      });
      return uri;
    } catch (e) {
      console.warn('Failed to generate video thumbnail:', e);
      return null;
    }
  };

  // Media handling
  const handleAddMedia = () => {
    Alert.alert(
      'Add Media',
      'Choose an option',
      [
        {
          text: 'Take Photo/Video',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission needed', 'Camera permission is required to take photos/videos.');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.All,
              allowsEditing: true,
              quality: 0.8,
              videoMaxDuration: 60,
            });
            if (!result.canceled && result.assets?.[0]) {
              const asset = result.assets[0];
              const isVideo = asset.type === 'video' || /\.(mp4|mov|m4v)$/i.test(asset.uri);
              const newMedia = {
                uri: asset.uri,
                type: isVideo ? 'video' : 'image',
                id: Date.now().toString(),
              };
              // Generate thumbnail for videos
              if (isVideo) {
                const thumbnail = await generateVideoThumbnail(asset.uri);
                if (thumbnail) {
                  newMedia.thumbnail = thumbnail;
                }
              }
              const currentMedia = exercise.media || [];
              onUpdateMedia?.(index, [...currentMedia, newMedia]);
            }
          },
        },
        {
          text: 'Choose from Library',
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission needed', 'Photo library permission is required.');
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.All,
              allowsEditing: true,
              quality: 0.8,
            });
            if (!result.canceled && result.assets?.[0]) {
              const asset = result.assets[0];
              const isVideo = asset.type === 'video' || /\.(mp4|mov|m4v)$/i.test(asset.uri);
              const newMedia = {
                uri: asset.uri,
                type: isVideo ? 'video' : 'image',
                id: Date.now().toString(),
              };
              // Generate thumbnail for videos
              if (isVideo) {
                const thumbnail = await generateVideoThumbnail(asset.uri);
                if (thumbnail) {
                  newMedia.thumbnail = thumbnail;
                }
              }
              const currentMedia = exercise.media || [];
              onUpdateMedia?.(index, [...currentMedia, newMedia]);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleRemoveMedia = (mediaId) => {
    Alert.alert(
      'Remove Media',
      'Are you sure you want to remove this media?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const currentMedia = exercise.media || [];
            onUpdateMedia?.(index, currentMedia.filter(m => m.id !== mediaId));
          },
        },
      ]
    );
  };

  const handleViewMedia = (media) => {
    setSelectedMedia(media);
    setMediaViewerVisible(true);
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
          <View style={[styles.supersetLine, { backgroundColor: themeColors.secondary.primary }]} />
          <View style={[styles.supersetBadge, { backgroundColor: themeColors.secondary.dim }]}>
            <Text style={[styles.supersetBadgeText, { color: themeColors.secondary.primary }]}>SUPERSET</Text>
          </View>
          <View style={[styles.supersetLine, { backgroundColor: themeColors.secondary.primary }]} />
        </View>
      )}

      <Swipeable onDelete={handleDelete}>
        <View
          ref={cardRef}
          style={[styles.exerciseCard, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }]}
        >
        {/* Header */}
        <View style={styles.exerciseHeader}>
          {/* Drag handle - long press + pan to reorder */}
          {canDrag && (
            <GestureDetector gesture={dragGesture}>
              <Animated.View style={styles.dragHandle}>
                <GripVertical size={16} color={themeColors.text.tertiary} strokeWidth={2} />
              </Animated.View>
            </GestureDetector>
          )}
          <View style={styles.exerciseNameRow}>
            <Text style={[styles.exerciseName, { color: themeColors.text.primary }]}>{exercise.name}</Text>
          </View>
          <View style={styles.exerciseActions}>
            {/* Superset button - links with exercise below - Orange */}
            {!isCardioWorkout && index < totalExercises - 1 && (
              <Pressable
                onPress={handleSupersetToggle}
                style={[styles.actionButton, isLinkedToNext && { backgroundColor: themeColors.secondary.dim }]}
              >
                <Link
                  size={15}
                  color={isLinkedToNext ? themeColors.secondary.primary : themeColors.text.tertiary}
                  strokeWidth={2}
                />
              </Pressable>
            )}
            {/* Last session button - Cyan/Blue */}
            {hasPreviousSession && (
              <Pressable
                onPress={togglePrevious}
                style={[styles.actionButton, showPrevious && { backgroundColor: themeColors.tertiary.dim }]}
              >
                <History
                  size={15}
                  color={showPrevious ? themeColors.tertiary.primary : themeColors.text.tertiary}
                  strokeWidth={2}
                />
              </Pressable>
            )}
            {/* Notes button - Accent/Green */}
            <Pressable
              onPress={toggleNotes}
              style={[styles.actionButton, showNotes && { backgroundColor: themeColors.accent.primaryDim }]}
            >
              <MessageSquare
                size={15}
                color={showNotes || exercise.notes ? themeColors.accent.primary : themeColors.text.tertiary}
                fill={exercise.notes ? themeColors.accent.primary : 'transparent'}
                strokeWidth={2}
              />
            </Pressable>
            {/* Media button */}
            <Pressable
              onPress={toggleMedia}
              style={[styles.actionButton, showMedia && { backgroundColor: themeColors.secondary.dim }]}
            >
              <Camera
                size={15}
                color={showMedia || exercise.media?.length ? themeColors.secondary.primary : themeColors.text.tertiary}
                fill={exercise.media?.length ? themeColors.secondary.primary : 'transparent'}
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
          themeColors={themeColors}
        />

        {/* Notes Section (collapsible) */}
        {showNotes && (
          <View style={styles.notesSection}>
            <TextInput
              ref={notesInputRef}
              style={[styles.notesInput, { backgroundColor: themeColors.background.elevated, borderColor: themeColors.surface.border, color: themeColors.text.primary }]}
              value={localNotes}
              onChangeText={setLocalNotes}
              onBlur={handleNotesBlur}
              onFocus={handleNotesFocus}
              placeholder="Add notes..."
              placeholderTextColor={themeColors.text.tertiary}
              multiline
            />
          </View>
        )}

        {/* Media Section (collapsible) */}
        {showMedia && (
          <View style={styles.mediaSection}>
            <View style={styles.mediaSectionHeader}>
              <Text style={[styles.mediaSectionLabel, { color: themeColors.text.secondary }]}>Media</Text>
            </View>
            <View style={styles.mediaGrid}>
              {(exercise.media || []).map((media) => (
                <Pressable
                  key={media.id}
                  onPress={() => handleViewMedia(media)}
                  onLongPress={() => handleRemoveMedia(media.id)}
                  style={[styles.mediaThumbnail, { backgroundColor: themeColors.background.elevated, borderColor: themeColors.surface.border }]}
                >
                  {media.type === 'video' ? (
                    <View style={styles.videoThumbnailContainer}>
                      <Image source={{ uri: media.thumbnail || media.uri }} style={styles.thumbnailImage} />
                      <View style={[styles.playOverlay, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
                        <Play size={20} color="#fff" fill="#fff" />
                      </View>
                    </View>
                  ) : (
                    <Image source={{ uri: media.uri }} style={styles.thumbnailImage} />
                  )}
                </Pressable>
              ))}
              <Pressable
                onPress={handleAddMedia}
                style={[styles.addMediaButton, { backgroundColor: themeColors.background.elevated, borderColor: themeColors.surface.border }]}
              >
                <Camera size={20} color={themeColors.secondary.primary} />
                <Text style={[styles.addMediaText, { color: themeColors.secondary.primary }]}>Add</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Media Viewer Modal */}
        <Modal
          visible={mediaViewerVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setMediaViewerVisible(false)}
        >
          <Pressable
            style={styles.mediaViewerOverlay}
            onPress={() => setMediaViewerVisible(false)}
          >
            <View style={[styles.mediaViewerContent, { backgroundColor: themeColors.background.primary }]}>
              {selectedMedia?.type === 'video' && videoPlayer ? (
                <VideoView
                  player={videoPlayer}
                  style={styles.mediaViewerVideo}
                  contentFit="contain"
                  nativeControls
                />
              ) : selectedMedia ? (
                <Image
                  source={{ uri: selectedMedia.uri }}
                  style={styles.mediaViewerImage}
                  resizeMode="contain"
                />
              ) : null}
              <Pressable
                onPress={() => setMediaViewerVisible(false)}
                style={[styles.closeMediaButton, { backgroundColor: themeColors.background.elevated }]}
              >
                <X size={24} color={themeColors.text.primary} />
              </Pressable>
            </View>
          </Pressable>
        </Modal>

        {/* Sets */}
        <View style={styles.setsContainer}>
          {/* Column Headers */}
          <View style={styles.setHeaderRow}>
            <View style={styles.removeSetHeader} />
            <View style={styles.setNumberHeader} />
            {isCardioExercise ? (
              <>
                <Text style={[styles.setHeaderLabel, { color: themeColors.text.tertiary }]}>Dist</Text>
                <Text style={[styles.setHeaderLabel, { color: themeColors.text.tertiary }]}>Time</Text>
                <Text style={[styles.setHeaderLabel, styles.setHeaderLabelPace, { color: themeColors.text.tertiary }]}>Pace</Text>
              </>
            ) : (
              <>
                <Text style={[styles.setHeaderLabel, { color: themeColors.text.tertiary }]}>Weight</Text>
                <Text style={[styles.setHeaderLabel, { color: themeColors.text.tertiary }]}>Reps</Text>
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
                  isConfirmed && { backgroundColor: themeColors.success + '0F' }
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
                    color={exercise.sets.length <= 1 ? themeColors.surface.border : themeColors.error}
                    strokeWidth={2.5}
                  />
                </Pressable>
                <View style={[styles.setNumber, { backgroundColor: themeColors.accent.primaryDim }, isConfirmed && { backgroundColor: themeColors.success }]}>
                  <Text style={[styles.setNumberText, { color: themeColors.accent.primary }, isConfirmed && { color: themeColors.text.inverse }]}>
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
                      themeColors={themeColors}
                    />
                    <SetInputField
                      value={set.time?.toString() || ''}
                      onChangeText={(value) => handleSetUpdate(setIdx, 'time', value)}
                      keyboardType="decimal-pad"
                      unit="min"
                      isConfirmed={isConfirmed}
                      themeColors={themeColors}
                    />
                    <View style={styles.paceDisplay}>
                      <Text style={[styles.paceText, { color: themeColors.accent.primary }, !paceFormatted && { color: themeColors.text.tertiary }]}>
                        {paceFormatted || '--:--'}
                      </Text>
                      <Text style={[styles.paceUnit, { color: themeColors.text.tertiary }]}>/mi</Text>
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
                      themeColors={themeColors}
                    />
                    <SetInputField
                      value={set.reps?.toString() || ''}
                      onChangeText={(value) => handleSetUpdate(setIdx, 'reps', value)}
                      keyboardType="number-pad"
                      unit=""
                      isConfirmed={isConfirmed}
                      themeColors={themeColors}
                    />
                  </>
                )}

                {/* Confirm */}
                <View style={styles.setActions}>
                  <ConfirmButton
                    isConfirmed={isConfirmed}
                    canConfirm={canConfirmSet(set)}
                    onConfirm={() => handleSetConfirm(setIdx)}
                    themeColors={themeColors}
                  />
                </View>
              </View>
            );
          })}

          {/* Add Set Button */}
          <Pressable onPress={handleAddSet} style={[styles.addSetButton, { borderColor: themeColors.surface.border }]}>
            <Plus size={14} color={themeColors.accent.primary} strokeWidth={2.5} />
            <Text style={[styles.addSetText, { color: themeColors.accent.primary }]}>Add Set</Text>
          </Pressable>
        </View>
      </View>
      </Swipeable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  exerciseCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  exerciseNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  exerciseName: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 14,
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
    opacity: 0.4,
  },
  supersetBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    marginHorizontal: SPACING.sm,
  },
  supersetBadgeText: {
    ...TYPOGRAPHY.label,
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Previous Session Panel
  previousPanel: {
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
    fontWeight: '600',
  },
  previousSets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  previousSetPill: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  previousSetText: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    fontWeight: '600',
  },

  // Notes
  notesSection: {
    marginBottom: SPACING.sm,
  },
  notesInput: {
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    padding: SPACING.sm,
    ...TYPOGRAPHY.caption,
    minHeight: 50,
    textAlignVertical: 'top',
  },

  // Media
  mediaSection: {
    marginBottom: SPACING.sm,
  },
  mediaSectionHeader: {
    marginBottom: SPACING.xs,
  },
  mediaSectionLabel: {
    ...TYPOGRAPHY.label,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  mediaThumbnail: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    overflow: 'hidden',
  },
  videoThumbnailContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMediaButton: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  addMediaText: {
    ...TYPOGRAPHY.label,
    fontSize: 9,
    fontWeight: '600',
  },
  mediaViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaViewerContent: {
    width: '90%',
    height: '70%',
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  mediaViewerImage: {
    width: '100%',
    height: '100%',
  },
  mediaViewerVideo: {
    width: '100%',
    height: '100%',
  },
  closeMediaButton: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
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
    borderRadius: RADIUS.sm,
    marginRight: SPACING.md,
  },
  setNumberText: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 11,
  },

  // Input with unit container
  inputWithUnit: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    height: 34,
    marginHorizontal: SPACING.xs,
    paddingRight: 4,
  },
  setInput: {
    flex: 1,
    paddingVertical: 0,
    paddingHorizontal: 6,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    height: 32,
  },
  unitSuffix: {
    fontSize: 11,
    fontWeight: '600',
    marginRight: 2,
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
  },
  paceUnit: {
    fontSize: 10,
    fontWeight: '500',
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
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
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
    borderStyle: 'dashed',
  },
  addSetText: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    fontWeight: '600',
  },
});
