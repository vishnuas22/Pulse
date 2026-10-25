/* v0 implementation of HabitApi: localStorage + simulated network.
   Written as if it were a real client — serialization queue, defensive
   copies, validation, and error taxonomy included. In the backend class,
   src/api/habits.http.ts (fetch) replaces this behind the same interface. */

import { ApiError } from './error';
import { consumeFailure, delay, jittered, sim } from './sim';
import {
  NAME_MAX,
  NOTES_MAX,
  type AccentKey,
  type DateKey,
  type DayApi,
  type Habit,
  type HabitApi,
  type HabitId,
  type HabitLog,
  type PulseDB,
} from './types';
import { addDays, todayKey } from '@/lib/date';

const DB_KEY = 'pulse.v1';

function uuid(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return `id-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

/* ------------------------------------------------------------------ */
/* Seed                                                                */
/* ------------------------------------------------------------------ */

interface SeedRule {
  name: string;
  notes?: string;
  accent: AccentKey;
  /** daysAgo=29 → logged 29 days ago, always excluding/present today as tuned. */
  keep: (daysAgo: number) => boolean;
}

const SEED_RULES: SeedRule[] = [
  // Alive streak, not yet done today — the "your ritual awaits" state.
  { name: 'Morning run', notes: 'Around the reservoir, before breakfast.', accent: 'ember', keep: (d) => d !== 0 && d % 7 !== 2 },
  // Broken streak — shows the honest gap label.
  { name: 'Read 20 pages', notes: 'One chapter a day, no screens after 22:00.', accent: 'moss', keep: (d) => d > 6 && d % 7 !== 0 },
  // Long ongoing streak, done today.
  { name: 'Meditate', accent: 'pine', keep: (d) => d < 26 },
  // Intermittent but recent, done today.
  { name: 'Write 300 words', accent: 'honey', keep: (d) => d % 3 !== 1 },
];

function seed(): PulseDB {
  const createdISO = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const today = todayKey();
  const habits: Habit[] = [];
  const logs: HabitLog[] = [];
  SEED_RULES.forEach((rule, index) => {
    const habit: Habit = {
      id: `seed-${index + 1}`,
      name: rule.name,
      notes: rule.notes,
      accent: rule.accent,
      targetPerWeek: 7,
      createdAt: createdISO,
      archivedAt: null,
    };
    habits.push(habit);
    for (let daysAgo = 89; daysAgo >= 0; daysAgo -= 1) {
      if (rule.keep(daysAgo)) logs.push({ habitId: habit.id, date: addDays(today, -daysAgo) });
    }
  });
  return { version: 1, habits, logs };
}

/* ------------------------------------------------------------------ */
/* Storage + safety                                                    */
/* ------------------------------------------------------------------ */

function migrate(raw: unknown): PulseDB {
  const db = raw as Partial<PulseDB> | null;
  if (!db || db.version !== 1 || !Array.isArray(db.habits) || !Array.isArray(db.logs)) {
    throw new ApiError('storage', 'Unrecognized local data — restore or reset from Settings.', 500);
  }
  // closedDays is additive/optional — older exports load unchanged.
  const closedDays = Array.isArray(db.closedDays)
    ? db.closedDays.filter((d): d is DateKey => typeof d === 'string')
    : [];
  return { version: 1, habits: db.habits, logs: db.logs, closedDays };
}

function load(): PulseDB {
  const raw = localStorage.getItem(DB_KEY);
  if (!raw) {
    const fresh = seed();
    persist(fresh);
    return fresh;
  }
  try {
    return migrate(JSON.parse(raw));
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError('storage', 'Could not read local data.', 500);
  }
}

function persist(db: PulseDB): void {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch {
    throw new ApiError('storage', 'Could not save data (storage full or blocked).', 500);
  }
}

/* Single writer queue: overlapping mutations can never lose writes. */
let queue: Promise<unknown> = Promise.resolve();
function serialize<T>(fn: () => T | Promise<T>): Promise<T> {
  const next = queue.then(fn);
  queue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

/* Simulated transport. Every call, read or write, goes through it. */
async function transport<T>(work: () => T): Promise<T> {
  await delay(jittered(sim.latencyMs));
  if (consumeFailure()) throw new ApiError('network', 'Simulated request failure.', 503);
  return work();
}

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

function assertName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0 || trimmed.length > NAME_MAX) {
    throw new ApiError('validation', `Name must be 1–${NAME_MAX} characters.`, 400);
  }
  return trimmed;
}

function assertNotes(notes: string | undefined): string | undefined {
  if (notes === undefined || notes === null) return undefined;
  const trimmed = notes.trim();
  if (trimmed.length === 0) return undefined;
  if (trimmed.length > NOTES_MAX) {
    throw new ApiError('validation', `Notes must be at most ${NOTES_MAX} characters.`, 400);
  }
  return trimmed;
}

/* ------------------------------------------------------------------ */
/* The implementation                                                  */
/* ------------------------------------------------------------------ */

export function createLocalApi(): HabitApi {
  return {
    listHabits: () =>
      transport(() => load().habits.map((h) => ({ ...h }))),

    getHabit: (id) =>
      transport(() => {
        const habit = load().habits.find((h) => h.id === id);
        if (!habit) throw new ApiError('not_found', 'Habit not found.', 404);
        return { ...habit };
      }),

    createHabit: (input) =>
      serialize(() =>
        transport(() => {
          const db = load();
          const name = assertName(input.name);
          const notes = assertNotes(input.notes);
          if (db.habits.some((h) => h.name.toLowerCase() === name.toLowerCase())) {
            throw new ApiError('conflict', `“${name}” already exists.`, 409);
          }
          const habit: Habit = {
            id: uuid(),
            name,
            notes,
            accent: input.accent,
            targetPerWeek: Math.min(7, Math.max(1, Math.round(input.targetPerWeek))),
            createdAt: new Date().toISOString(),
            archivedAt: null,
          };
          db.habits.push(habit);
          persist(db);
          return habit;
        }),
      ),

    updateHabit: (id, patch) =>
      serialize(() =>
        transport(() => {
          const db = load();
          const habit = db.habits.find((h) => h.id === id);
          if (!habit) throw new ApiError('not_found', 'Habit not found.', 404);
          if (patch.name !== undefined) habit.name = assertName(patch.name);
          if (patch.notes !== undefined) habit.notes = assertNotes(patch.notes);
          if (patch.accent !== undefined) habit.accent = patch.accent;
          if (patch.targetPerWeek !== undefined) {
            habit.targetPerWeek = Math.min(7, Math.max(1, Math.round(patch.targetPerWeek)));
          }
          if (patch.archivedAt !== undefined) habit.archivedAt = patch.archivedAt;
          persist(db);
          return { ...habit };
        }),
      ),

    deleteHabit: (id) =>
      serialize(() =>
        transport(() => {
          const db = load();
          const index = db.habits.findIndex((h) => h.id === id);
          if (index === -1) throw new ApiError('not_found', 'Habit not found.', 404);
          const [habit] = db.habits.splice(index, 1);
          const removed = db.logs.filter((l) => l.habitId === id);
          db.logs = db.logs.filter((l) => l.habitId !== id);
          persist(db);
          return { habit: { ...habit! }, logs: removed.map((l) => l.date).sort() };
        }),
      ),

    listAllLogs: () =>
      transport(() => {
        const out: Record<HabitId, DateKey[]> = {};
        for (const log of load().logs) {
          (out[log.habitId] ??= []).push(log.date);
        }
        for (const key of Object.keys(out)) out[key].sort();
        return out;
      }),

    listLogs: (id) =>
      transport(() => {
        const db = load();
        if (!db.habits.some((h) => h.id === id)) {
          throw new ApiError('not_found', 'Habit not found.', 404);
        }
        return db.logs.filter((l) => l.habitId === id).map((l) => l.date).sort();
      }),

    setLog: (id, date) =>
      serialize(() =>
        transport(() => {
          const db = load();
          if (!db.habits.some((h) => h.id === id)) {
            throw new ApiError('not_found', 'Habit not found.', 404);
          }
          if (!db.logs.some((l) => l.habitId === id && l.date === date)) {
            db.logs.push({ habitId: id, date });
            persist(db);
          }
        }),
      ),

    clearLog: (id, date) =>
      serialize(() =>
        transport(() => {
          const db = load();
          if (!db.habits.some((h) => h.id === id)) {
            throw new ApiError('not_found', 'Habit not found.', 404);
          }
          const before = db.logs.length;
          db.logs = db.logs.filter((l) => !(l.habitId === id && l.date === date));
          if (db.logs.length !== before) persist(db);
        }),
      ),
  };
}

/* ------------------------------------------------------------------ */
/* The closing ceremony (DayApi)                                       */
/* ------------------------------------------------------------------ */

/* closedDays normalizes at load, but the type stays optional for older
   on-disk data — all access goes through this one door. */
function closedOf(db: PulseDB): DateKey[] {
  return db.closedDays ?? [];
}

function assertDateKey(date: string): DateKey {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new ApiError('validation', 'Dates are YYYY-MM-DD.', 400);
  }
  return date;
}

export function createLocalDayApi(): DayApi {
  return {
    listClosed: () => transport(() => [...closedOf(load())].sort()),

    setDayClosed: (date, closed) =>
      serialize(() =>
        transport(() => {
          const key = assertDateKey(date);
          const db = load();
          const list = closedOf(db);
          const has = list.includes(key);
          if (closed && !has) {
            persist({ ...db, closedDays: [...list, key] });
          } else if (!closed && has) {
            persist({ ...db, closedDays: list.filter((d) => d !== key) });
          }
        }),
      ),
  };
}

/* Out-of-contract operations for the Settings screen only. */
export const devApi = {
  reset: (): Promise<void> =>
    serialize(() =>
      transport(() => {
        localStorage.removeItem(DB_KEY);
      }),
    ),

  exportAll: (): Promise<PulseDB> => transport(() => structuredClone(load())),

  importAll: (db: PulseDB): Promise<void> =>
    serialize(() =>
      transport(() => {
        persist(migrate(db));
      }),
    ),
};
