import CalendarScreen from '../src/screens/CalendarScreen';
import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { initializeSampleData } from '../src/utils/initSampleData';

export default function CalendarTab() {
  const [showInit, setShowInit] = useState(true);

  const handleInit = async () => {
    await initializeSampleData();
    setShowInit(false);
  };

  if (showInit) {
    return (
      <View style={styles.initContainer}>
        <Text style={styles.initTitle}>Welcome to TrainTracks!</Text>
        <Text style={styles.initText}>Load sample workouts to see the app in action</Text>
        <Pressable style={styles.button} onPress={handleInit}>
          <Text style={styles.buttonText}>Load Sample Data</Text>
        </Pressable>
        <Pressable style={styles.skipButton} onPress={() => setShowInit(false)}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>
    );
  }

  return <CalendarScreen />;
}

const styles = StyleSheet.create({
  initContainer: {
    flex: 1,
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  initTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  initText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 32,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#111827',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    padding: 12,
  },
  skipText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
});
