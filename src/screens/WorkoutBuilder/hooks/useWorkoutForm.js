import { useReducer, useEffect, useCallback, useState, useRef } from 'react';
import { Alert, AppState } from 'react-native';
import { getTodayString, loadWorkouts, saveWorkouts, saveInProgressWorkout, clearInProgressWorkout } from '../../../utils/storage';
import { loadTemplates } from '../../../utils/workoutTemplates';
import { checkAndUpdatePRs } from '../../../utils/personalRecords';
import { loadCustomExercises } from '../../../utils/customExercises';
import { EXERCISE_DATABASE } from '../../../constants/workoutTypes';

// Action types
const ACTIONS = {
  SET_WORKOUT: 'SET_WORKOUT',
  SET_NAME: 'SET_NAME',
  SET_TYPE: 'SET_TYPE',
  SET_DATE: 'SET_DATE',
  SET_TIME: 'SET_TIME',
  SET_NOTES: 'SET_NOTES',
  ADD_EXERCISE: 'ADD_EXERCISE',
  UPDATE_EXERCISE: 'UPDATE_EXERCISE',
  REMOVE_EXERCISE: 'REMOVE_EXERCISE',
  CLEAR_EXERCISES: 'CLEAR_EXERCISES',
};

const initialWorkout = {
  name: '',
  type: 'Strength',
  date: getTodayString(),
  time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
  notes: '',
  exercises: []
};

function workoutReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_WORKOUT:
      return { ...state, ...action.payload };

    case ACTIONS.SET_NAME:
      return { ...state, name: action.payload };

    case ACTIONS.SET_TYPE:
      return { ...state, type: action.payload };

    case ACTIONS.SET_DATE:
      return { ...state, date: action.payload };

    case ACTIONS.SET_TIME:
      return { ...state, time: action.payload };

    case ACTIONS.SET_NOTES:
      return { ...state, notes: action.payload };

    case ACTIONS.ADD_EXERCISE:
      return { ...state, exercises: [...state.exercises, action.payload] };

    case ACTIONS.UPDATE_EXERCISE:
      return {
        ...state,
        exercises: state.exercises.map((ex, i) =>
          i === action.payload.index ? action.payload.exercise : ex
        )
      };

    case ACTIONS.REMOVE_EXERCISE:
      return {
        ...state,
        exercises: state.exercises.filter((_, i) => i !== action.payload)
      };

    case ACTIONS.CLEAR_EXERCISES:
      return { ...state, exercises: [] };

    default:
      return state;
  }
}

