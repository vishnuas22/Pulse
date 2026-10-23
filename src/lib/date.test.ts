import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, isoWeek, lastNDays, todayKey, weekdayOfMonday } from './date';

describe('addDays', () => {
  it('wraps across month and year boundaries', () => {
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01'); // 2026 is not a leap year
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-10-23', -1)).toBe('2026-10-22');
  });

  it('handles leap years', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2028-02-29', 1)).toBe('2028-03-01');
  });

  it('round-trips a large negative span', () => {
    expect(addDays(addDays('2026-10-23', -137), 137)).toBe('2026-10-23');
  });
});

describe('daysBetween', () => {
  it('counts whole days', () => {
    expect(daysBetween('2026-01-01', '2026-01-31')).toBe(30);
    expect(daysBetween('2026-01-31', '2026-01-01')).toBe(-30);
    expect(daysBetween('2026-03-01', '2026-02-28')).toBe(-1);
  });
});

describe('lastNDays', () => {
  it('returns n ascending keys ending at the anchor', () => {
    expect(lastNDays('2026-01-03', 3)).toEqual(['2026-01-01', '2026-01-02', '2026-01-03']);
  });
});

describe('weekdayOfMonday', () => {
  it('maps to 0 = Monday', () => {
    expect(weekdayOfMonday('2026-10-19')).toBe(0); // Monday
    expect(weekdayOfMonday('2026-10-23')).toBe(4); // Friday
    expect(weekdayOfMonday('2026-10-18')).toBe(6); // Sunday
  });
});

describe('isoWeek', () => {
  it('matches known ISO weeks', () => {
    expect(isoWeek('2026-10-23')).toBe(43);
    expect(isoWeek('2026-01-01')).toBe(1);
    expect(isoWeek('2026-01-05')).toBe(2);
    expect(isoWeek('2022-01-03')).toBe(1); // Monday of week 1
    expect(isoWeek('2021-01-01')).toBe(53); // belongs to ISO year 2020
  });
});

describe('todayKey', () => {
  it('produces a fixed-width local key', () => {
    expect(todayKey()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
