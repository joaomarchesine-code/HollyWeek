import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Subject, ScheduleSlot, CalendarEvent, UserProfile, AppUser } from '../types';
import {
  fsLoadUsers,
  fsSaveUsers,
  fsLoadSubjects,
  fsSaveSubjects,
  fsLoadSchedule,
  fsSaveSchedule,
  fsLoadEvents,
  fsSaveEvents,
  fsLoadProfile,
  fsSaveProfile,
  fsDeleteUserData,
} from '../services/firestoreService';
import { defaultProfile } from '../storage/storage';

const ACTIVE_USER_STORAGE_KEY = '@myweek_active_user_id';

interface AppDataContextType {
  // Usuário / Autenticação
  currentUser: AppUser | null;
  usersList: AppUser[];
  isLoading: boolean;
  loginUser: (identifier: string, password?: string) => Promise<{ success: boolean; message?: string }>;
  registerUser: (name: string, password?: string) => Promise<{ success: boolean; message?: string }>;
  switchUser: (userId: string) => Promise<void>;
  logoutUser: () => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  renameUser: (userId: string, newName: string) => Promise<{ success: boolean; message?: string }>;

  // Dados da Agenda do Usuário Logado
  subjects: Subject[];
  schedule: ScheduleSlot[];
  events: CalendarEvent[];
  profile: UserProfile;

  // Ações de Matérias
  addSubject: (subject: Omit<Subject, 'id'>) => Promise<Subject>;
  updateSubject: (subject: Subject) => Promise<void>;
  deleteSubject: (subjectId: string) => Promise<void>;
  setGrade: (subjectId: string, componentId: string, value: number | null) => Promise<void>;
  updateAttendance: (subjectId: string, absences: number, totalClasses?: number) => Promise<void>;
  incrementAbsence: (subjectId: string) => Promise<void>;
  decrementAbsence: (subjectId: string) => Promise<void>;

  // Ações de Cronograma
  addScheduleSlot: (slot: Omit<ScheduleSlot, 'id'>) => Promise<ScheduleSlot>;
  updateScheduleSlot: (slot: ScheduleSlot) => Promise<void>;
  deleteScheduleSlot: (slotId: string) => Promise<void>;

  // Ações de Eventos / Calendário
  addCalendarEvent: (event: Omit<CalendarEvent, 'id'>) => Promise<CalendarEvent>;
  updateCalendarEvent: (event: CalendarEvent) => Promise<void>;
  deleteCalendarEvent: (eventId: string) => Promise<void>;
  toggleCalendarEventCompleted: (eventId: string) => Promise<void>;

