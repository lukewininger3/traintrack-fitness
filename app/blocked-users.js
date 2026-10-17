import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, User } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../src/contexts/ThemeContext';
import { getBlockedUsers, unblockUser } from '../src/utils/moderation';
import { TYPOGRAPHY, SPACING, RADIUS } from '../src/theme/design';

export default function BlockedUsersScreen() {
  const { colors } = useTheme();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    setUsers(await getBlockedUsers());
    setIsLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleUnblock = (blocked) => {
    const name = blocked.display_name || blocked.username;
    Alert.alert(`Unblock ${name}?`, 'They will be able to find you and send friend requests again.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unblock',
        onPress: async () => {
          const result = await unblockUser(blocked.id);
          if (result.success) {
            setUsers(prev => prev.filter(u => u.id !== blocked.id));
          } else {
            Alert.alert('Error', 'Could not unblock this user. Please try again.');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Blocked Users</Text>
        <View style={styles.headerRight} />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent.primary} />
        </View>
      ) : users.length === 0 ? (
        <View style={styles.centered}>
          <Text style={[styles.empty, { color: colors.text.tertiary }]}>You haven&apos;t blocked anyone.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={[styles.card, { backgroundColor: colors.surface.card, borderColor: colors.surface.border }]}>
            {users.map((blocked, index) => (
              <View key={blocked.id}>
                {index > 0 && <View style={[styles.separator, { backgroundColor: colors.surface.divider }]} />}
                <View style={styles.row}>
                  <View style={[styles.avatar, { backgroundColor: colors.accent.primaryDim }]}>
                    {blocked.avatar_url ? (
                      <Image source={{ uri: blocked.avatar_url }} style={styles.avatarImage} />
                    ) : (
                      <User size={18} color={colors.accent.primary} />
                    )}
                  </View>
                  <View style={styles.rowContent}>
                    <Text style={[styles.name, { color: colors.text.primary }]}>{blocked.display_name || blocked.username}</Text>
                    <Text style={[styles.username, { color: colors.text.tertiary }]}>@{blocked.username}</Text>
                  </View>
                  <Pressable
                    onPress={() => handleUnblock(blocked)}
                    style={[styles.unblockButton, { borderColor: colors.surface.border }]}
                  >
                    <Text style={[styles.unblockText, { color: colors.text.primary }]}>Unblock</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
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
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.screenPadding,
    paddingVertical: SPACING.md,
  },
  backButton: {
    padding: SPACING.sm,
    marginLeft: -SPACING.sm,
  },
  headerTitle: {
    ...TYPOGRAPHY.h3,
  },
  headerRight: {
    width: 40,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    ...TYPOGRAPHY.body,
  },
  scrollContent: {
    paddingHorizontal: SPACING.screenPadding,
    paddingBottom: SPACING.xxxl,
  },
  card: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  separator: {
    height: 1,
    marginLeft: SPACING.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginRight: SPACING.md,
  },
  avatarImage: {
    width: 40,
    height: 40,
  },
  rowContent: {
    flex: 1,
  },
  name: {
    ...TYPOGRAPHY.bodyBold,
  },
  username: {
    ...TYPOGRAPHY.caption,
  },
  unblockButton: {
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  unblockText: {
    ...TYPOGRAPHY.caption,
  },
});
