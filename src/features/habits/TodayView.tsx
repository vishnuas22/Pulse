import { Plus } from 'lucide-react';
import { useHabits } from '@/app/HabitsProvider';
import { useAppUi } from '@/app/ui-context';
import { Button } from '@/ui/Button';
import { EmptyState, ErrorState } from '@/ui/EmptyState';
import { LoadingBlock } from '@/ui/Spinner';
import { useToast } from '@/ui/Toast';
import { formatHuman, isoWeek, todayKey } from '@/lib/date';
import { HabitRow } from './HabitRow';

export function TodayView() {
  const { status, error, habits, logs, pending, toggle, refresh } = useHabits();
  const { openCreate } = useAppUi();
  const toast = useToast();
  const today = todayKey();

  if (status === 'loading') return <LoadingBlock label="Loading today" />;
  if (status === 'error') return <ErrorState message={error} onRetry={() => void refresh()} />;

  const active = habits
    .filter((h) => h.archivedAt === null)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const done = active.filter((h) => (logs[h.id] ?? []).includes(today)).length;

  return (
    <section>
      <header className="pt-10 pb-6">
        <p className="mono-label text-ink-3">Today · week {isoWeek(today)}</p>
        <h1 className="mt-2 font-serif text-[40px] leading-[1.05] text-ink">{formatHuman(today)}</h1>
        <p className="tnum mt-2 font-mono text-[12px] text-ink-2">
          {done} of {active.length} checked in
          {active.length > 0 && done === active.length ? ' — all clear' : ''}
        </p>
      </header>

      {active.length === 0 ? (
        <EmptyState
          title="Nothing on record."
          body="Create the first habit. Check in on it here, every day."
          action={
            <Button onClick={openCreate}>
              <Plus size={14} aria-hidden />
              New habit
            </Button>
          }
        />
      ) : (
        <div className="border-t border-hairline">
          {active.map((habit) => (
            <HabitRow
              key={habit.id}
              habit={habit}
              dates={logs[habit.id] ?? []}
              pending={pending.includes(habit.id)}
              onToggle={() => {
                void toggle(habit.id).catch((e: unknown) => {
                  toast.push({
                    kind: 'danger',
                    message: e instanceof Error ? e.message : 'Could not save the check-in.',
                  });
                });
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}
