import { Profile } from '@/types/app.types';

export function isOwnDept(user: Profile | null, department: string | null): boolean {
    if (!user || !department) return false;
    return user.department === department;
}

export function isQaManager(user: Profile | null, isQaDepartment: boolean): boolean {
    if (!user) return false;
    return user.role === 'manager' && isQaDepartment;
}

export function canSign(user: Profile | null, isQaDepartment: boolean, targetDepartment: string): boolean {
    if (!user) return false;
    if (user.role !== 'manager') return false;
    return user.department === targetDepartment || isQaDepartment;
}
