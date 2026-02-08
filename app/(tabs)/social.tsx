import { useNavigation } from '@react-navigation/native';
import { router } from 'expo-router';
import { User } from 'lucide-react-native';
import { useEffect } from 'react';
import { Pressable } from 'react-native';
import SocialScreen from '../../src/screens/SocialScreen';
import { COLORS, SPACING, RADIUS } from '../../src/theme/design';

export default function SocialTab() {
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => router.push('/profile' as any)}
          style={{
            marginRight: SPACING.lg,
            padding: SPACING.sm,
            borderRadius: RADIUS.full,
            backgroundColor: COLORS.surface.card,
            borderWidth: 1,
            borderColor: COLORS.surface.border,
          }}
        >
          <User size={18} color={COLORS.text.primary} strokeWidth={2} />
        </Pressable>
      ),
    });
  }, [navigation]);

  return <SocialScreen />;
}
