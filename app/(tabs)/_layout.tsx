import { Tabs } from 'expo-router';
import { Activity, BarChart3, Calendar, TrendingUp, Trophy } from 'lucide-react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: '#111827',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        tabBarStyle: {
          backgroundColor: '#111827',
          borderTopColor: '#374151',
          paddingBottom: 34,
          paddingTop: 8,
          height: 88,
        },
        tabBarActiveTintColor: '#fff',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'TrainTracks',
          tabBarLabel: 'Calendar',
          tabBarIcon: ({ color, focused }) => (
            <Calendar size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="activities"
        options={{
          title: 'Activities',
          tabBarIcon: ({ color, focused }) => (
            <Activity size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color, focused }) => (
            <BarChart3 size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color, focused }) => (
            <TrendingUp size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="trophy"
        options={{
          title: 'Trophy Case',
          tabBarIcon: ({ color, focused }) => (
            <Trophy size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      {/* Profile is hidden from tabs - accessible via header button */}
      <Tabs.Screen
        name="profile"
        options={{
          href: null, // This hides it from tabs
          headerShown: false,
        }}
      />
    </Tabs>
  );
}
