import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';

const STORAGE_KEY = '@traintrack_workout_templates';

// Helper to get current user
const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// Save a workout as a template
export const saveAsTemplate = async (workout, templateName) => {
  try {
    const user = await getCurrentUser();
    const templates = await loadTemplates();

    const newTemplate = {
      id: Date.now(),
      name: templateName || workout.name,
      type: workout.type,
      exercises: workout.exercises.map(ex => ({
        name: ex.name,
        sets: ex.sets.map(set => ({
          weight: set.weight || 0,
          reps: set.reps || 0,
          distance: set.distance || 0,
          time: set.time || 0
        })),
        notes: ex.notes || ''
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedTemplates = [...templates, newTemplate];
    await saveTemplates(updatedTemplates);

    return newTemplate;
  } catch (error) {
    console.error('Error saving template:', error);
    throw error;
  }
};

// Save all templates to cloud and local
export const saveTemplates = async (templates) => {
  try {
    const user = await getCurrentUser();

    if (user) {
      // Delete existing templates for this user
      await supabase
        .from('workout_templates')
        .delete()
        .eq('user_id', user.id);

      // Insert all templates
      if (templates.length > 0) {
        const templatesToSave = templates.map(template => ({
          user_id: user.id,
          template_id: template.id,
          name: template.name,
          type: template.type,
          exercises: template.exercises,
          created_at: template.createdAt,
          updated_at: template.updatedAt
        }));

        const { error } = await supabase
          .from('workout_templates')
          .insert(templatesToSave);

        if (error) {
          console.error('Error saving templates to cloud:', error);
        }
      }
    }

    // Always save locally
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch (error) {
    // Fallback to local storage
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    } catch (localError) {
      console.error('Error saving templates locally:', localError);
    }
  }
};

// Load templates from cloud with local fallback
export const loadTemplates = async () => {
  try {
    const user = await getCurrentUser();

    if (user) {
      const { data, error } = await supabase
        .from('workout_templates')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        return await loadFromLocalCache();
      }

      if (data && data.length > 0) {
        const templates = data.map(t => ({
          id: t.template_id,
          name: t.name,
          type: t.type,
          exercises: t.exercises,
          createdAt: t.created_at,
          updatedAt: t.updated_at
        }));

        // Cache locally
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
        return templates;
      }
    }

    return await loadFromLocalCache();
  } catch (error) {
    return await loadFromLocalCache();
  }
};

// Load from local cache
const loadFromLocalCache = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    return [];
  }
};

// Delete a template
export const deleteTemplate = async (templateId) => {
  try {
    const templates = await loadTemplates();
    const updatedTemplates = templates.filter(t => t.id !== templateId);
    await saveTemplates(updatedTemplates);
    return true;
  } catch (error) {
    console.error('Error deleting template:', error);
    throw error;
  }
};

// Update a template
export const updateTemplate = async (templateId, updates) => {
  try {
    const templates = await loadTemplates();
    const updatedTemplates = templates.map(t => {
      if (t.id === templateId) {
        return {
          ...t,
          ...updates,
          updatedAt: new Date().toISOString()
        };
      }
      return t;
    });
    await saveTemplates(updatedTemplates);
    return updatedTemplates.find(t => t.id === templateId);
  } catch (error) {
    console.error('Error updating template:', error);
    throw error;
  }
};

// Duplicate a template
export const duplicateTemplate = async (templateId) => {
  try {
    const templates = await loadTemplates();
    const original = templates.find(t => t.id === templateId);

    if (!original) {
      throw new Error('Template not found');
    }

    const duplicate = {
      ...original,
      id: Date.now(),
      name: `${original.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedTemplates = [...templates, duplicate];
    await saveTemplates(updatedTemplates);

    return duplicate;
  } catch (error) {
    console.error('Error duplicating template:', error);
    throw error;
  }
};

// Create a workout from a template
export const createWorkoutFromTemplate = (template, date, time) => {
  return {
    id: Date.now(),
    name: template.name,
    type: template.type,
    date: date,
    time: time,
    notes: '',
    exercises: template.exercises.map(ex => ({
      name: ex.name,
      sets: ex.sets.map(set => ({
        weight: set.weight || 0,
        reps: set.reps || 0,
        distance: set.distance || 0,
        time: set.time || 0
      })),
      notes: ex.notes || ''
    }))
  };
};

// Clear local templates cache
export const clearLocalTemplates = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing local templates:', error);
  }
};
