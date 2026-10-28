import React from 'react';
import { StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { ScheduleScreen } from '../screens/ScheduleScreen';
import { CalendarScreen } from '../screens/CalendarScreen';
import { SubjectsScreen } from '../screens/SubjectsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { typography } from '../theme';

export type RootTabParamList = {
  Semana: undefined;
  Calendário: undefined;
  Matérias: undefined;
  Perfil: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

export const AppNavigator: React.FC = () => {
  const { colors, isDark } = useTheme();

  return (
    <Tab.Navigator
      initialRouteName="Semana"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 8,
          elevation: 8,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: isDark ? 0.3 : 0.05,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: typography.sizes.xs,
          fontWeight: typography.weights.semibold,
          marginTop: 2,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Semana':
              iconName = focused ? 'calendar' : 'calendar-outline';
              break;
            case 'Calendário':
              iconName = focused ? 'today' : 'today-outline';
              break;
            case 'Matérias':
              iconName = focused ? 'book' : 'book-outline';
              break;
            case 'Perfil':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'help-circle-outline';
          }

          return <Ionicons name={iconName} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Semana"
        component={ScheduleScreen}
        options={{
          tabBarLabel: 'Semana',
        }}
      />
      <Tab.Screen
        name="Calendário"
        component={CalendarScreen}
        options={{
          tabBarLabel: 'Calendário',
        }}
      />
      <Tab.Screen
        name="Matérias"
        component={SubjectsScreen}
        options={{
          tabBarLabel: 'Matérias',
        }}
      />
      <Tab.Screen
        name="Perfil"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Perfil',
        }}
      />
    </Tab.Navigator>
  );
};
