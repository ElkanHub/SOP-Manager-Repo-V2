import { format, parseISO } from 'date-fns';

export function formatDate(dateString: string | null | undefined): string {
    if (!dateString) return '';
    return format(parseISO(dateString), 'MMM d, yyyy');
}

export function formatDateTime(dateString: string | null | undefined): string {
    if (!dateString) return '';
    return format(parseISO(dateString), 'MMM d, yyyy h:mm a');
}
