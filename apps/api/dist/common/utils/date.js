export function today() {
    return new Date().toISOString().slice(0, 10);
}
export function isoDate(value) {
    return value ? value.toISOString().slice(0, 10) : undefined;
}
export function toDate(value) {
    return value ? new Date(value) : new Date();
}
export function deltaDays(start, end) {
    return Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000);
}
//# sourceMappingURL=date.js.map