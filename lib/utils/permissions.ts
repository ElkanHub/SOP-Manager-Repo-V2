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

// ── Department detection ──────────────────────────────────────────────────────
// Stored department names ("QA", "Engineering"); matched leniently so renamed
// or abbreviated variants still resolve.
export function isQaDepartment(department: string | null | undefined): boolean {
    if (!department) return false;
    const d = department.trim().toLowerCase();
    return d === 'qa' || d.includes('quality assurance');
}

export function isEngineeringDepartment(department: string | null | undefined): boolean {
    if (!department) return false;
    const d = department.trim().toLowerCase();
    return d === 'eng' || d.includes('engineering');
}

// ── Capability model ─────────────────────────────────────────────────────────
// Two departments carry extra rights regardless of role:
//   • QA  — elevated READ access (sees supervisory/oversight cards) but no
//           manager-exclusive actions.
//   • Engineering — may perform equipment actions (add/manage).
// Every other department follows the standard employee/manager rules.
export interface Capabilities {
    isAdmin: boolean;
    isManager: boolean;
    isQaDept: boolean;
    isEngDept: boolean;
    /** Admin or QA manager — org-wide data scope (approvals queue, dept matrix). */
    hasOrgOversight: boolean;
    /** Sees supervisory read cards (Compliance Health, CC tracker, Audit Trail). */
    canSeeSupervisory: boolean;
    /** May add/manage equipment. */
    canManageEquipment: boolean;
}

export function getCapabilities(user: Profile | null | undefined): Capabilities {
    const isAdmin = Boolean(user?.is_admin);
    const isManager = user?.role === 'manager';
    const isQaDept = isQaDepartment(user?.department);
    const isEngDept = isEngineeringDepartment(user?.department);
    const isQaManager = isManager && isQaDept;
    return {
        isAdmin,
        isManager,
        isQaDept,
        isEngDept,
        hasOrgOversight: isAdmin || isQaManager,
        canSeeSupervisory: isAdmin || isManager || isQaDept,
        canManageEquipment: isAdmin || isManager || isEngDept,
    };
}
