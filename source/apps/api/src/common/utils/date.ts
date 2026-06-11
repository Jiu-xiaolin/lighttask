export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isoDate(value?: Date | null): string | undefined {
  return value ? value.toISOString().slice(0, 10) : undefined;
}

export function toDate(value?: string | Date | null): Date {
  return value ? new Date(value) : new Date();
}

export function deltaDays(start: string, end: string): number {
  return Math.round(
    (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000
  );
}
