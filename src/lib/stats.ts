/* Pure, fully-tested derived data. No storage, no React. */

import type { DateKey } from '@/api/types';
import { addDays, daysBetween, todayKey } from './date';

/**
 * Consecutive days ending today, or ending yesterday when today is not yet
 * checked in (a streak stays alive until the day actually passes).
 */
export function currentStreak(logs: DateKey[], today: DateKey = todayKey()): number {
  const set = new Set(logs);
  let anchor: DateKey | null = null;
  if (set.has(today)) anchor = today;
  else if (set.has(addDays(today, -1))) anchor = addDays(today, -1);
  else return 0;

  let streak = 1;
  let prev = addDays(anchor, -1);
  while (set.has(prev)) {
    streak += 1;
    prev = addDays(prev, -1);
  }
  return streak;
}

export function longestStreak(logs: DateKey[]): number {
  const sorted = [...logs].sort();
  let best = 0;
  let run = 0;
  let prev: DateKey | null = null;
  for (const key of sorted) {
    run = prev !== null && addDays(prev, 1) === key ? run + 1 : 1;
    prev = key;
    if (run > best) best = run;
  }
  return best;
}

export interface StreakLabel {
  text: string;
  doneToday: boolean;
}

/** Right-side label for a row: an alive streak or an honest gap. */
export function streakLabel(logs: DateKey[], today: DateKey = todayKey()): StreakLabel | null {
  const set = new Set(logs);
  const streak = currentStreak(logs, today);
  if (streak > 0) return { text: `${streak}-day streak`, doneToday: set.has(today) };
  if (logs.length === 0) return null;
  const last = [...logs].sort().at(-1);
  if (!last) return null;
  return { text: `${daysBetween(last, today)}-day gap`, doneToday: false };
}

/** Check-ins within the trailing week ending today, inclusive. */
export function checkedLast7(logs: DateKey[], today: DateKey = todayKey()): number {
  const set = new Set(logs);
  const start = addDays(today, -6);
  let n = 0;
  for (let i = 0; i < 7; i += 1) {
    if (set.has(addDays(start, i))) n += 1;
  }
  return n;
}
