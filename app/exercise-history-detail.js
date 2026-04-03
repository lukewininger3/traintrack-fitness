import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ClipboardList, Play, X } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';
import { loadWorkouts } from '../src/utils/storage';
import { TYPOGRAPHY, SPACING, RADIUS } from '../src/theme/design';
import { useTheme } from '../src/contexts/ThemeContext';

export default function ExerciseHistoryDetailScreen() {
  const { colors: themeColors } = useTheme();
  const params = useLocalSearchParams();
  const exerciseName = params.exerciseName;

  const [allWorkouts, setAllWorkouts] = useState([]);
  const [mediaViewer, setMediaViewer] = useState(null);

  // Video player for media viewer
  const videoSource = mediaViewer?.type === 'video' ? mediaViewer.uri : null;
  const videoPlayer = useVideoPlayer(videoSource, player => {
    if (player) {
      player.play();
    }
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const data = await loadWorkouts();
    // Add T12:00:00 to avoid timezone issues when parsing YYYY-MM-DD format
    const sorted = (data || []).sort((a, b) => new Date(b.date + 'T12:00:00') - new Date(a.date + 'T12:00:00'));
    setAllWorkouts(sorted);
  };

  // Get exercise history
  const exerciseHistory = useMemo(() => {
    if (!exerciseName || allWorkouts.length === 0) return [];

    const history = [];
    allWorkouts.forEach(workout => {
      const exercise = workout.exercises?.find(e => e.name === exerciseName);
      if (exercise) {
        history.push({
          workoutId: workout.id,
          workoutName: workout.name,
          date: workout.date,
          time: workout.time,
          sets: exercise.sets || [],
          notes: exercise.notes || '',
          media: exercise.media || [],
        });
      }
    });

    return history;
  }, [exerciseName, allWorkouts]);

  const handleClose = () => {
    router.back();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background.primary }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: themeColors.surface.border }]}>
        <Pressable onPress={handleClose} style={styles.backButton}>
          <ArrowLeft size={24} color={themeColors.text.primary} strokeWidth={2} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: themeColors.text.primary }]} numberOfLines={1}>
            {exerciseName}
          </Text>
          <Text style={[styles.headerSubtitle, { color: themeColors.text.tertiary }]}>
            {exerciseHistory.length} {exerciseHistory.length === 1 ? 'entry' : 'entries'}
          </Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      {/* History Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {exerciseHistory.length === 0 ? (
          <View style={styles.emptyState}>
            <ClipboardList size={48} color={themeColors.text.tertiary} strokeWidth={1.5} />
            <Text style={[styles.emptyStateText, { color: themeColors.text.tertiary }]}>
              No history found for {exerciseName}
            </Text>
          </View>
        ) : (
          exerciseHistory.map((entry, index) => (
            <View
              key={`${entry.workoutId}-${index}`}
              style={[styles.historyEntry, { backgroundColor: themeColors.surface.card, borderColor: themeColors.surface.border }]}
            >
              <View style={styles.historyEntryHeader}>
                <View>
                  <Text style={[styles.historyEntryDate, { color: themeColors.text.primary }]}>
                    {new Date(entry.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                  {entry.workoutName && (
                    <Text style={[styles.historyWorkoutName, { color: themeColors.text.secondary }]}>
                      {entry.workoutName}
                    </Text>
                  )}
                </View>
                <Text style={[styles.historyEntryTime, { color: themeColors.text.tertiary }]}>
                  {entry.time}
                </Text>
              </View>

              {/* Sets */}
              <View style={styles.historySetsContainer}>
                {entry.sets.map((set, setIdx) => (
                  <View
                    key={setIdx}
                    style={[styles.historySetRow, { borderBottomColor: themeColors.surface.border }]}
                  >
                    <Text style={[styles.historySetNumber, { color: themeColors.text.tertiary }]}>
                      Set {setIdx + 1}
                    </Text>
                    <Text style={[styles.historySetData, { color: themeColors.text.primary }]}>
                      {set.weight > 0 ? `${set.weight} lbs` : '--'} x {set.reps > 0 ? set.reps : '--'} reps
                    </Text>
                  </View>
                ))}
              </View>

              {/* Notes */}
              {entry.notes ? (
                <View style={[styles.historyNotesContainer, { backgroundColor: themeColors.background.elevated }]}>
                  <Text style={[styles.historyNotesLabel, { color: themeColors.text.tertiary }]}>Notes</Text>
                  <Text style={[styles.historyNotesText, { color: themeColors.text.secondary }]}>
                    {entry.notes}
                  </Text>
                </View>
              ) : null}

              {/* Media */}
              {entry.media && entry.media.length > 0 && (
                <View style={styles.historyMediaContainer}>
                  <Text style={[styles.historyMediaLabel, { color: themeColors.text.tertiary }]}>Media</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.historyMediaScroll}>
                    {entry.media.map((media) => (
                      <Pressable
                        key={media.id}
                        onPress={() => setMediaViewer(media)}
                        style={styles.historyMediaThumbnail}
                      >
                        <Image
                          source={{ uri: media.thumbnail || media.uri }}
                          style={styles.historyMediaImage}
                        />
                        {media.type === 'video' && (
                          <View style={styles.historyMediaPlayOverlay}>
                            <Play size={20} color="#fff" fill="#fff" />
                          </View>
                        )}
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          ))
        )}
        <View style={{ height: 50 }} />
      </ScrollView>

      {/* Media Viewer Modal */}
      <Modal
        visible={!!mediaViewer}
        transparent
        animationType="fade"
        onRequestClose={() => setMediaViewer(null)}
      >
        <TouchableOpacity
          style={styles.mediaViewerOverlay}
          activeOpacity={1}
          onPress={() => setMediaViewer(null)}
        >
          {mediaViewer?.type === 'video' && videoPlayer ? (
            <VideoView
              player={videoPlayer}
              style={styles.mediaViewerVideo}
              contentFit="contain"
              nativeControls
            />
          ) : (
            mediaViewer && (
              <Image
                source={{ uri: mediaViewer.uri }}
                style={styles.mediaViewerImage}
              />
            )
          )}
          <TouchableOpacity
            style={styles.mediaViewerClose}
            onPress={() => setMediaViewer(null)}
          >
            <X size={28} color="#fff" />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 60,
    paddingVertical: SPACING.xs,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 16,
  },
  headerSubtitle: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl * 2,
    gap: SPACING.md,
  },
  emptyStateText: {
    ...TYPOGRAPHY.body,
    textAlign: 'center',
  },
  historyEntry: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  historyEntryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: SPACING.md,
  },
  historyEntryDate: {
    ...TYPOGRAPHY.bodyBold,
  },
  historyWorkoutName: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
  },
  historyEntryTime: {
    ...TYPOGRAPHY.caption,
  },
  historySetsContainer: {
    paddingHorizontal: SPACING.md,
  },
  historySetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
  },
  historySetNumber: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
  },
  historySetData: {
    ...TYPOGRAPHY.body,
    fontWeight: '500',
  },
  historyNotesContainer: {
    margin: SPACING.md,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  historyNotesLabel: {
    ...TYPOGRAPHY.label,
    fontSize: 10,
    marginBottom: SPACING.xs,
  },
  historyNotesText: {
    ...TYPOGRAPHY.body,
    fontSize: 13,
  },
  historyMediaContainer: {
    padding: SPACING.md,
    paddingTop: 0,
  },
  historyMediaLabel: {
    ...TYPOGRAPHY.label,
    fontSize: 10,
    marginBottom: SPACING.sm,
  },
  historyMediaScroll: {
    flexDirection: 'row',
  },
  historyMediaThumbnail: {
    width: 70,
    height: 70,
    borderRadius: RADIUS.md,
    marginRight: SPACING.sm,
    overflow: 'hidden',
  },
  historyMediaImage: {
    width: '100%',
    height: '100%',
  },
  historyMediaPlayOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaViewerOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  mediaViewerImage: {
    width: '90%',
    height: '70%',
    resizeMode: 'contain',
  },
  mediaViewerVideo: {
    width: '90%',
    height: '70%',
  },
  mediaViewerClose: {
    position: 'absolute',
    top: 60,
    right: 20,
    padding: SPACING.md,
  },
});
