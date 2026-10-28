import AsyncStorage from '@react-native-async-storage/async-storage';
import { Subject, ScheduleSlot, CalendarEvent, UserProfile } from '../types';

const STORAGE_KEYS = {
  SUBJECTS: '@my_week_subjects',
  SCHEDULE: '@my_week_schedule',
  EVENTS: '@my_week_events',
  PROFILE: '@my_week_profile',
};

export const defaultProfile: UserProfile = {
  name: '',
  course: '',
  semester: '',
  avatarColor: '#6C63FF',
};

// Agendas novas começam completamente limpas, sem matérias ou eventos mockados
export const defaultSubjects: Subject[] = [];
export const defaultSchedule: ScheduleSlot[] = [];
export const defaultEvents: CalendarEvent[] = [];

export const saveSubjects = async (subjects: Subject[]): Promise<void> => {
  try {
    const jsonValue = JSON.stringify(subjects);
    await AsyncStorage.setItem(STORAGE_KEYS.SUBJECTS, jsonValue);
  } catch (error) {
    console.error('Erro ao salvar subjects:', error);
    throw error;
  }
};

export const loadSubjects = async (): Promise<Subject[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEYS.SUBJECTS);
    if (jsonValue !== null) {
      return JSON.parse(jsonValue);
    }
    return [];
  } catch (error) {
    console.error('Erro ao carregar subjects:', error);
    return [];
  }
};

export const saveSchedule = async (schedule: ScheduleSlot[]): Promise<void> => {
  try {
    const jsonValue = JSON.stringify(schedule);
    await AsyncStorage.setItem(STORAGE_KEYS.SCHEDULE, jsonValue);
  } catch (error) {
    console.error('Erro ao salvar schedule:', error);
    throw error;
  }
};

export const loadSchedule = async (): Promise<ScheduleSlot[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEYS.SCHEDULE);
    if (jsonValue !== null) {
      return JSON.parse(jsonValue);
    }
    return [];
  } catch (error) {
    console.error('Erro ao carregar schedule:', error);
    return [];
  }
};

export const saveEvents = async (events: CalendarEvent[]): Promise<void> => {
  try {
    const jsonValue = JSON.stringify(events);
    await AsyncStorage.setItem(STORAGE_KEYS.EVENTS, jsonValue);
  } catch (error) {
    console.error('Erro ao salvar events:', error);
    throw error;
  }
};

export const loadEvents = async (): Promise<CalendarEvent[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEYS.EVENTS);
    if (jsonValue !== null) {
      return JSON.parse(jsonValue);
    }
    return [];
  } catch (error) {
    console.error('Erro ao carregar events:', error);
    return [];
  }
};

export const saveProfile = async (profile: UserProfile): Promise<void> => {
  try {
    const jsonValue = JSON.stringify(profile);
    await AsyncStorage.setItem(STORAGE_KEYS.PROFILE, jsonValue);
  } catch (error) {
    console.error('Erro ao salvar profile:', error);
    throw error;
  }
};

export const loadProfile = async (): Promise<UserProfile> => {
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEYS.PROFILE);
    if (jsonValue !== null) {
      return JSON.parse(jsonValue);
    }
    return defaultProfile;
  } catch (error) {
    console.error('Erro ao carregar profile:', error);
    return defaultProfile;
  }
};
