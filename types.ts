export type ProjectType = 'Cliente' | 'Interno' | 'Ausencia' | 'Tentativo';
export type AssignmentStatus = 'Confirmada' | 'Tentativa';
export type AbsenceCategory = 'Vacaciones' | 'Festivos' | 'Baja médica' | 'Asuntos personales';

export interface Consultant {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  notes?: string;
  sharePointId?: string;
}

export interface Project {
  id: string;
  name: string;
  type: ProjectType;
  client?: string;
  description?: string;
  active: boolean;
  sharePointId?: string;
}

export interface Assignment {
  id: string;
  consultantId: string;
  projectId: string;
  hours: number;
  status: AssignmentStatus;
  description?: string;
  period: string; // YYYY-MM for monthly, YYYY-Www for weekly
  isWeekly: boolean;
  sharePointId?: string;
}

export interface Absence {
  id: string;
  consultantId: string;
  category: AbsenceCategory;
  hours: number;
  period: string;
  isWeekly: boolean;
  notes?: string;
  sharePointId?: string;
}

export interface AppSettings {
  availableMonthlyThreshold: number;
  availableWeeklyThreshold: number;
  standardMonthlyCapacity: number;
  standardWeeklyCapacity: number;
  defaultView: 'Mensual' | 'Semanal';
  includeTentativeByDefault: boolean;
  geminiApiKey?: string;
  sharePointSiteUrl?: string;
}

export interface AppState {
  consultants: Consultant[];
  projects: Project[];
  assignments: Assignment[];
  absences: Absence[];
  settings: AppSettings;
}

export const THEME = {
  colors: {
    primary: 'text-[#252729]',
    accent: 'text-[#f78c38]',
    accentBg: 'bg-[#f78c38]',
    bgCard: 'bg-[#1e293b]',
    border: 'border-gray-800'
  }
};