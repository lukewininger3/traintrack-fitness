import { useNavigation } from '@react-navigation/native';
import { router } from 'expo-router';
import { User } from 'lucide-react-native';
import { useEffect } from 'react';
import { Pressable } from 'react-native';
import DashboardScreen from '../../src/screens/DashboardScreen';

export default function DashboardTab() {
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => router.push('/profile' as any)}
          style={{
            marginRight: 16,
            padding: 8,
            borderRadius: 20,
            backgroundColor: '#374151',
          }}
        >
          <User size={20} color="#fff" strokeWidth={2} />
        </Pressable>
      ),
    });
  }, [navigation]);

  return <DashboardScreen navigation={navigation} />;
}
