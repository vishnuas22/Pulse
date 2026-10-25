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

/* ---------------------------------------------------------------------- */
/* The body keeps the score — P10                                          */
/*                                                                        */
/* Ember: a ritual's heat is RECENCY, not a binary today/not — a check-in  */
/* glows and physically cools over days (Lally: one miss ≠ automaticity    */
/* death; ambient state beats a red X). Callus: every completed 7-day run  */
/* thickens one ring — a prospectively-earned miss can be healed (the      */
/* Duolingo lesson: insurance bought in advance, consumed idempotently).   */
/* Posture: the figure's spine bows with how the WEEK is trending.         */
/* ---------------------------------------------------------------------- */

const round3 = (v: number): number => Math.round(v * 1000) / 1000;

export interface EmberState {
  /** Latest check-in on or before today. */
  last: DateKey | null;
  /** Days from that check-in to today (null — never checked in). */
  daysSince: number | null;
  /** 1 = burning now … exponential to 0 by four days. Charcoal, never red. */
  level: number;
}

/** The thermal state of the most recent ritual: 1 → .54 → .29 → .16 → 0. */
export function emberState(logs: DateKey[], today: DateKey = todayKey()): EmberState {
  const set = new Set(logs);
  const past = [...set].sort().filter((d) => daysBetween(d, today) >= 0);
  const last = past.at(-1) ?? null;
  if (!last) return { last: null, daysSince: null, level: 0 };
  const daysSince = daysBetween(last, today);
  const level =
    daysSince === 0
      ? 1
      : daysSince >= 4
        ? 0
        : round3(Math.exp(-0.62 * daysSince));
  return { last, daysSince, level };
}

export interface CallusState {
  /** 7-day runs completed all-time — each earned one miss-shield. */
  earned: number;
  /** Misses actually healed by a shield. */
  consumed: number;
  /** Available shields right now. */
  pool: number;
  /** The current merged run, shields included. Alive while > 0. */
  streak: number;
}

/**
 * A callus heals ONE missed day: the chain survives, both the callus and the
 * day are real (consumed idempotently, in chronological order). Two dead days
 * in a row with no shield end the run — the Lally two-day rule, intact.
 */
export function callusState(logs: DateKey[], today: DateKey = todayKey()): CallusState {
  const set = new Set(logs);
  const checked = [...set].sort();
  const first = checked.at(0);
  if (!first) return { earned: 0, consumed: 0, pool: 0, streak: 0 };

  let earned = 0;
  let consumed = 0;
  let run = 0;

  const lastPast = addDays(today, -1); // the seal-of-record is today's plate, not an anticipation
  for (let cursor = first; cursor <= lastPast; cursor = addDays(cursor, 1)) {
    if (set.has(cursor)) {
      run += 1;
      if (run % 7 === 0) {
        earned += 1;
      }
    } else if (earned - consumed > 0) {
      consumed += 1;
      run += 1; // healed — the chain carries on
    } else {
      run = 0; // a real break
    }
  }

  if (set.has(today)) {
    run += 1;
    if (run % 7 === 0) earned += 1;
  }

  return { earned, consumed, pool: earned - consumed, streak: run };
}

/** Weekly aggregate momentum — the figure slouches as this falls. */
export function postureLevel(done7: number, target7: number): number {
  if (target7 <= 0) return 1;
  return Math.min(1, Math.max(0, done7 / target7));
}
