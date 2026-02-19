import { Tabs, router } from 'expo-router';
import { Activity, LayoutDashboard, Target, TrendingUp, Trophy, Users, User } from 'lucide-react-native';
import { View, StyleSheet, Platform, Pressable } from 'react-native';
import { useTheme } from '../../src/contexts/ThemeContext';
import { SPACING, RADIUS } from '../../src/theme/design';

// Profile button component for header
const ProfileButton = () => {
  const { colors, isDark } = useTheme();

  return (
    <Pressable
      onPress={() => router.push('/profile')}
      style={[
        styles.profileButton,
        { backgroundColor: isDark ? colors.surface.card : '#FFFFFF' }
      ]}
    >
      <User size={18} color={colors.text.secondary} strokeWidth={2} />
    </Pressable>
  );
};

export default function TabsLayout() {
  const { colors, isDark } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background.primary,
          borderBottomWidth: 0,
          shadowOpacity: 0,
          elevation: 0,
        },
        headerTintColor: colors.text.primary,
        headerTitleStyle: {
          fontWeight: '800',
          fontSize: 20,
          letterSpacing: -0.5,
        },
        headerShadowVisible: false,
        headerRight: () => <ProfileButton />,
        headerRightContainerStyle: {
          paddingRight: SPACING.md,
        },
        tabBarStyle: {
          backgroundColor: colors.background.primary,
          borderTopWidth: 1,
          borderTopColor: colors.surface.border,
          paddingBottom: Platform.OS === 'ios' ? 36 : 16,
          paddingTop: 12,
          height: Platform.OS === 'ios' ? 96 : 78,
        },
        tabBarActiveTintColor: colors.accent.primary,
        tabBarInactiveTintColor: colors.text.tertiary,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.5,
          marginTop: 4,
        },
        tabBarItemStyle: {
          paddingTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'TRAINTRACK',
          tabBarLabel: 'Dashboard',
          headerTitleStyle: {
            fontWeight: '800',
            fontSize: 18,
            letterSpacing: 2,
          },
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? [styles.activeIconContainer, { backgroundColor: colors.accent.primaryDim }] : undefined}>
              <LayoutDashboard
                size={22}
                color={color}
                strokeWidth={focused ? 2.5 : 2}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="activities"
        options={{
          title: 'ACTIVITIES',
          headerTitleStyle: {
            fontWeight: '800',
            fontSize: 18,
            letterSpacing: 2,
          },
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? [styles.activeIconContainer, { backgroundColor: colors.accent.primaryDim }] : undefined}>
              <Activity
                size={22}
                color={color}
                strokeWidth={focused ? 2.5 : 2}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          title: 'GOALS',
          headerTitleStyle: {
            fontWeight: '800',
            fontSize: 18,
            letterSpacing: 2,
          },
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? [styles.activeIconContainer, { backgroundColor: colors.accent.primaryDim }] : undefined}>
              <Target
                size={22}
                color={color}
                strokeWidth={focused ? 2.5 : 2}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'PROGRESS',
          headerTitleStyle: {
            fontWeight: '800',
            fontSize: 18,
            letterSpacing: 2,
          },
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? [styles.activeIconContainer, { backgroundColor: colors.accent.primaryDim }] : undefined}>
              <TrendingUp
                size={22}
                color={color}
                strokeWidth={focused ? 2.5 : 2}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="social"
        options={{
          title: 'SOCIAL',
          headerTitleStyle: {
            fontWeight: '800',
            fontSize: 18,
            letterSpacing: 2,
          },
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? [styles.activeIconContainer, { backgroundColor: colors.accent.primaryDim }] : undefined}>
              <Users
                size={22}
                color={color}
                strokeWidth={focused ? 2.5 : 2}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="trophy"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: null,
          headerShown: false,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  activeIconContainer: {
    borderRadius: RADIUS.md,
    padding: 6,
    marginBottom: -4,
  },
  profileButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
