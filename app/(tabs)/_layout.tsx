import { Tabs } from 'expo-router';
import { Activity, BarChart3, Calendar, TrendingUp, Trophy } from 'lucide-react-native';
import { View, StyleSheet, Platform } from 'react-native';
import { COLORS, SPACING, RADIUS } from '../../src/theme/design';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.background.primary,
          borderBottomWidth: 0,
          shadowOpacity: 0,
          elevation: 0,
        },
        headerTintColor: COLORS.text.primary,
        headerTitleStyle: {
          fontWeight: '800',
          fontSize: 20,
          letterSpacing: -0.5,
        },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: COLORS.background.primary,
          borderTopWidth: 1,
          borderTopColor: COLORS.surface.border,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
          paddingTop: 12,
          height: Platform.OS === 'ios' ? 88 : 70,
        },
        tabBarActiveTintColor: COLORS.accent.primary,
        tabBarInactiveTintColor: COLORS.text.tertiary,
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
          tabBarLabel: 'Home',
          headerTitleStyle: {
            fontWeight: '800',
            fontSize: 18,
            letterSpacing: 2,
          },
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconContainer : undefined}>
              <Calendar
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
            <View style={focused ? styles.activeIconContainer : undefined}>
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
        name="analytics"
        options={{
          title: 'ANALYTICS',
          headerTitleStyle: {
            fontWeight: '800',
            fontSize: 18,
            letterSpacing: 2,
          },
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconContainer : undefined}>
              <BarChart3
                size={22}
                color={color}
                strokeWidth={focused ? 2.5 : 2}
              />
            </View>
          ),
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
            <View style={focused ? styles.activeIconContainer : undefined}>
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
        name="trophy"
        options={{
          title: 'TROPHIES',
          headerTitleStyle: {
            fontWeight: '800',
            fontSize: 18,
            letterSpacing: 2,
          },
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconContainer : undefined}>
              <Trophy
                size={22}
                color={color}
                strokeWidth={focused ? 2.5 : 2}
              />
            </View>
          ),
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
    backgroundColor: COLORS.accent.primaryDim,
    borderRadius: RADIUS.md,
    padding: 6,
    marginBottom: -4,
  },
});
