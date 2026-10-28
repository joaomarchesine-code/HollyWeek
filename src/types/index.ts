export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat';

export type EventType = 'exam' | 'assignment' | 'activity' | 'reminder';

export type GradingFormula = 'average' | 'weighted_average' | 'sum';

export interface SubjectAttendance {
  totalClasses: number; // total de aulas previstas no semestre (ex: 60 ou 72)
  absences: number; // faltas registradas
}

export interface GradeComponent {
  id: string;
  name: string; // ex: 'Prova 1', 'Prova 2', 'Trabalho'
  weight: number; // peso no cálculo
}

export interface Grade {
  componentId: string;
  value: number | null;
  date?: string;
}

export interface GradingMethod {
  id: string;
  description: string;
  components: GradeComponent[];
  passingScore: number; // média mínima para aprovação (padrão: 5.0)
  formula: GradingFormula;
}

export interface Subject {
  id: string;
  name: string;
  color: string;
  teacher: string;
  gradingMethod: GradingMethod;
  grades: Grade[];
  attendance: SubjectAttendance;
}

export interface ScheduleSlot {
  id: string;
  day: DayOfWeek;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  subjectId: string | null;
  room?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  type: EventType;
  subjectId?: string;
  description?: string;
  completed: boolean;
}

export interface UserProfile {
  name: string;
  course: string;
  semester: string;
  avatarColor: string;
}

export interface AppUser {
  id: string; // ex: 'agenda-joao'
  name: string; // Ex: 'João'
  username: string; // lowercase, ex: 'joao'
  password?: string; // senha opcional/definida
  createdAt: string;
}

export interface GradeCalculationResult {
  currentAverage: number;
  totalComponents: number;
  completedComponents: number;
  isPassing: boolean;
  isImpossible: boolean;
  isCompleted: boolean;
  statusText: string;
  neededGrades: {
    componentId: string;
    componentName: string;
    neededGrade: number;
  }[];
}
