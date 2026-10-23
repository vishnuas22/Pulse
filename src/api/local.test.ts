import { beforeEach, describe, expect, it } from 'vitest';
import type { PulseDB } from './types';
import { createLocalApi, devApi } from './local';
import { sim } from './sim';

const api = createLocalApi();
const habitInput = (name = 'Deep work') => ({ name, notes: 'Focus', accent: 'ember' as const, targetPerWeek: 5 });

beforeEach(() => {
  localStorage.clear();
  sim.latencyMs = 0; // real timers; jitter adds under 40 ms per op
  sim.pendingFailures = 0;
});

describe('createHabit', () => {
  it('creates and lists a habit', async () => {
    const created = await api.createHabit(habitInput());
    expect(created.id).toBeTruthy();
    expect(created.name).toBe('Deep work');
    expect(created.archivedAt).toBeNull();
    const all = await api.listHabits();
    expect(all).toHaveLength(5); // 4 seeded + this one
  });

  it('trims whitespace from names', async () => {
    const created = await api.createHabit(habitInput('  Breathwork  '));
    expect(created.name).toBe('Breathwork');
  });

  it('rejects an empty name with a validation error', async () => {
    await expect(api.createHabit(habitInput('   '))).rejects.toMatchObject({ code: 'validation', status: 400 });
  });

  it('rejects case-insensitive duplicates as conflicts', async () => {
    await api.createHabit(habitInput('Read'));
    await expect(api.createHabit(habitInput('read'))).rejects.toMatchObject({ code: 'conflict', status: 409 });
  });
});

describe('updateHabit', () => {
  it('patches editable fields', async () => {
    const habit = await api.createHabit(habitInput());
    const updated = await api.updateHabit(habit.id, { name: 'Deep work II', targetPerWeek: 3 });
    expect(updated.name).toBe('Deep work II');
    expect(updated.targetPerWeek).toBe(3);
    const all = await api.listHabits();
    expect(all.some((h) => h.name === 'Deep work II')).toBe(true);
  });

  it('returns not_found for an unknown id', async () => {
    await expect(api.updateHabit('nope', { name: 'X' })).rejects.toMatchObject({ code: 'not_found', status: 404 });
  });
});

describe('logs', () => {
  it('setLog is idempotent and clearLog removes', async () => {
    const habit = await api.createHabit(habitInput());
    const today = new Date().toISOString().slice(0, 10);
    await api.setLog(habit.id, today);
    await api.setLog(habit.id, today);
    expect(await api.listLogs(habit.id)).toEqual([today]);
    await api.clearLog(habit.id, today);
    expect(await api.listLogs(habit.id)).toEqual([]);
  });

  it('rejects logs on unknown habits', async () => {
    await expect(api.setLog('nope', '2026-01-01')).rejects.toMatchObject({ code: 'not_found' });
    await expect(api.clearLog('nope', '2026-01-01')).rejects.toMatchObject({ code: 'not_found' });
  });

  it('groups logs by habit in listAllLogs', async () => {
    const a = await api.createHabit(habitInput('Alpha'));
    const b = await api.createHabit(habitInput('Beta'));
    await api.setLog(a.id, '2026-01-02');
    await api.setLog(b.id, '2026-01-01');
    const all = await api.listAllLogs();
    expect(all[a.id]).toEqual(['2026-01-02']);
    expect(all[b.id]).toEqual(['2026-01-01']);
  });
});

describe('deleteHabit', () => {
  it('cascades logs and returns an undo snapshot', async () => {
    const habit = await api.createHabit(habitInput());
    const today = new Date().toISOString().slice(0, 10);
    await api.setLog(habit.id, today);
    await api.setLog(habit.id, '2026-01-02');

    const deleted = await api.deleteHabit(habit.id);
    expect(deleted.habit.id).toBe(habit.id);
    expect(deleted.logs).toEqual(['2026-01-02', today]);

    const all = await api.listAllLogs();
    expect(all[habit.id]).toBeUndefined();
    await expect(api.listLogs(habit.id)).rejects.toMatchObject({ code: 'not_found', status: 404 });
  });

  it('returns not_found for an unknown id', async () => {
    await expect(api.deleteHabit('nope')).rejects.toMatchObject({ code: 'not_found', status: 404 });
  });
});

describe('failure simulation', () => {
  it('rejects the queued call with a network error, then recovers', async () => {
    sim.pendingFailures = 1;
    await expect(api.listHabits()).rejects.toMatchObject({ code: 'network', status: 503 });
    await expect(api.listHabits()).resolves.toBeDefined();
  });
});

describe('devApi', () => {
  it('reset restores the demo seed', async () => {
    await devApi.reset();
    const all = await api.listHabits();
    expect(all).toHaveLength(4);
    expect(all.map((h) => h.name)).toContain('Morning run');
  });

  it('imports a valid envelope and rejects a bad one', async () => {
    const db = await devApi.exportAll();
    await devApi.importAll(db);
    expect((await api.listHabits()).length).toBeGreaterThan(0);
    await expect(devApi.importAll({ version: 9 } as unknown as PulseDB)).rejects.toMatchObject({ code: 'storage' });
  });
});
