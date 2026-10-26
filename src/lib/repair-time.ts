/** Appointment times are scheduled in West Africa Time (UTC+1, no daylight saving) and stored in UTC. */
const WAT_OFFSET_MINUTES = 60;

export function watToUtc(date: string, minutes: number): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, minutes - WAT_OFFSET_MINUTES, 0, 0));
}

/** Weekday (0 = Sunday) of a YYYY-MM-DD calendar date. */
export function weekdayOf(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function todayInWat(now = new Date()): string {
  const wat = new Date(now.getTime() + WAT_OFFSET_MINUTES * 60_000);
  return wat.toISOString().slice(0, 10);
}

export function isValidDate(date: string): boolean {
  const [y, m, d] = date.split('-').map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d));
  return probe.getUTCFullYear() === y && probe.getUTCMonth() === m - 1 && probe.getUTCDate() === d;
}

export function clockToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function formatWatDateTime(iso: string | Date): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat('en-NG', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Africa/Lagos' }).format(d);
}
