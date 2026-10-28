export interface ThemeColors {
  background: string;
  surface: string;
  primary: string;
  primaryLight: string;
  secondary: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  success: string;
  warning: string;
  error: string;
  tabBar: string;
  tabBarBorder: string;
  card: string;
  cardBorder: string;
}

export const lightColors: ThemeColors = {
  background: '#F8F9FE',
  surface: '#FFFFFF',
  primary: '#6C63FF',
  primaryLight: '#EEF0FF',
  secondary: '#FF6B6B',
  text: '#1A1A2E',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  tabBar: '#FFFFFF',
  tabBarBorder: '#E5E7EB',
  card: '#FFFFFF',
  cardBorder: '#F0F2F5',
};

export const darkColors: ThemeColors = {
  background: '#0D0D1A',
  surface: '#1A1A2E',
  primary: '#7B72FF',
  primaryLight: '#1E1B4B',
  secondary: '#FF6B6B',
  text: '#F9FAFB',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  border: '#374151',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  tabBar: '#1A1A2E',
  tabBarBorder: '#374151',
  card: '#1A1A2E',
  cardBorder: '#27273F',
};

export const SUBJECT_COLORS = [
  '#6C63FF',
  '#FF6B6B',
  '#10B981',
  '#F59E0B',
  '#3B82F6',
  '#EC4899',
  '#8B5CF6',
  '#14B8A6',
] as const;

export const EVENT_TYPE_COLORS: Record<string, string> = {
  exam: '#EF4444', // Vermelho
  assignment: '#F59E0B', // Laranja
  activity: '#10B981', // Verde
  reminder: '#3B82F6', // Azul
};

export const EVENT_TYPE_LABELS: Record<string, string> = {
  exam: 'Prova',
  assignment: 'Entrega',
  activity: 'Atividade',
  reminder: 'Lembrete',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const borderRadius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  full: 9999,
};

export const typography = {
  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    title: 28,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};

export const getShadow = (isDark: boolean) => ({
  shadowColor: isDark ? '#000000' : '#1A1A2E',
  shadowOffset: { width: 0, height: isDark ? 4 : 2 },
  shadowOpacity: isDark ? 0.35 : 0.06,
  shadowRadius: isDark ? 8 : 6,
  elevation: isDark ? 4 : 3,
});
