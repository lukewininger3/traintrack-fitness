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
        sets: (ex.sets || []).map(set => ({
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

// Save a template (simplified interface for social sharing)
export const saveTemplate = async (template) => {
  try {
    const templates = await loadTemplates();

    const newTemplate = {
      id: Date.now(),
      name: template.name,
      type: template.type,
      exercises: (template.exercises || []).map(ex => ({
        name: ex.name,
        sets: (ex.sets || []).map(set => ({
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

    return { success: true, template: newTemplate };
  } catch (error) {
    console.error('Error saving template:', error);
    return { success: false, error: error.message };
  }
};

// Background cloud sync for templates
const syncTemplatesToCloud = async (templates) => {
  try {
    const user = await getCurrentUser();
    if (!user) return;

    // Get existing template IDs from cloud
    const { data: cloudTemplates, error: fetchError } = await supabase
      .from('workout_templates')
      .select('template_id')
      .eq('user_id', user.id);

    if (fetchError) {
      console.error('Failed to fetch cloud templates:', fetchError);
      return;
    }

    const cloudIds = new Set((cloudTemplates || []).map(t => String(t.template_id)));
    const localIds = new Set(templates.map(t => String(t.id)));

    // Prepare data for batch operations
    const toInsert = [];
    const toUpsert = [];

    for (const template of templates) {
      const templateData = {
        user_id: user.id,
        template_id: template.id,
        name: template.name,
        type: template.type,
        exercises: template.exercises,
        created_at: template.createdAt,
        updated_at: template.updatedAt
      };

      if (cloudIds.has(String(template.id))) {
        toUpsert.push(templateData);
      } else {
        toInsert.push(templateData);
      }
    }

    // Batch insert new templates
    if (toInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('workout_templates')
        .insert(toInsert);

      if (insertError) {
        console.error('Insert templates failed:', insertError);
      }
    }

    // Update existing templates (parallel updates for speed)
    if (toUpsert.length > 0) {
      await Promise.all(toUpsert.map(template =>
        supabase
          .from('workout_templates')
          .update(template)
          .eq('user_id', template.user_id)
          .eq('template_id', template.template_id)
          .then(({ error }) => {
            if (error) console.error('Update template failed:', template.template_id, error);
          })
      ));
    }

    // Delete templates that are no longer in local list
    const idsToDelete = [...cloudIds].filter(id => !localIds.has(id));
    if (idsToDelete.length > 0) {
      await supabase
        .from('workout_templates')
        .delete()
        .eq('user_id', user.id)
        .in('template_id', idsToDelete);
    }
  } catch (error) {
    console.error('Template cloud sync error:', error);
  }
};

// Save all templates - LOCAL FIRST, then background cloud sync
export const saveTemplates = async (templates) => {
  try {
    // STEP 1: Save locally FIRST (instant)
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(templates));

    // STEP 2: Trigger cloud sync in background (non-blocking)
    syncTemplatesToCloud(templates).catch(err => {
      console.error('Background template sync failed:', err);
    });
  } catch (error) {
    console.error('Error saving templates locally:', error);
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
        // Ensure ID is a number for consistency (template_id may come as string from Supabase)
        const templates = data.map(t => ({
          id: typeof t.template_id === 'string' ? parseInt(t.template_id, 10) : t.template_id,
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
