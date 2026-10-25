import { describe, expect, it } from 'vitest';
import { addDays } from './date';
import {
  callusState,
  checkedLast7,
  currentStreak,
  emberState,
  longestStreak,
  postureLevel,
  streakLabel,
} from './stats';

const TODAY = '2026-06-15';
const back = (n: number) => addDays(TODAY, -n);
const run = (n: number) => Array.from({ length: n }, (_, i) => back(i));
/** n consecutive days ending *yesterday* (today left unchecked). */
const runPast = (n: number) => Array.from({ length: n }, (_, i) => back(i + 1));

describe('currentStreak', () => {
  it('is zero for empty logs', () => {
    expect(currentStreak([], TODAY)).toBe(0);
  });

  it('counts consecutive days ending today', () => {
    expect(currentStreak(run(5), TODAY)).toBe(5);
  });

  it('stays alive when today is unchecked but yesterday is logged', () => {
    expect(currentStreak(runPast(3), TODAY)).toBe(3); // [-3, -2, -1]
  });

  it('counts a single-day streak', () => {
    expect(currentStreak([TODAY], TODAY)).toBe(1);
  });

  it('breaks when the tail has a gap', () => {
    const logs = [back(10), back(9), back(8), back(2)];
    expect(currentStreak(logs, TODAY)).toBe(0);
  });
});

describe('longestStreak', () => {
  it('is zero for empty logs', () => {
    expect(longestStreak([])).toBe(0);
  });

  it('finds the best run across multiple segments', () => {
    const logs = [
      ...['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04', '2026-01-05'],
      ...['2026-02-01', '2026-02-02', '2026-02-03'],
      '2026-03-10',
    ];
    expect(longestStreak(logs)).toBe(5);
  });

  it('ignores duplicates', () => {
    expect(longestStreak([TODAY, TODAY])).toBe(1);
  });
});

describe('streakLabel', () => {
  it('shows the streak when today is checked', () => {
    expect(streakLabel(run(7), TODAY)).toEqual({ text: '7-day streak', doneToday: true });
  });

  it('shows an alive streak when today is pending', () => {
    expect(streakLabel(runPast(4), TODAY)).toEqual({ text: '4-day streak', doneToday: false });
  });

  it('shows an honest gap after a broken streak', () => {
    const label = streakLabel([back(40), back(20), back(10)], TODAY);
    expect(label).toEqual({ text: '10-day gap', doneToday: false });
  });

  it('returns null with no history', () => {
    expect(streakLabel([], TODAY)).toBeNull();
  });
});

describe('checkedLast7', () => {
  it('counts the trailing week inclusive', () => {
    const logs = [TODAY, back(1), back(6), back(7), back(8)];
    expect(checkedLast7(logs, TODAY)).toBe(3);
  });

  it('is zero for empty logs', () => {
    expect(checkedLast7([], TODAY)).toBe(0);
  });
});

describe('emberState', () => {
  it('is unlit with no history', () => {
    expect(emberState([], TODAY)).toEqual({ last: null, daysSince: null, level: 0 });
  });

  it('burns at full heat when checked in today', () => {
    expect(emberState([TODAY], TODAY)).toEqual({ last: TODAY, daysSince: 0, level: 1 });
  });

  it('cools the day after and dies by the fourth', () => {
    expect(emberState([back(1)], TODAY).level).toBe(0.538);
    expect(emberState([back(2)], TODAY).level).toBe(0.289);
    expect(emberState([back(3)], TODAY).level).toBe(0.156);
    expect(emberState([back(4)], TODAY).level).toBe(0);
  });

  it('reads only the history on or before today', () => {
    const state = emberState([back(2), addDays(TODAY, 1)], TODAY);
    expect(state.last).toBe(back(2));
    expect(state.level).toBe(0.289);
  });
});

describe('callusState', () => {
  it('is empty without history', () => {
    expect(callusState([], TODAY)).toEqual({ earned: 0, consumed: 0, pool: 0, streak: 0 });
  });

  it('earns one callus per completed 7-day run', () => {
    expect(callusState(run(7), TODAY)).toMatchObject({ earned: 1, pool: 1, streak: 7 });
    expect(callusState(run(14), TODAY)).toMatchObject({ earned: 2, pool: 2, streak: 14 });
    expect(callusState(run(8), TODAY)).toMatchObject({ earned: 1, pool: 1, streak: 8 });
  });

  it('heals a single miss and keeps the chain — the callus is spent', () => {
    const logs = [...Array.from({ length: 7 }, (_, i) => back(i + 2)), TODAY]; // 7 days ending 2d ago, yesterday missed, today back
    expect(callusState(logs, TODAY)).toMatchObject({
      earned: 1,
      consumed: 1,
      pool: 0,
      streak: 9, // the shield carries the chain across the missed day — 7 + healed + today
    });
  });

  it('cannot heal two dead days with a single shield', () => {
    const chain = Array.from({ length: 7 }, (_, i) => back(i + 3)); // back(3)..back(9)
    const logs = [...chain, TODAY]; // back(2) and back(1) missed — two dead days
    expect(callusState(logs, TODAY)).toMatchObject({ earned: 1, consumed: 1, pool: 0, streak: 1 });
  });

  it('a real break without shields restarts the run', () => {
    const logs = [back(6), back(5), back(4), back(3), back(2), TODAY]; // 5 days, yesterday missed, today
    expect(callusState(logs, TODAY)).toMatchObject({ earned: 0, consumed: 0, pool: 0, streak: 1 });
  });

  it('matches currentStreak when no shield is involved', () => {
    expect(callusState(runPast(4), TODAY).streak).toBe(currentStreak(runPast(4), TODAY));
    expect(callusState([], TODAY).streak).toBe(0);
  });

  it('an alive run earns its shield while pending today', () => {
    expect(callusState(runPast(7), TODAY)).toMatchObject({ earned: 1, pool: 1, streak: 7 });
  });
});

describe('postureLevel', () => {
  it('stands tall with no target to miss', () => {
    expect(postureLevel(0, 0)).toBe(1);
  });

  it('maps done/target onto the 0..1 bow', () => {
    expect(postureLevel(3, 7)).toBe(3 / 7);
    expect(postureLevel(7, 7)).toBe(1);
  });

  it('clamps impossible over-delivery instead of leaning backward', () => {
    expect(postureLevel(9, 7)).toBe(1);
  });
});