export function useWorkoutForm({ editingWorkoutId, templateId, repeatData, workoutDetails }) {
  const isEditing = !!editingWorkoutId;
  const isFromTemplate = !!templateId;
  const isRepeating = !!repeatData;
  const hasWorkoutDetails = !!workoutDetails;

  const [workout, dispatch] = useReducer(workoutReducer, initialWorkout);
  const [isSaving, setIsSaving] = useState(false);

  // Helper functions
  const isCardioWorkoutType = useCallback((type) => {
    return type === 'Running' || type === 'Cycling' || type === 'Swimming';
  }, []);

  // Track custom exercises for cardio detection
  const [customExercises, setCustomExercises] = useState([]);

  useEffect(() => {
    loadCustomExercises().then(setCustomExercises);
  }, []);

  const isCardioExercise = useCallback((exerciseName) => {
    // Check built-in cardio exercises
    if (EXERCISE_DATABASE.Cardio?.includes(exerciseName)) {
      return true;
    }
    // Check custom exercises with Cardio category
    const customExercise = customExercises.find(ex => ex.name === exerciseName);
    return customExercise?.category === 'Cardio';
  }, [customExercises]);

  // Load editing workout
  const loadEditingWorkout = useCallback(async () => {
    const workouts = await loadWorkouts({ skipBackgroundRefresh: true });
    const workoutToEdit = workouts.find(w => w.id === parseInt(editingWorkoutId));
    if (workoutToEdit) {
      dispatch({
        type: ACTIONS.SET_WORKOUT,
        payload: {
          ...workoutToEdit,
          time: workoutToEdit.time || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
          notes: workoutToEdit.notes || ''
        }
      });
    }
  }, [editingWorkoutId]);

  // Load from template
  const loadFromTemplate = useCallback(async () => {
    const templates = await loadTemplates();
    const template = templates.find(t => t.id === parseInt(templateId));
    if (template) {
      const now = new Date();
      const isTemplateCardio = isCardioWorkoutType(template.type);
      dispatch({
        type: ACTIONS.SET_WORKOUT,
        payload: {
          name: template.name,
          type: template.type,
          date: getTodayString(),
          time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
          notes: '',
          exercises: template.exercises.map(ex => ({
            name: ex.name,
            sets: ex.sets.map(set => {
              // Only include relevant fields based on workout type
              if (isTemplateCardio) {
                return {
                  distance: set.distance || 0,
                  time: set.time || 0,
                  pace: set.pace || 0
                };
              } else {
                return {
                  weight: set.weight || 0,
                  reps: set.reps || 0
                };
              }
            }),
            notes: ex.notes || ''
          }))
        }
      });
    }
  }, [templateId, isCardioWorkoutType]);

  // Load from repeat
  const loadFromRepeat = useCallback(() => {
    try {
      const data = JSON.parse(repeatData);
      const now = new Date();
      const isRepeatCardio = isCardioWorkoutType(data.type);
      dispatch({
        type: ACTIONS.SET_WORKOUT,
        payload: {
          name: data.name,
          type: data.type,
          date: getTodayString(),
          time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
          notes: '',
          exercises: data.exercises.map(ex => ({
            name: ex.name,
            sets: ex.sets.map(set => {
              // Only include relevant fields based on workout type
              if (isRepeatCardio) {
                return {
                  distance: set.distance || 0,
                  time: set.time || 0,
                  pace: set.pace || 0
                };
              } else {
                return {
                  weight: set.weight || 0,
                  reps: set.reps || 0
                };
              }
            }),
            notes: ex.notes || ''
          }))
        }
      });
    } catch (e) {
      console.error('Failed to parse repeat data:', e);
    }
  }, [repeatData, isCardioWorkoutType]);

  // Load from workout details (from step 1)
  const loadFromWorkoutDetails = useCallback(async () => {
    try {
      const details = JSON.parse(workoutDetails);
      let exercises = [];
      const isCardio = isCardioWorkoutType(details.type);

      // If returning from a round-trip (builder → details → builder), use existing exercises directly
      if (details.existingExercises && details.existingExercises.length > 0) {
        exercises = details.existingExercises;
      }
      // If editing, load existing exercises
      else if (isEditing) {
        const workouts = await loadWorkouts({ skipBackgroundRefresh: true });
        const existingWorkout = workouts.find(w => w.id === parseInt(editingWorkoutId));
        if (existingWorkout) {
          exercises = existingWorkout.exercises || [];
        }
      }
      // If from template, load template exercises
      else if (isFromTemplate) {
        const templates = await loadTemplates();
        const template = templates.find(t => t.id === parseInt(templateId));
        if (template) {
          exercises = template.exercises.map(ex => ({
            name: ex.name,
            sets: ex.sets.map(set => {
              // Only include relevant fields based on workout type
              if (isCardio) {
                return {
                  distance: set.distance || 0,
                  time: set.time || 0,
                  pace: set.pace || 0
                };
              } else {
                return {
                  weight: set.weight || 0,
                  reps: set.reps || 0
                };
              }
            }),
            notes: ex.notes || ''
          }));
        }
      }
      // If repeating, load repeat exercises
      else if (isRepeating) {
        const repeatInfo = JSON.parse(repeatData);
        exercises = repeatInfo.exercises.map(ex => ({
          name: ex.name,
          sets: ex.sets.map(set => {
            // Only include relevant fields based on workout type
            if (isCardio) {
              return {
                distance: set.distance || 0,
                time: set.time || 0,
                pace: set.pace || 0
              };
            } else {
              return {
                weight: set.weight || 0,
                reps: set.reps || 0
              };
            }
          }),
          notes: ex.notes || ''
        }));
      }
      // If from planned workout (Goals screen), convert planned exercises
      else if (details.plannedExercises && details.plannedExercises.length > 0) {
        exercises = details.plannedExercises.map(ex => {
          if (isCardio) {
            // For cardio, create a set with distance/time/pace fields
            return {
              name: ex.name,
              sets: [{
                distance: ex.distance || 0,
                time: 0,
                pace: 0
              }],
              notes: ''
            };
          } else {
            // For strength exercises, check if planned sets with weights exist
            if (ex.sets && ex.sets.length > 0) {
              // Use planned sets with pre-filled weights, reps = 0 for user to fill in
              return {
                name: ex.name,
                sets: ex.sets.map(s => ({
                  weight: s.weight ? parseFloat(s.weight) : 0,
                  reps: 0
                })),
                notes: ''
              };
            } else {
              // No planned sets - create one empty set
              return {
                name: ex.name,
                sets: [{
                  weight: 0,
                  reps: 0
                }],
                notes: ''
              };
            }
          }
        });
      }

      dispatch({
        type: ACTIONS.SET_WORKOUT,
        payload: {
          name: details.name,
          type: details.type,
          date: details.date,
          time: details.time,
          notes: details.notes || '',
          exercises: exercises,
          plannedWorkoutId: details.plannedWorkoutId || null,
        }
      });
    } catch (e) {
      console.error('Failed to parse workout details:', e);
    }
  }, [workoutDetails, isEditing, editingWorkoutId, isFromTemplate, templateId, isRepeating, repeatData, isCardioWorkoutType]);

  // Initialize workout data
  useEffect(() => {
    if (hasWorkoutDetails) {
      // Coming from step 1 with workout details
      loadFromWorkoutDetails();
    } else if (isEditing) {
      loadEditingWorkout();
    } else if (isFromTemplate) {
      loadFromTemplate();
    } else if (isRepeating) {
      loadFromRepeat();
    } else {
      const now = new Date();
      dispatch({
        type: ACTIONS.SET_WORKOUT,
        payload: {
          ...initialWorkout,
          date: getTodayString(),
          time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        }
      });
    }
  }, [hasWorkoutDetails, isEditing, isFromTemplate, isRepeating, loadFromWorkoutDetails, loadEditingWorkout, loadFromTemplate, loadFromRepeat]);

  // Auto-save workout state to prevent data loss
  const autoSaveTimeoutRef = useRef(null);
  const lastSavedRef = useRef(null);
  const isDiscardedRef = useRef(false);

  // Save when workout changes (debounced)
  useEffect(() => {
    // Don't auto-save if workout was discarded
    if (isDiscardedRef.current) return;

    // Only auto-save if workout has meaningful data (name or exercises)
    const hasMeaningfulData = workout.name.trim() || workout.exercises.length > 0;
    if (!hasMeaningfulData) return;

    // Clear any pending save
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Debounce the save
    autoSaveTimeoutRef.current = setTimeout(() => {
      if (isDiscardedRef.current) return;
      const workoutJson = JSON.stringify(workout);
      // Only save if data has actually changed
      if (workoutJson !== lastSavedRef.current) {
        saveInProgressWorkout({
          workout,
          editingWorkoutId: editingWorkoutId || null,
          isEditing,
        });
        lastSavedRef.current = workoutJson;
      }
    }, 1000); // Save 1 second after last change

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [workout, editingWorkoutId, isEditing]);

  // Save immediately when app goes to background
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (isDiscardedRef.current) return;
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        const hasMeaningfulData = workout.name.trim() || workout.exercises.length > 0;
        if (hasMeaningfulData) {
          saveInProgressWorkout({
            workout,
            editingWorkoutId: editingWorkoutId || null,
            isEditing,
          });
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [workout, editingWorkoutId, isEditing]);

  // Action dispatchers
  const setWorkout = useCallback((workoutData) => {
    dispatch({ type: ACTIONS.SET_WORKOUT, payload: workoutData });
  }, []);

  const setName = useCallback((name) => {
    dispatch({ type: ACTIONS.SET_NAME, payload: name });
  }, []);

  const setType = useCallback((type) => {
    dispatch({ type: ACTIONS.SET_TYPE, payload: type });
  }, []);

  const setDate = useCallback((date) => {
    dispatch({ type: ACTIONS.SET_DATE, payload: date });
  }, []);

  const setTime = useCallback((time) => {
    dispatch({ type: ACTIONS.SET_TIME, payload: time });
  }, []);

  const setNotes = useCallback((notes) => {
    dispatch({ type: ACTIONS.SET_NOTES, payload: notes });
  }, []);

  const addExercise = useCallback((exercise) => {
    dispatch({ type: ACTIONS.ADD_EXERCISE, payload: exercise });
  }, []);

  const updateExercise = useCallback((index, exercise) => {
    dispatch({ type: ACTIONS.UPDATE_EXERCISE, payload: { index, exercise } });
  }, []);

  const removeExercise = useCallback((index) => {
    dispatch({ type: ACTIONS.REMOVE_EXERCISE, payload: index });
  }, []);

  const clearExercises = useCallback(() => {
    dispatch({ type: ACTIONS.CLEAR_EXERCISES });
  }, []);

  // Handle type change with exercise clearing logic
  const handleTypeChange = useCallback((newType, onComplete) => {
    const oldIsCardio = isCardioWorkoutType(workout.type);
    const newIsCardio = isCardioWorkoutType(newType);

    if (workout.exercises.length > 0 && oldIsCardio !== newIsCardio) {
      Alert.alert(
        'Warning: Data Will Be Lost',
        `Changing from ${oldIsCardio ? 'cardio' : 'strength'} to ${newIsCardio ? 'cardio' : 'strength'} will delete all ${oldIsCardio ? 'sessions' : 'exercises'} you've added. Continue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Continue',
            style: 'destructive',
            onPress: () => {
              setType(newType);
              clearExercises();
              onComplete?.();
            }
          }
        ]
      );
    } else {
      setType(newType);
      onComplete?.();
    }
  }, [workout.type, workout.exercises.length, isCardioWorkoutType, setType, clearExercises]);

  // Save workout
  const saveWorkoutData = useCallback(async () => {
    // Prevent multiple saves
    if (isSaving) {
      return { success: false, alreadySaving: true };
    }

    if (!workout.name.trim()) {
      Alert.alert('Missing Name', 'Please enter a workout name');
      return { success: false };
    }

    const isCardio = isCardioWorkoutType(workout.type);
    if (workout.exercises.length === 0) {
      const label = isCardio ? 'sessions' : 'exercises';
      Alert.alert('No ' + label.charAt(0).toUpperCase() + label.slice(1), `Please add at least one ${label.slice(0, -1)}`);
      return { success: false };
    }

    setIsSaving(true);

    try {
      // Skip background refresh to prevent race condition where cloud data
      // overwrites our newly saved local data
      const workouts = await loadWorkouts({ skipBackgroundRefresh: true });
      const workoutToSave = { ...workout };
      let savedWorkout;

      if (isEditing) {
        const workoutId = parseInt(editingWorkoutId);
        savedWorkout = { ...workoutToSave, id: workoutId };
        const updated = workouts.map(w =>
          w.id === workoutId ? { ...w, ...workoutToSave } : w
        );
        await saveWorkouts(updated, { updatedWorkoutId: workoutId });
      } else {
        const newId = Date.now();
        savedWorkout = { ...workoutToSave, id: newId };
        await saveWorkouts([...workouts, savedWorkout], { newWorkoutId: newId });
      }

      // Check for new PRs
      const achievedPRs = await checkAndUpdatePRs(savedWorkout);

      // Clear the in-progress workout since we've saved successfully
      await clearInProgressWorkout();

      setIsSaving(false);
      return { success: true, savedWorkout, achievedPRs };
    } catch (error) {
      console.error('Error saving workout:', error);
      Alert.alert('Save Error', 'Failed to save workout. Please try again.');
      setIsSaving(false);
      return { success: false, error };
    }
  }, [workout, isEditing, editingWorkoutId, isCardioWorkoutType, isSaving]);

  // Find previous session for an exercise
  const findPreviousSession = useCallback(async (exerciseName) => {
    const allWorkouts = await loadWorkouts({ skipBackgroundRefresh: true });
    const sorted = allWorkouts.sort((a, b) => new Date(b.date) - new Date(a.date));

    for (const w of sorted) {
      if (isEditing && w.id === parseInt(editingWorkoutId)) continue;
      const exercise = w.exercises?.find(e => e.name === exerciseName);
      if (exercise) {
        return {
          date: w.date,
          sets: exercise.sets,
          notes: exercise.notes || '',
          workoutName: w.name
        };
      }
    }
    return null;
  }, [isEditing, editingWorkoutId]);

  // Discard workout (clear in-progress state)
  const discardWorkout = useCallback(async () => {
    // Prevent any further auto-saves
    isDiscardedRef.current = true;
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    await clearInProgressWorkout();
  }, []);

  return {
    workout,
    isEditing,
    isFromTemplate,
    isRepeating,
    isSaving,
    isCardioWorkoutType,
    isCardioExercise,
    setWorkout,
    setName,
    setType,
    setDate,
    setTime,
    setNotes,
    addExercise,
    updateExercise,
    removeExercise,
    clearExercises,
    handleTypeChange,
    saveWorkoutData,
    findPreviousSession,
    discardWorkout,
  };
}