  // Perfil
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export const AppDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [usersList, setUsersList] = useState<AppUser[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [schedule, setSchedule] = useState<ScheduleSlot[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Inicializa lista de usuários e restaura sessão salva
  useEffect(() => {
    const initializeAuthAndData = async () => {
      try {
        setIsLoading(true);
        const users = await fsLoadUsers();
        setUsersList(users);

        const savedUserId = await AsyncStorage.getItem(ACTIVE_USER_STORAGE_KEY);
        if (savedUserId) {
          const userFound = users.find((u) => u.id === savedUserId);
          if (userFound) {
            await loadUserData(userFound);
            return;
          }
        }
      } catch (err) {
        console.error('Erro ao inicializar usuários/autenticação:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuthAndData();
  }, []);

  // Carrega os dados da agenda específica de um usuário
  const loadUserData = async (user: AppUser) => {
    try {
      setIsLoading(true);
      setCurrentUser(user);
      await AsyncStorage.setItem(ACTIVE_USER_STORAGE_KEY, user.id);

      const [loadedSubjects, loadedSchedule, loadedEvents, loadedProfile] = await Promise.all([
        fsLoadSubjects(user.id),
        fsLoadSchedule(user.id),
        fsLoadEvents(user.id),
        fsLoadProfile(user.id, user.name),
      ]);

      setSubjects(loadedSubjects);
      setSchedule(loadedSchedule);
      setEvents(loadedEvents);
      setProfile(loadedProfile);
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Login: Aceita o nome completo, primeiro nome ou username, e senha se configurada
  const loginUser = async (
    identifier: string,
    password?: string
  ): Promise<{ success: boolean; message?: string }> => {
    const trimmed = identifier.trim().toLowerCase();
    if (!trimmed) {
      return { success: false, message: 'Digite seu nome para entrar.' };
    }

    const currentUsers = usersList.length > 0 ? usersList : await fsLoadUsers();

    // Procura por username exato, nome completo ou primeiro nome
    const found = currentUsers.find((u) => {
      const uName = u.name.toLowerCase();
      const uUsername = u.username.toLowerCase();
      const firstName = uName.split(' ')[0];
      return uUsername === trimmed || uName === trimmed || firstName === trimmed;
    });

    if (!found) {
      return {
        success: false,
        message: `Membro "${identifier}" não encontrado. Se ainda não possui agenda, cadastre-se abaixo!`,
      };
    }

    // Valida senha caso o usuário tenha cadastrado uma senha
    if (found.password && found.password.trim() !== '') {
      if (!password || password !== found.password) {
        return { success: false, message: 'Senha incorreta para esta agenda.' };
      }
    }

    await loadUserData(found);
    return { success: true };
  };

  // Cadastro de novo membro
  const registerUser = async (
    name: string,
    password?: string
  ): Promise<{ success: boolean; message?: string }> => {
    const cleanName = name.trim();
    if (!cleanName) {
      return { success: false, message: 'Informe o seu nome para criar a agenda.' };
    }

    const cleanUsername = cleanName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');

    const currentUsers = usersList.length > 0 ? usersList : await fsLoadUsers();

    // Verifica se já existe um membro com esse mesmo primeiro nome/username
    const alreadyExists = currentUsers.some(
      (u) =>
        u.username === cleanUsername ||
        u.name.toLowerCase() === cleanName.toLowerCase() ||
        u.name.toLowerCase().split(' ')[0] === cleanName.toLowerCase().split(' ')[0]
    );

    if (alreadyExists) {
      return {
        success: false,
        message: 'Já existe um membro com este nome. Tente incluir sobrenome ou faça login direto.',
      };
    }

    const newUser: AppUser = {
      id: `agenda-${cleanUsername}-${Date.now().toString(36)}`,
      name: cleanName,
      username: cleanUsername,
      password: password ? password.trim() : '',
      createdAt: new Date().toISOString().split('T')[0],
    };

    const updatedUsers = [...currentUsers, newUser];
    setUsersList(updatedUsers);
    await fsSaveUsers(updatedUsers);

    // Entra direto na nova agenda criada
    await loadUserData(newUser);
    return { success: true };
  };

  // Alterna direto para outra agenda
  const switchUser = async (userId: string) => {
    const user = usersList.find((u) => u.id === userId);
    if (user) {
      await loadUserData(user);
    }
  };

  // Logout (retorna para tela inicial de seleção/cadastro)
  const logoutUser = async () => {
    await AsyncStorage.removeItem(ACTIVE_USER_STORAGE_KEY);
    setCurrentUser(null);
    setSubjects([]);
    setSchedule([]);
    setEvents([]);
    setProfile(defaultProfile);
  };

  // Deletar agenda completa de um usuário
  const deleteUser = async (userId: string): Promise<void> => {
    const updatedUsers = usersList.filter((u) => u.id !== userId);
    setUsersList(updatedUsers);
    await fsSaveUsers(updatedUsers);
    await fsDeleteUserData(userId);

    // Se o usuário deletado era o atual, faz logout
    if (currentUser?.id === userId) {
      await logoutUser();
    }
  };

  // Renomear/editar agenda
  const renameUser = async (
    userId: string,
    newName: string
  ): Promise<{ success: boolean; message?: string }> => {
    const cleanName = newName.trim();
    if (!cleanName) return { success: false, message: 'Nome não pode ser vazio.' };

    const duplicate = usersList.some(
      (u) => u.id !== userId && u.name.toLowerCase() === cleanName.toLowerCase()
    );
    if (duplicate) return { success: false, message: 'Já existe uma agenda com este nome.' };

    const updatedUsers = usersList.map((u) =>
      u.id === userId ? { ...u, name: cleanName } : u
    );
    setUsersList(updatedUsers);
    await fsSaveUsers(updatedUsers);

    if (currentUser?.id === userId) {
      setCurrentUser((prev) => (prev ? { ...prev, name: cleanName } : prev));
    }

    return { success: true };
  };

  // --- CRUD MATÉRIAS DO USUÁRIO ---
  const addSubject = async (subjectData: Omit<Subject, 'id'>): Promise<Subject> => {
    if (!currentUser) throw new Error('Nenhum usuário ativo');
    const newSubject: Subject = {
      ...subjectData,
      id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      attendance: subjectData.attendance || { totalClasses: 60, absences: 0 },
    };
    const updated = [...subjects, newSubject];
    setSubjects(updated);
    await fsSaveSubjects(currentUser.id, updated);
    return newSubject;
  };

  const updateSubject = async (updatedSubject: Subject): Promise<void> => {
    if (!currentUser) return;
    const updated = subjects.map((s) => (s.id === updatedSubject.id ? updatedSubject : s));
    setSubjects(updated);
    await fsSaveSubjects(currentUser.id, updated);
  };

  const deleteSubject = async (subjectId: string): Promise<void> => {
    if (!currentUser) return;
    const updatedSubjects = subjects.filter((s) => s.id !== subjectId);
    setSubjects(updatedSubjects);
    await fsSaveSubjects(currentUser.id, updatedSubjects);

    const updatedSchedule = schedule.map((slot) =>
      slot.subjectId === subjectId ? { ...slot, subjectId: null } : slot
    );
    setSchedule(updatedSchedule);
    await fsSaveSchedule(currentUser.id, updatedSchedule);

    const updatedEvents = events.filter((e) => e.subjectId !== subjectId);
    setEvents(updatedEvents);
    await fsSaveEvents(currentUser.id, updatedEvents);
  };

  const setGrade = async (
    subjectId: string,
    componentId: string,
    value: number | null
  ): Promise<void> => {
    if (!currentUser) return;
    const updated = subjects.map((subject) => {
      if (subject.id !== subjectId) return subject;

      const existingIndex = subject.grades.findIndex((g) => g.componentId === componentId);
      const newGrades = [...subject.grades];
      const today = new Date().toISOString().split('T')[0];

      if (existingIndex >= 0) {
        if (value === null) {
          newGrades.splice(existingIndex, 1);
        } else {
          newGrades[existingIndex] = { componentId, value, date: today };
        }
      } else if (value !== null) {
        newGrades.push({ componentId, value, date: today });
      }

      return { ...subject, grades: newGrades };
    });

    setSubjects(updated);
    await fsSaveSubjects(currentUser.id, updated);
  };

  const updateAttendance = async (
    subjectId: string,
    absences: number,
    totalClasses?: number
  ): Promise<void> => {
    if (!currentUser) return;
    const updated = subjects.map((s) => {
      if (s.id !== subjectId) return s;
      const current = s.attendance || { totalClasses: 60, absences: 0 };
      const safeAbsences = Math.max(0, absences);
      const safeTotal = totalClasses && totalClasses > 0 ? totalClasses : current.totalClasses;

      return {
        ...s,
        attendance: { totalClasses: safeTotal, absences: safeAbsences },
      };
    });
    setSubjects(updated);
    await fsSaveSubjects(currentUser.id, updated);
  };

  const incrementAbsence = async (subjectId: string): Promise<void> => {
    const sub = subjects.find((s) => s.id === subjectId);
    if (!sub) return;
    const currentAbsences = sub.attendance?.absences ?? 0;
    await updateAttendance(subjectId, currentAbsences + 1);
  };

  const decrementAbsence = async (subjectId: string): Promise<void> => {
    const sub = subjects.find((s) => s.id === subjectId);
    if (!sub) return;
    const currentAbsences = sub.attendance?.absences ?? 0;
    if (currentAbsences > 0) {
      await updateAttendance(subjectId, currentAbsences - 1);
    }
  };

  // --- CRUD CRONOGRAMA ---
  const addScheduleSlot = async (slotData: Omit<ScheduleSlot, 'id'>): Promise<ScheduleSlot> => {
    if (!currentUser) throw new Error('Nenhum usuário ativo');
    const newSlot: ScheduleSlot = {
      ...slotData,
      id: `slot-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };
    const updated = [...schedule, newSlot];
    setSchedule(updated);
    await fsSaveSchedule(currentUser.id, updated);
    return newSlot;
  };

  const updateScheduleSlot = async (slot: ScheduleSlot): Promise<void> => {
    if (!currentUser) return;
    const updated = schedule.map((s) => (s.id === slot.id ? slot : s));
    setSchedule(updated);
    await fsSaveSchedule(currentUser.id, updated);
  };

  const deleteScheduleSlot = async (slotId: string): Promise<void> => {
    if (!currentUser) return;
    const updated = schedule.filter((s) => s.id !== slotId);
    setSchedule(updated);
    await fsSaveSchedule(currentUser.id, updated);
  };

  // --- CRUD EVENTOS ---
  const addCalendarEvent = async (eventData: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent> => {
    if (!currentUser) throw new Error('Nenhum usuário ativo');
    const newEvent: CalendarEvent = {
      ...eventData,
      id: `ev-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };
    const updated = [...events, newEvent];
    setEvents(updated);
    await fsSaveEvents(currentUser.id, updated);
    return newEvent;
  };

  const updateCalendarEvent = async (event: CalendarEvent): Promise<void> => {
    if (!currentUser) return;
    const updated = events.map((e) => (e.id === event.id ? event : e));
    setEvents(updated);
    await fsSaveEvents(currentUser.id, updated);
  };

  const deleteCalendarEvent = async (eventId: string): Promise<void> => {
    if (!currentUser) return;
    const updated = events.filter((e) => e.id !== eventId);
    setEvents(updated);
    await fsSaveEvents(currentUser.id, updated);
  };

  const toggleCalendarEventCompleted = async (eventId: string): Promise<void> => {
    if (!currentUser) return;
    const updated = events.map((e) =>
      e.id === eventId ? { ...e, completed: !e.completed } : e
    );
    setEvents(updated);
    await fsSaveEvents(currentUser.id, updated);
  };

  // --- PROFILE ---
  const updateProfile = async (profileData: Partial<UserProfile>): Promise<void> => {
    if (!currentUser) return;
    const updated: UserProfile = { ...profile, ...profileData };
    setProfile(updated);
    await fsSaveProfile(currentUser.id, updated);
  };

  return (
    <AppDataContext.Provider
      value={{
        currentUser,
        usersList,
        isLoading,
        loginUser,
        registerUser,
        switchUser,
        logoutUser,
        deleteUser,
        renameUser,
        subjects,
        schedule,
        events,
        profile,
        addSubject,
        updateSubject,
        deleteSubject,
        setGrade,
        updateAttendance,
        incrementAbsence,
        decrementAbsence,
        addScheduleSlot,
        updateScheduleSlot,
        deleteScheduleSlot,
        addCalendarEvent,
        updateCalendarEvent,
        deleteCalendarEvent,
        toggleCalendarEventCompleted,
        updateProfile,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
};

export const useAppData = (): AppDataContextType => {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData deve ser usado dentro de um AppDataProvider');
  }
  return context;
};
