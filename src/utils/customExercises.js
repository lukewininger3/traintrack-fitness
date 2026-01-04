import { supabase } from '../config/supabase';
import { getAllBuiltInExercises } from '../constants/workoutTypes';

// Check if exercise name already exists (built-in or custom)
export const exerciseExists = async (exerciseName) => {
  // Normalize name (trim and lowercase for comparison)
  const normalizedName = exerciseName.trim().toLowerCase();
  
  // Check built-in exercises (case-insensitive)
  const builtInExercises = getAllBuiltInExercises();
  const builtInExists = builtInExercises.some(
    exercise => exercise.toLowerCase() === normalizedName
  );
  
  if (builtInExists) {
    return { exists: true, type: 'built-in' };
  }
  
  // Check custom exercises for this user
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { exists: false };

    const { data, error } = await supabase
      .from('custom_exercises')
      .select('id, name')
      .eq('user_id', user.id)
      .ilike('name', exerciseName.trim()); // Case-insensitive match

    if (error) {
      return { exists: false };
    }

    if (data && data.length > 0) {
      return { exists: true, type: 'custom' };
    }

    return { exists: false };
  } catch (error) {
    return { exists: false };
  }
};

// Load user's custom exercises
export const loadCustomExercises = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('custom_exercises')
      .select('*')
      .eq('user_id', user.id)
      .order('name', { ascending: true });

    if (error) {
      return [];
    }

    return data || [];
  } catch (error) {
    return [];
  }
};

// Save a new custom exercise
export const saveCustomExercise = async (name, category) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Validate name
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error('Exercise name cannot be empty');
    }

    // Check if already exists
    const { exists, type } = await exerciseExists(trimmedName);
    if (exists) {
      throw new Error(`This exercise already exists as a ${type} exercise`);
    }

    const { data, error } = await supabase
      .from('custom_exercises')
      .insert({
        user_id: user.id,
        name: trimmedName,
        category
      })
      .select()
      .single();

    if (error) {
      // Handle unique constraint violation from database
      if (error.code === '23505') {
        throw new Error('This exercise name already exists');
      }
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error.message || 'Failed to save exercise' };
  }
};

// Delete a custom exercise
export const deleteCustomExercise = async (id) => {
  try {
    const { error } = await supabase
      .from('custom_exercises')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return { error: null };
  } catch (error) {
    return { error };
  }
};
