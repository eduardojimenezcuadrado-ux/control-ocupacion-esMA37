import { AppState, Consultant, Project, Assignment, Absence, AppSettings } from './types';

export const initialSettings: AppSettings = {
    availableMonthlyThreshold: 120,
    availableWeeklyThreshold: 30,
    standardMonthlyCapacity: 160,
    standardWeeklyCapacity: 40,
    defaultView: 'Mensual',
    includeTentativeByDefault: true,
    geminiApiKey: '',
    sharePointSiteUrl: 'https://raonamadrid.sharepoint.com',
};

export const consultants: Consultant[] = [
    { id: 'c1', name: 'Alejandro García', email: 'a.garcia@consulting.es', role: 'Senior Architect', active: true },
    { id: 'c2', name: 'María Rodríguez', email: 'm.rodriguez@consulting.es', role: 'Project Manager', active: true },
    { id: 'c3', name: 'Javier López', email: 'j.lopez@consulting.es', role: 'Cloud Engineer', active: true },
    { id: 'c4', name: 'Lucía Fernández', email: 'l.fernandez@consulting.es', role: 'UX Designer', active: true },
    { id: 'c5', name: 'David Martínez', email: 'd.martinez@consulting.es', role: 'Full Stack Developer', active: true },
    { id: 'c6', name: 'Elena Sánchez', email: 'e.sanchez@consulting.es', role: 'Data Scientist', active: true },
    { id: 'c7', name: 'Pablo Gómez', email: 'p.gomez@consulting.es', role: 'DevOps Specialist', active: true },
    { id: 'c8', name: 'Carmen Ruiz', email: 'c.ruiz@consulting.es', role: 'Business Analyst', active: true },
    { id: 'c9', name: 'Sergio Torres', email: 's.torres@consulting.es', role: 'Frontend Lead', active: true },
    { id: 'c10', name: 'Isabel Díaz', email: 'i.diaz@consulting.es', role: 'QA Automation', active: true },
    { id: 'c11', name: 'Rafael Moreno', email: 'r.moreno@consulting.es', role: 'Junior Consultant', active: true, notes: 'En formación' },
    { id: 'c12', name: 'Ana Belén Ramos', email: 'ab.ramos@consulting.es', role: 'Technical Lead', active: true },
];

export const projects: Project[] = [
    { id: 'p1', name: 'Transformación Digital Bancaria', type: 'Cliente', client: 'Banco Estelar', active: true, description: 'Migración a microservicios' },
    { id: 'p2', name: 'E-commerce Expansion', type: 'Cliente', client: 'Moda Global', active: true, description: 'Lanzamiento en LATAM' },
    { id: 'p3', name: 'AI Forecast Tool', type: 'Interno', active: true, description: 'Herramienta interna de predicción' },
    { id: 'p4', name: 'Support & Maintenance', type: 'Cliente', client: 'Energy Corp', active: true },
    { id: 'p5', name: 'Preventa Sector Seguros', type: 'Interno', active: true },
    { id: 'p6', name: 'Ciberseguridad Audit', type: 'Cliente', client: 'Logística SA', active: true },
];

// Sample Assignments for Jan 2026
export const assignments: Assignment[] = [
    // Overbooking example: Alejandro
    { id: 'a1', consultantId: 'c1', projectId: 'p1', hours: 140, status: 'Confirmada', period: '2026-01', isWeekly: false, description: 'Arquitectura base' },
    { id: 'a2', consultantId: 'c1', projectId: 'p3', hours: 40, status: 'Tentativa', period: '2026-01', isWeekly: false, description: 'Revisión técnica' },

    // Disponible example: Rafael
    { id: 'a3', consultantId: 'c11', projectId: 'p5', hours: 80, status: 'Confirmada', period: '2026-01', isWeekly: false },

    // Normal load
    { id: 'a4', consultantId: 'c2', projectId: 'p1', hours: 120, status: 'Confirmada', period: '2026-01', isWeekly: false },
    { id: 'a5', consultantId: 'c2', projectId: 'p2', hours: 40, status: 'Confirmada', period: '2026-01', isWeekly: false },

    { id: 'a6', consultantId: 'c3', projectId: 'p1', hours: 160, status: 'Confirmada', period: '2026-01', isWeekly: false },
    { id: 'a7', consultantId: 'c4', projectId: 'p2', hours: 100, status: 'Confirmada', period: '2026-01', isWeekly: false },
    { id: 'a8', consultantId: 'c5', projectId: 'p2', hours: 160, status: 'Confirmada', period: '2026-01', isWeekly: false },
    { id: 'a9', consultantId: 'c6', projectId: 'p6', hours: 140, status: 'Confirmada', period: '2026-01', isWeekly: false },
];

export const absences: Absence[] = [
    { id: 'ab1', consultantId: 'c4', category: 'Vacaciones', hours: 40, period: '2026-01', isWeekly: false, notes: 'Semana de Reyes' },
    { id: 'ab2', consultantId: 'c8', category: 'Baja médica', hours: 160, period: '2026-01', isWeekly: false },
];

export const initialAppState: AppState = {
    consultants,
    projects,
    assignments,
    absences,
    settings: initialSettings,
};
