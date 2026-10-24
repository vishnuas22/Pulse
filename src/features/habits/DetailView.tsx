import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, PencilLine, Trash2 } from 'lucide-react';
import { useHabits } from '@/app/HabitsProvider';
import { ACCENT_CLASSES } from '@/lib/accents';
import { cn } from '@/lib/cn';
import { Button, IconButton } from '@/ui/Button';
import { EmptyState, ErrorState } from '@/ui/EmptyState';
import { ConfirmDialog, Modal } from '@/ui/Modal';
import { LoadingBlock } from '@/ui/Spinner';
import { useToast } from '@/ui/Toast';
import { formatShort } from '@/lib/date';
import { checkedLast7, currentStreak, longestStreak } from '@/lib/stats';
import { HabitForm } from './HabitForm';
import { HistoryGrid } from './HistoryGrid';

export function DetailView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { status, error, habits, logs, pending, update, remove, restore, refresh } = useHabits();
  const toast = useToast();

  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (status === 'loading') return <LoadingBlock label="Loading habit" />;
  if (status === 'error') return <ErrorState message={error} onRetry={() => void refresh()} />;

  const habit = habits.find((h) => h.id === id);
  if (!habit) {
    return (
      <EmptyState
        title="Habit not found."
        body="It may have been deleted, or the link is stale."
        action={
          <Link to="/habits" className="mt-1 text-[13px] font-medium text-accent hover:underline underline-offset-4">
            Back to the ledger
          </Link>
        }
      />
    );
  }

  const dates = logs[habit.id] ?? [];
  const isArchived = habit.archivedAt !== null;

  return (
    <section>
      <header className="pt-8 pb-2">
        <div className="flex items-center justify-between">
          <Link
            to="/habits"
            className="mono-label flex items-center gap-1.5 text-ink-3 transition-colors duration-[120ms] hover:text-ink"
          >
            <ArrowLeft size={12} aria-hidden />
            Manage
          </Link>
          {isArchived && <span className="mono-label text-accent">Archived</span>}
        </div>

        <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <span aria-hidden className={cn('size-2.5 rounded-full', ACCENT_CLASSES[habit.accent].dot)} />
              <h1 className="font-serif text-[40px] leading-[1.05] text-ink">{habit.name}</h1>
            </div>
            <p className="tnum mt-2 font-mono text-[12px] text-ink-2">
              {habit.targetPerWeek}/wk · created {formatShort(habit.createdAt.slice(0, 10))}
              {isArchived && habit.archivedAt ? ` · archived ${formatShort(habit.archivedAt.slice(0, 10))}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              <PencilLine size={14} aria-hidden />
              Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={pending.includes(habit.id)}
              onClick={() => {
                void update(habit.id, { archivedAt: isArchived ? null : new Date().toISOString() }).catch((e: unknown) =>
                  toast.push({
                    kind: 'danger',
                    message: e instanceof Error ? e.message : 'Could not update the habit.',
                  }),
                );
              }}
            >
              {isArchived ? 'Unarchive' : 'Archive'}
            </Button>
            <IconButton label={`Delete ${habit.name}`} danger onClick={() => setConfirming(true)}>
              <Trash2 size={15} aria-hidden />
            </IconButton>
          </div>
        </div>
      </header>

      <section className="mt-8 border-y border-ink/80">
        <dl className="grid grid-cols-2 divide-x divide-hairline sm:grid-cols-4 max-sm:divide-y">
          {(
            [
              ['Current streak', currentStreak(dates)],
              ['Longest streak', longestStreak(dates)],
              ['Checked · 7d', checkedLast7(dates)],
              ['Total check-ins', dates.length],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="px-4 py-4 first:border-l-0">
              <dt className="mono-label text-ink-3">{label}</dt>
              <dd className="tnum mt-3 font-serif text-[34px] leading-none text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="mt-10 border-t border-hairline pt-8">
        <p className="mono-label text-ink-3">History</p>
        <div className="mt-4">
          <HistoryGrid logs={dates} />
        </div>
      </div>

      {habit.notes && (
        <div className="mt-10 border-t border-hairline pt-8">
          <p className="mono-label text-ink-3">Notes</p>
          <p className="mt-3 max-w-prose text-[15px] leading-normal text-ink-2">{habit.notes}</p>
        </div>
      )}

      <Modal open={editing} onClose={() => setEditing(false)} title="Edit habit">
        <HabitForm
          habit={habit}
          onCancel={() => setEditing(false)}
          onSubmit={async (input) => {
            await update(habit.id, input);
            setEditing(false);
          }}
        />
      </Modal>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Delete habit?"
        confirmLabel="Delete"
        body={
          <>
            <p>
              Delete “{habit.name}”? This also removes its {dates.length} check-in{dates.length === 1 ? '' : 's'}.
            </p>
            <p className="mt-2 text-ink-3">You will have eight seconds to undo.</p>
          </>
        }
        onConfirm={async () => {
          setConfirming(false);
          try {
            const snapshot = await remove(habit.id);
            toast.push({
              message: `Deleted “${habit.name}”.`,
              action: {
                label: 'Undo',
                onClick: () => {
                  void restore(snapshot).catch((e: unknown) =>
                    toast.push({
                      kind: 'danger',
                      message: e instanceof Error ? e.message : 'Could not restore the habit.',
                    }),
                  );
                },
              },
            });
            navigate('/habits');
          } catch (e) {
            toast.push({
              kind: 'danger',
              message: e instanceof Error ? e.message : 'Could not delete the habit.',
            });
            throw e; // keep the dialog open
          }
        }}
      />
    </section>
  );
}
