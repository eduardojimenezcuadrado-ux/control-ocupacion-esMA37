import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppState, Consultant, Project, Assignment, Absence, AppSettings } from './types';
import { initialAppState } from './data/mockData';
import { initializeMSAL, trySilentAuth, fetchAllSharePointData, login } from './services/sharepointService';
import { getDefaultSharePointConfig } from './services/sharepointConfig';

interface AppContextType extends AppState {
    setConsultants: React.Dispatch<React.SetStateAction<Consultant[]>>;
    setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
    setAssignments: React.Dispatch<React.SetStateAction<Assignment[]>>;
    setAbsences: React.Dispatch<React.SetStateAction<Absence[]>>;
    setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
    addAssignment: (assignment: Assignment) => void;
    updateAssignment: (assignment: Assignment) => void;
    removeAssignment: (id: string) => void;
    addAbsence: (absence: Absence) => void;
    updateAbsence: (absence: Absence) => void;
    removeAbsence: (id: string) => void;
    resetPeriod: (period: string, isWeekly: boolean) => void;
    copyPeriod: (fromPeriod: string, toPeriod: string, isWeekly: boolean) => void;
    loadSharePointData: (data: { consultants: Consultant[]; projects: Project[]; assignments: Assignment[] }) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, setState] = useState<AppState>(() => {
        const saved = localStorage.getItem('control_ocupacion_state');
        return saved ? JSON.parse(saved) : initialAppState;
    });

    useEffect(() => {
        const initSharePoint = async () => {
            const config = getDefaultSharePointConfig();
            if (!config.clientId || !config.tenantId) {
                console.warn('SharePoint credentials missing in environment variables');
                return;
            }

            try {
                // 1. Initialize MSAL
                await initializeMSAL(config.clientId, config.tenantId);

                // 2. Try silent authentication
                const account = await trySilentAuth();

                if (account) {
                    console.log('✅ SharePoint Authenticated silently:', account.username);
                    // 3. Auto-sync data if authenticated
                    const data = await fetchAllSharePointData(config.siteUrl);
                    loadSharePointData(data);
                    console.log('✅ SharePoint Data auto-synced on load');
                } else {
                    console.log('ℹ️ SharePoint: No active session found. Redirecting to login...');
                    await login();
                }
            } catch (error) {
                console.error('❌ SharePoint Auto-sync error:', error);
            }
        };

        initSharePoint();
    }, []);

    useEffect(() => {
        localStorage.setItem('control_ocupacion_state', JSON.stringify(state));
    }, [state]);

    const setConsultants = useCallback((updater: any) => {
        setState(prev => ({ ...prev, consultants: typeof updater === 'function' ? updater(prev.consultants) : updater }));
    }, []);

    const setProjects = useCallback((updater: any) => {
        setState(prev => ({ ...prev, projects: typeof updater === 'function' ? updater(prev.projects) : updater }));
    }, []);

    const setAssignments = useCallback((updater: any) => {
        setState(prev => ({ ...prev, assignments: typeof updater === 'function' ? updater(prev.assignments) : updater }));
    }, []);

    const setAbsences = useCallback((updater: any) => {
        setState(prev => ({ ...prev, absences: typeof updater === 'function' ? updater(prev.absences) : updater }));
    }, []);

    const setSettings = useCallback((updater: any) => {
        setState(prev => ({ ...prev, settings: typeof updater === 'function' ? updater(prev.settings) : updater }));
    }, []);

    const addAssignment = (assignment: Assignment) => {
        setState(prev => ({ ...prev, assignments: [...prev.assignments, assignment] }));
    };

    const updateAssignment = (assignment: Assignment) => {
        setState(prev => ({
            ...prev,
            assignments: prev.assignments.map(a => a.id === assignment.id ? assignment : a)
        }));
    };

    const removeAssignment = (id: string) => {
        setState(prev => ({
            ...prev,
            assignments: prev.assignments.filter(a => a.id !== id)
        }));
    };

    const addAbsence = (absence: Absence) => {
        setState(prev => ({ ...prev, absences: [...prev.absences, absence] }));
    };

    const updateAbsence = (absence: Absence) => {
        setState(prev => ({
            ...prev,
            absences: prev.absences.map(a => a.id === absence.id ? absence : a)
        }));
    };

    const removeAbsence = (id: string) => {
        setState(prev => ({
            ...prev,
            absences: prev.absences.filter(a => a.id !== id)
        }));
    };

    const resetPeriod = (period: string, isWeekly: boolean) => {
        setState(prev => ({
            ...prev,
            assignments: prev.assignments.filter(a => a.period !== period || a.isWeekly !== isWeekly),
            absences: prev.absences.filter(a => a.period !== period || a.isWeekly !== isWeekly)
        }));
    };

    const copyPeriod = (fromPeriod: string, toPeriod: string, isWeekly: boolean) => {
        setState(prev => {
            const sourceAssignments = prev.assignments.filter(a => a.period === fromPeriod && a.isWeekly === isWeekly);
            const sourceAbsences = prev.absences.filter(a => a.period === fromPeriod && a.isWeekly === isWeekly);

            const newAssignments = sourceAssignments.map(a => ({
                ...a,
                id: crypto.randomUUID(),
                period: toPeriod
            }));

            const newAbsences = sourceAbsences.map(a => ({
                ...a,
                id: crypto.randomUUID(),
                period: toPeriod
            }));

            return {
                ...prev,
                assignments: [...prev.assignments, ...newAssignments],
                absences: [...prev.absences, ...newAbsences]
            };
        });
    };

    const loadSharePointData = useCallback((data: { consultants: Consultant[]; projects: Project[]; assignments: Assignment[] }) => {
        setState(prev => ({
            ...prev,
            consultants: data.consultants,
            projects: data.projects,
            assignments: data.assignments,
        }));
    }, []);

    const value: AppContextType = {
        ...state,
        setConsultants,
        setProjects,
        setAssignments,
        setAbsences,
        setSettings,
        addAssignment,
        updateAssignment,
        removeAssignment,
        addAbsence,
        updateAbsence,
        removeAbsence,
        resetPeriod,
        copyPeriod,
        loadSharePointData,
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppStore = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error('useAppStore must be used within AppProvider');
    return context;
};
