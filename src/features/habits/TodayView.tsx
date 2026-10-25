import { Plus } from 'lucide-react';
import { useHabits } from '@/app/HabitsProvider';
import { useAppUi } from '@/app/ui-context';
import { Button } from '@/ui/Button';
import { EmptyState, ErrorState } from '@/ui/EmptyState';
import { LoadingBlock } from '@/ui/Spinner';
import { useToast } from '@/ui/Toast';
import { formatHuman, isoWeek, todayKey } from '@/lib/date';
import { HabitRow } from './HabitRow';

/** "Thursday, 23 October" → weekday / day / month-rest, typeset separately. */
function splitHumanDate(human: string): { weekday: string; day: string; rest: string } | null {
  const m = human.match(/^([^,]+),\s*(\d+)\s+(.+)$/);
  if (!m) return null;
  return { weekday: m[1], day: m[2], rest: m[3] };
}

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
  const pct = active.length === 0 ? 0 : Math.round((done / active.length) * 100);
  const date = splitHumanDate(formatHuman(today));

  return (
    <section>
      <header className="pt-12 pb-10">
        <div className="flex items-end justify-between gap-8 border-b-2 border-ink pb-8">
          <div className="min-w-0">
            <p className="mono-label text-ink-3">The daily record · week {isoWeek(today)}</p>
            <h1 className="mt-4 font-display text-[56px] font-semibold leading-[1.02] tracking-[-0.015em] text-ink sm:text-[72px]">
              <span className="block">{date ? date.weekday : formatHuman(today)}</span>
              {date && (
                <span className="block">
                  {date.day}&nbsp;
                  <span className="font-normal text-ink-2">{date.rest}</span>
                </span>
              )}
            </h1>
          </div>

          <div className="shrink-0 text-right">
            <p className="mono-label text-ink-3">Checked in</p>
            <p aria-hidden className="tnum mt-2 font-display font-semibold leading-[0.85] tracking-[-0.015em]" style={{ fontVariantNumeric: 'tabular-nums' }}>
              <span className="text-[64px] text-ink sm:text-[76px]">{done}</span>
              <span className="text-[30px] text-ink-3 sm:text-[36px]">/{active.length}</span>
            </p>
            <p className="tnum mt-3 font-mono text-[12px] text-ink-2">
              {done} of {active.length} checked in
              {active.length > 0 && done === active.length ? ' — all clear' : ''}
            </p>
          </div>
        </div>
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
        <>
          <div className="border-t border-hairline">
            {active.map((habit, i) => (
              <HabitRow
                key={habit.id}
                index={i}
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

          {/* the bookkeeper's closing rule */}
          <div className="flex items-baseline justify-between border-b-2 border-ink pt-4">
            <p className="mono-label text-ink-3">Day total</p>
            <p className="tnum font-mono text-[13px] text-ink">
              {done}/{active.length} <span className="text-ink-3">· {pct}%</span>
            </p>
          </div>
        </>
      )}
    </section>
  );
}
