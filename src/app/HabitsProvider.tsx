import { createContext, useContext, useEffect, useReducer, type ReactNode } from 'react';
import { ApiError } from '@/api/error';
import { habitApi } from '@/api/habits';
import type { DateKey, DeletedHabit, Habit, HabitId, HabitPatch, NewHabit } from '@/api/types';
import { todayKey } from '@/lib/date';

interface HabitsState {
  status: 'loading' | 'ready' | 'error';
  error?: string;
  habits: Habit[];
  logs: Record<HabitId, DateKey[]>;
  /** ids with a mutation in flight — drives per-row pending states */
  pending: HabitId[];
}

type Action =
  | { type: 'error'; message: string }
  | { type: 'ready'; habits: Habit[]; logs: Record<HabitId, DateKey[]> }
  | { type: 'upsert'; habit: Habit }
  | { type: 'setLogs'; habitId: HabitId; dates: DateKey[] }
  | { type: 'remove'; habitId: HabitId }
  | { type: 'pending'; habitId: HabitId; value: boolean };

const initial: HabitsState = { status: 'loading', habits: [], logs: {}, pending: [] };

function reducer(state: HabitsState, action: Action): HabitsState {
  switch (action.type) {
    case 'ready':
      return { status: 'ready', error: undefined, habits: action.habits, logs: action.logs, pending: [] };
    case 'error':
      return { ...state, status: 'error', error: action.message };
    case 'upsert': {
      const habits = state.habits.some((h) => h.id === action.habit.id)
        ? state.habits.map((h) => (h.id === action.habit.id ? action.habit : h))
        : [...state.habits, action.habit];
      return { ...state, habits };
    }
    case 'setLogs':
      return { ...state, logs: { ...state.logs, [action.habitId]: action.dates } };
    case 'remove': {
      const logs = { ...state.logs };
      delete logs[action.habitId];
      return { ...state, habits: state.habits.filter((h) => h.id !== action.habitId), logs };
    }
    case 'pending': {
      const pending = action.value
        ? [...state.pending, action.habitId]
        : state.pending.filter((id) => id !== action.habitId);
      return { ...state, pending };
    }
  }
}

interface HabitsContextValue {
  status: HabitsState['status'];
  error?: string;
  habits: Habit[];
  logs: Record<HabitId, DateKey[]>;
  pending: HabitId[];
  refresh(): Promise<void>;
  create(input: NewHabit): Promise<Habit>;
  update(id: HabitId, patch: HabitPatch): Promise<Habit>;
  remove(id: HabitId): Promise<DeletedHabit>;
  toggle(id: HabitId): Promise<void>;
  restore(snapshot: DeletedHabit): Promise<void>;
  logsFor(id: HabitId): DateKey[];
}

const HabitsContext = createContext<HabitsContextValue | null>(null);

export function useHabits(): HabitsContextValue {
  const ctx = useContext(HabitsContext);
  if (!ctx) throw new Error('useHabits must be used inside <HabitsProvider>');
  return ctx;
}

export function HabitsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const [habits, logs] = await Promise.all([habitApi.listHabits(), habitApi.listAllLogs()]);
        if (live) dispatch({ type: 'ready', habits, logs });
      } catch (e) {
        if (live) {
          dispatch({
            type: 'error',
            message: e instanceof ApiError ? e.message : 'Something failed while loading.',
          });
        }
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  const value: HabitsContextValue = {
    ...state,
    refresh: async () => {
      try {
        const [habits, logs] = await Promise.all([habitApi.listHabits(), habitApi.listAllLogs()]);
        dispatch({ type: 'ready', habits, logs });
      } catch (e) {
        dispatch({
          type: 'error',
          message: e instanceof ApiError ? e.message : 'Something failed while loading.',
        });
      }
    },

    create: async (input) => {
      const habit = await habitApi.createHabit(input);
      dispatch({ type: 'upsert', habit });
      return habit;
    },

    update: async (id, patch) => {
      const habit = await habitApi.updateHabit(id, patch);
      dispatch({ type: 'upsert', habit });
      return habit;
    },

    remove: async (id) => {
      dispatch({ type: 'pending', habitId: id, value: true });
      try {
        const deleted = await habitApi.deleteHabit(id);
        dispatch({ type: 'remove', habitId: id });
        return deleted;
      } finally {
        dispatch({ type: 'pending', habitId: id, value: false });
      }
    },

    // Optimistic with rollback — v2 of the mutation ladder. A failed check-in
    // snaps back and hands the error to the caller for the toast.
    toggle: async (id) => {
      const today = todayKey();
      const dates = [...(state.logs[id] ?? [])];
      const has = dates.includes(today);
      const next = has ? dates.filter((d) => d !== today) : [...dates, today];

      dispatch({ type: 'pending', habitId: id, value: true });
      dispatch({ type: 'setLogs', habitId: id, dates: [...next].sort() });
      try {
        if (has) await habitApi.clearLog(id, today);
        else await habitApi.setLog(id, today);
      } catch (e) {
        dispatch({ type: 'setLogs', habitId: id, dates });
        throw e instanceof ApiError ? e : new ApiError('unknown', 'Could not save the check-in.');
      } finally {
        dispatch({ type: 'pending', habitId: id, value: false });
      }
    },

    // Undo path for delete: re-create, then replay the log entries.
    restore: async (snapshot) => {
      const habit = await habitApi.createHabit({
        name: snapshot.habit.name,
        notes: snapshot.habit.notes,
        accent: snapshot.habit.accent,
        targetPerWeek: snapshot.habit.targetPerWeek,
      });
      dispatch({ type: 'upsert', habit });
      for (const date of snapshot.logs) {
        await habitApi.setLog(habit.id, date);
      }
      const logs = await habitApi.listLogs(habit.id);
      dispatch({ type: 'setLogs', habitId: habit.id, dates: logs });
    },

    logsFor: (id) => state.logs[id] ?? [],
  };

  return <HabitsContext.Provider value={value}>{children}</HabitsContext.Provider>;
}
