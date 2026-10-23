/* Date math on 'YYYY-MM-DD' keys — no Date objects in app state.
   Arithmetic happens in UTC space (keys round-trip exactly), while
   "today" is resolved in the user's local timezone. */

import type { DateKey } from '@/api/types';

const MS_DAY = 86_400_000;

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function toKey(y: number, m: number, d: number): DateKey {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

export function todayKey(): DateKey {
  const d = new Date();
  return toKey(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

function parseUTC(key: DateKey): number {
  const y = Number(key.slice(0, 4));
  const m = Number(key.slice(5, 7));
  const d = Number(key.slice(8, 10));
  return Date.UTC(y, m - 1, d);
}

/** Noon-shifted UTC date so any local-to-UTC formatting is stable. */
function dateAt(key: DateKey): Date {
  return new Date(parseUTC(key) + 12 * 3_600_000);
}

export function addDays(key: DateKey, n: number): DateKey {
  const t = new Date(parseUTC(key) + n * MS_DAY);
  return toKey(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

/** Whole days from a to b (positive when b is after a). */
export function daysBetween(a: DateKey, b: DateKey): number {
  return Math.round((parseUTC(b) - parseUTC(a)) / MS_DAY);
}

/** n date keys ending at `end`, ascending. */
export function lastNDays(end: DateKey, n: number): DateKey[] {
  const out: DateKey[] = [];
  for (let i = n - 1; i >= 0; i -= 1) out.push(addDays(end, -i));
  return out;
}

/** 0 = Monday … 6 = Sunday. */
export function weekdayOfMonday(key: DateKey): number {
  return (dateAt(key).getUTCDay() + 6) % 7;
}

export function formatHuman(key: DateKey): string {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(dateAt(key));
}

export function formatShort(key: DateKey): string {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(dateAt(key));
}

export function formatMonth(key: DateKey): string {
  return new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(dateAt(key));
}

/** ISO-8601 week number, used for the "Week 43" line on Today. */
export function isoWeek(key: DateKey): number {
  const probe = dateAt(key);
  const dow = (probe.getUTCDay() + 6) % 7;
  probe.setUTCDate(probe.getUTCDate() - dow + 3); // Thursday of this ISO week

  const firstThursday = new Date(Date.UTC(probe.getUTCFullYear(), 0, 4));
  const fdow = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - fdow + 3);

  return 1 + Math.round((probe.getTime() - firstThursday.getTime()) / (7 * MS_DAY));
}
