import { describe, expect, it } from 'vitest';
import { addDays } from './date';
import { checkedLast7, currentStreak, longestStreak, streakLabel } from './stats';

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
