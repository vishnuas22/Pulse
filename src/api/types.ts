/* The data contract. Everything above the api/ seam uses these types and
   ONLY these types — that discipline is what makes the future backend swap
   a one-line change. */

export type HabitId = string;
export type DateKey = string; // 'YYYY-MM-DD' — lexicographically comparable

export const ACCENTS = ['ember', 'moss', 'honey', 'pine', 'graphite'] as const;
export type AccentKey = (typeof ACCENTS)[number];

export const NAME_MAX = 64;
export const NOTES_MAX = 280;

export interface Habit {
  id: HabitId;
  name: string;
  notes?: string;
  accent: AccentKey;
  targetPerWeek: number; // 1–7; v1 renders and stores it, weekly cadence logic lands in v2
  createdAt: string; // ISO 8601
  archivedAt: string | null;
}

export interface NewHabit {
  name: string;
  notes?: string;
  accent: AccentKey;
  targetPerWeek: number;
}

export type HabitPatch = Partial<
  Pick<Habit, 'name' | 'notes' | 'accent' | 'targetPerWeek' | 'archivedAt'>
>;

export interface HabitLog {
  habitId: HabitId;
  date: DateKey;
}

export interface PulseDB {
  version: 1;
  habits: Habit[];
  logs: HabitLog[];
}

/** What deleteHabit returns — the minimum needed for a client-side undo. */
export interface DeletedHabit {
  habit: Habit;
  logs: DateKey[];
}

export interface HabitApi {
  listHabits(): Promise<Habit[]>;
  getHabit(id: HabitId): Promise<Habit>;
  createHabit(input: NewHabit): Promise<Habit>;
  updateHabit(id: HabitId, patch: HabitPatch): Promise<Habit>;
  deleteHabit(id: HabitId): Promise<DeletedHabit>;

  listAllLogs(): Promise<Record<HabitId, DateKey[]>>;
  listLogs(id: HabitId): Promise<DateKey[]>;
  setLog(id: HabitId, date: DateKey): Promise<void>;
  clearLog(id: HabitId, date: DateKey): Promise<void>;
}
