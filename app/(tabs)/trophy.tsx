import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Pressable, View, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TrophyScreen from '../../src/screens/TrophyScreen';
import { COLORS, TYPOGRAPHY, SPACING } from '../../src/theme/design';

export default function TrophyTab() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      {/* Custom Header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ArrowLeft size={24} color={COLORS.text.primary} strokeWidth={2} />
        </Pressable>
        <Text style={styles.headerTitle}>TROPHIES</Text>
        <View style={styles.headerSpacer} />
      </View>
      <TrophyScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text.primary,
    letterSpacing: 2,
  },
  headerSpacer: {
    width: 40,
  },
});
