import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Subject, ScheduleSlot, CalendarEvent, UserProfile, AppUser } from '../types';
import {
  defaultSubjects,
  defaultSchedule,
  defaultEvents,
  defaultProfile,
} from '../storage/storage';

const COLLECTION = 'myweek';

// Helper de referência por usuário (cada usuário tem sua própria partição)
const userRef = (userId: string, docType: string) =>
  doc(db, COLLECTION, `user_${userId}_${docType}`);

// ─── USUÁRIOS E CADASTRO ─────────────────────────────────────────────────────

export const fsLoadUsers = async (): Promise<AppUser[]> => {
  try {
    const snap = await getDoc(doc(db, COLLECTION, 'app_users'));
    if (snap.exists()) {
      const items = snap.data().items as AppUser[];
      if (items && Array.isArray(items)) return items;
    }
    return [];
  } catch (error) {
    console.error('Firestore - erro ao carregar usuários:', error);
    return [];
  }
};

export const fsSaveUsers = async (users: AppUser[]): Promise<void> => {
  try {
    await setDoc(doc(db, COLLECTION, 'app_users'), { items: users });
  } catch (error) {
    console.error('Firestore - erro ao salvar usuários:', error);
    throw error;
  }
};

// ─── SUBJECTS POR USUÁRIO ────────────────────────────────────────────────────

export const fsLoadSubjects = async (userId: string): Promise<Subject[]> => {
  try {
    const snap = await getDoc(userRef(userId, 'subjects'));
    if (snap.exists()) return snap.data().items as Subject[];
    // Nova agenda: começa vazia
    await setDoc(userRef(userId, 'subjects'), { items: [] });
    return [];
  } catch (error) {
    console.error('Firestore - erro ao carregar matérias:', error);
    return [];
  }
};

export const fsSaveSubjects = async (userId: string, subjects: Subject[]): Promise<void> => {
  try {
    await setDoc(userRef(userId, 'subjects'), { items: subjects });
  } catch (error) {
    console.error('Firestore - erro ao salvar matérias:', error);
    throw error;
  }
};

// ─── SCHEDULE POR USUÁRIO ────────────────────────────────────────────────────

export const fsLoadSchedule = async (userId: string): Promise<ScheduleSlot[]> => {
  try {
    const snap = await getDoc(userRef(userId, 'schedule'));
    if (snap.exists()) return snap.data().items as ScheduleSlot[];
    await setDoc(userRef(userId, 'schedule'), { items: [] });
    return [];
  } catch (error) {
    console.error('Firestore - erro ao carregar cronograma:', error);
    return [];
  }
};

export const fsSaveSchedule = async (userId: string, schedule: ScheduleSlot[]): Promise<void> => {
  try {
    await setDoc(userRef(userId, 'schedule'), { items: schedule });
  } catch (error) {
    console.error('Firestore - erro ao salvar cronograma:', error);
    throw error;
  }
};

// ─── EVENTS POR USUÁRIO ──────────────────────────────────────────────────────

export const fsLoadEvents = async (userId: string): Promise<CalendarEvent[]> => {
  try {
    const snap = await getDoc(userRef(userId, 'events'));
    if (snap.exists()) return snap.data().items as CalendarEvent[];
    await setDoc(userRef(userId, 'events'), { items: [] });
    return [];
  } catch (error) {
    console.error('Firestore - erro ao carregar eventos:', error);
    return [];
  }
};

export const fsSaveEvents = async (userId: string, events: CalendarEvent[]): Promise<void> => {
  try {
    await setDoc(userRef(userId, 'events'), { items: events });
  } catch (error) {
    console.error('Firestore - erro ao salvar eventos:', error);
    throw error;
  }
};

// ─── PROFILE POR USUÁRIO ─────────────────────────────────────────────────────

export const fsLoadProfile = async (userId: string, defaultName?: string): Promise<UserProfile> => {
  try {
    const snap = await getDoc(userRef(userId, 'profile'));
    if (snap.exists()) return snap.data() as UserProfile;
    const initialProfile: UserProfile = {
      ...defaultProfile,
      name: defaultName || '',
    };
    await setDoc(userRef(userId, 'profile'), initialProfile);
    return initialProfile;
  } catch (error) {
    console.error('Firestore - erro ao carregar perfil:', error);
    return defaultProfile;
  }
};

export const fsSaveProfile = async (userId: string, profile: UserProfile): Promise<void> => {
  try {
    await setDoc(userRef(userId, 'profile'), profile);
  } catch (error) {
    console.error('Firestore - erro ao salvar perfil:', error);
    throw error;
  }
};

// ─── DELETAR AGENDA COMPLETA DE UM USUÁRIO ────────────────────────────────────

export const fsDeleteUserData = async (userId: string): Promise<void> => {
  try {
    await Promise.all([
      deleteDoc(userRef(userId, 'subjects')),
      deleteDoc(userRef(userId, 'schedule')),
      deleteDoc(userRef(userId, 'events')),
      deleteDoc(userRef(userId, 'profile')),
    ]);
  } catch (error) {
    console.error('Firestore - erro ao deletar dados do usuário:', error);
    throw error;
  }
};
