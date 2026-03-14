export function incrementVersion(current: string, major: boolean = false): string {
    const clean = current.replace('v', '');
    const [majStr, minStr] = clean.split('.');
    const maj = parseInt(majStr, 10);
    const min = minStr ? parseInt(minStr, 10) : 0;

    if (major) {
        return `v${maj + 1}.0`;
    }

    return `v${maj}.${min + 1}`;
}
