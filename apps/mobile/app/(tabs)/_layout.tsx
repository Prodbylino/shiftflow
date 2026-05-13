import React from 'react';
import Feather from '@expo/vector-icons/Feather';
import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';

import { useTheme } from '@/components/useTheme';

type FeatherName = React.ComponentProps<typeof Feather>['name'];

function TabIcon({ name, color }: { name: FeatherName; color: string }) {
  return <Feather name={name} size={22} color={color} />;
}

export default function TabLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.text,
        tabBarInactiveTintColor: theme.textSubtle,
        tabBarStyle: {
          backgroundColor: theme.tabBar,
          borderTopColor: theme.tabBarBorder,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 84,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          letterSpacing: 0.2,
        },
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <TabIcon name="calendar" color={color} />,
        }}
      />
      <Tabs.Screen
        name="organizations"
        options={{
          title: 'Workplaces',
          tabBarIcon: ({ color }) => <TabIcon name="briefcase" color={color} />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color }) => <TabIcon name="bar-chart-2" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <TabIcon name="settings" color={color} />,
        }}
      />
    </Tabs>
  );
}
