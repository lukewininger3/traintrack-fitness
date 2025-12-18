import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { Activity, Bike, Dumbbell, Edit2, Plus, Trash2 } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { getWorkoutsByMonth } from '../utils/calculations';
import { loadWorkouts, saveWorkouts } from '../utils/storage';

export default function ActivitiesScreen() {
  const [workouts, setWorkouts] = useState([]);
  const [selectedWorkout, setSelectedWorkout] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    const data = await loadWorkouts();
    const sorted = data.sort((a, b) => new Date(b.date) - new Date(a.date));
    setWorkouts(sorted);
  };

  const getWorkoutIcon = (type) => {
    const icons = {
      'Strength': Dumbbell,
      'Running': Activity,
      'Cycling': Bike,
      'Swimming': Activity,
      'Other': Activity
    };
    return icons[type] || Activity;
  };

  const deleteWorkout = async (workoutId) => {
    Alert.alert(
      'Delete Workout',
      'Are you sure you want to delete this workout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updated = workouts.filter(w => w.id !== workoutId);
            setWorkouts(updated);
            await saveWorkouts(updated);
            setSelectedWorkout(null);
          }
        }
      ]
    );
  };

  const workoutsByMonth = getWorkoutsByMonth(workouts);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {workouts.length === 0 ? (
            <View style={styles.emptyState}>
              <Dumbbell size={64} color="#4B5563" strokeWidth={1.5} />
              <Text style={styles.emptyTitle}>No Workouts Yet</Text>
              <Text style={styles.emptyText}>Start your fitness journey today!</Text>
            </View>
          ) : (
            workoutsByMonth.map((monthData, monthIdx) => (
              <View key={monthIdx} style={styles.monthSection}>
                <Text style={styles.monthHeader}>{monthData.label}</Text>
                {monthData.workouts.map((workout) => {
                  const Icon = getWorkoutIcon(workout.type);
                  return (
                    <Pressable
                      key={workout.id}
                      onPress={() => setSelectedWorkout(workout)}
                      style={styles.workoutCard}
                    >
                      <View style={styles.iconContainer}>
                        <Icon size={24} color="#1F2937" strokeWidth={2} />
                      </View>
                      <View style={styles.workoutInfo}>
                        <Text style={styles.workoutName}>{workout.name}</Text>
                        <Text style={styles.workoutDate}>{workout.date}</Text>
                      </View>
                      <Pressable
                        onPress={() => deleteWorkout(workout.id)}
                        style={styles.deleteButton}
                      >
                        <Trash2 size={20} color="#EF4444" strokeWidth={2} />
                      </Pressable>
                    </Pressable>
                  );
                })}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Workout Detail Modal */}
      {selectedWorkout && (
        <View style={styles.modal}>
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setSelectedWorkout(null)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconContainer}>
                {React.createElement(getWorkoutIcon(selectedWorkout.type), {
                  size: 28,
                  color: '#1F2937',
                  strokeWidth: 2
                })}
              </View>
              <View style={styles.modalHeaderText}>
                <Text style={styles.modalTitle}>{selectedWorkout.name}</Text>
                <Text style={styles.modalSubtitle}>{selectedWorkout.date} • {selectedWorkout.type}</Text>
              </View>
              <View style={styles.modalActions}>
                <Pressable
                  onPress={() => {
                    setSelectedWorkout(null);
                    router.push({
                      pathname: '/workout-builder',
                      params: { workoutId: selectedWorkout.id,
                                returnTo: 'activities' }
                    });
                  }}
                  style={styles.editButton}
                >
                  <Edit2 size={20} color="#3B82F6" strokeWidth={2} />
                </Pressable>
                <Pressable
                  onPress={() => setSelectedWorkout(null)}
                  style={styles.closeButton}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </Pressable>
              </View>
            </View>

            <ScrollView style={styles.modalScroll}>
              {selectedWorkout.exercises?.map((exercise, idx) => (
                <View key={idx} style={styles.exerciseCard}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  {exercise.sets?.map((set, setIdx) => (
                    <View key={setIdx} style={styles.setRow}>
                      <Text style={styles.setLabel}>Set {setIdx + 1}</Text>
                      <Text style={styles.setValue}>
                        {set.distance > 0 && set.time > 0
                          ? `${set.distance} mi • ${set.time} min`
                          : `${set.weight} lbs × ${set.reps} reps`}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Floating Add Button */}
      <Pressable
        style={styles.fab}
        onPress={() => router.push('/workout-builder')}
      >
        <Plus size={28} color="#fff" strokeWidth={2.5} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1F2937',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
  monthSection: {
    marginBottom: 24,
  },
  monthHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  workoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  workoutInfo: {
    flex: 1,
  },
  workoutName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  workoutDate: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 2,
  },
  deleteButton: {
    padding: 8,
  },
  modal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#374151',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#4B5563',
  },
  modalIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalHeaderText: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 2,
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#9CA3AF',
  },
  modalScroll: {
    padding: 20,
  },
  exerciseCard: {
    backgroundColor: '#4B5563',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  setRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  setLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#D1D5DB',
  },
  setValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editButton: {
    padding: 8,
  },
});
