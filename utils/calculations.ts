import { Assignment, Absence, AppSettings, Consultant } from '../types';

export const formatPeriod = (date: Date, isWeekly: boolean, weekNum?: number) => {
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const monthLabel = monthNames[date.getMonth()];
    const year = date.getFullYear();
    const monthId = `${year}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;

    if (isWeekly) {
        let w = weekNum;
        if (w === undefined) {
            const firstDayOfMonth = new Date(year, date.getMonth(), 1);
            const dayOffset = firstDayOfMonth.getDay() || 7;
            w = Math.ceil((date.getDate() + dayOffset - 1) / 7);
        }
        return {
            id: `${monthId}-W${w}`,
            label: `${monthLabel} - Sem. ${w}`,
            monthId
        };
    } else {
        return {
            id: monthId,
            label: `${monthLabel} ${year}`,
            monthId
        };
    }
};

export const getPeriodOccupancy = (
    consultantId: string,
    assignments: Assignment[],
    absences: Absence[],
    periodId: string,
    isWeekly: boolean,
    includeTentative: boolean
) => {
    const filterFn = (a: { period: string }) => {
        if (!isWeekly) {
            // Aggregation: If we are in Monthly view, sum up the month record + all its weeks
            return a.period === periodId || a.period.startsWith(`${periodId}-W`);
        } else {
            // Weekly: match exactly
            return a.period === periodId;
        }
    };

    const periodAssignments = assignments.filter(
        a => a.consultantId === consultantId &&
            filterFn(a) &&
            (includeTentative || a.status === 'Confirmada')
    );

    const periodAbsences = absences.filter(
        a => a.consultantId === consultantId &&
            filterFn(a)
    );

    const confirmedHours = periodAssignments
        .filter(a => a.status === 'Confirmada')
        .reduce((sum, a) => sum + a.hours, 0);

    const tentativeHours = periodAssignments
        .filter(a => a.status === 'Tentativa')
        .reduce((sum, a) => sum + a.hours, 0);

    const absenceHours = periodAbsences.reduce((sum, a) => sum + a.hours, 0);

    const totalHours = confirmedHours + (includeTentative ? tentativeHours : 0) + absenceHours;

    return {
        confirmedHours,
        tentativeHours,
        absenceHours,
        totalHours,
    };
};

export const getFTE = (hours: number, capacity: number) => {
    return hours / capacity;
};

export const getOccupancyStatus = (totalHours: number, settings: AppSettings, isWeekly: boolean) => {
    const capacity = isWeekly ? settings.standardWeeklyCapacity : settings.standardMonthlyCapacity;
    const availabilityThreshold = isWeekly ? settings.availableWeeklyThreshold : settings.availableMonthlyThreshold;

    if (totalHours > capacity) return 'Sobrecarga';
    if (totalHours < availabilityThreshold) return 'Disponible';
    return 'OK';
};

export const getStatusBadgeClass = (status: string) => {
    switch (status) {
        case 'Sobrecarga': return 'badge-danger';
        case 'Disponible': return 'badge-warning';
        case 'OK': return 'badge-success';
        default: return 'badge-info';
    }
};

export const getStatusRowClass = (status: string) => {
    switch (status) {
        case 'Sobrecarga': return 'bg-risk';
        case 'Disponible': return 'bg-available';
        default: return '';
    }
};
