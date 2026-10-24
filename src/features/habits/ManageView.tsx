import { useState } from 'react';
import { Archive, ArchiveRestore, PencilLine, Plus, Search, Trash2 } from 'lucide-react';
import { useHabits } from '@/app/HabitsProvider';
import { useAppUi } from '@/app/ui-context';
import type { Habit } from '@/api/types';
import { Button, IconButton } from '@/ui/Button';
import { EmptyState, ErrorState } from '@/ui/EmptyState';
import { Input, Select } from '@/ui/Inputs';
import { ConfirmDialog, Modal } from '@/ui/Modal';
import { LoadingBlock } from '@/ui/Spinner';
import { useToast } from '@/ui/Toast';
import { currentStreak } from '@/lib/stats';
import { HabitForm } from './HabitForm';
import { HabitRow } from './HabitRow';

type SortKey = 'name' | 'streak' | 'newest';

export function ManageView() {
  const { status, error, habits, logs, pending, toggle, update, remove, restore, refresh } = useHabits();
  const { openCreate } = useAppUi();
  const toast = useToast();

  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('name');
  const [editing, setEditing] = useState<Habit | null>(null);
  const [deleting, setDeleting] = useState<Habit | null>(null);

  if (status === 'loading') return <LoadingBlock label="Loading the ledger" />;
  if (status === 'error') return <ErrorState message={error} onRetry={() => void refresh()} />;

  const q = query.trim().toLowerCase();
  const matches = (h: Habit) => q === '' || h.name.toLowerCase().includes(q);

  const active = habits.filter((h) => h.archivedAt === null && matches(h));
  const archived = habits.filter((h) => h.archivedAt !== null && matches(h));
  const deleteCount = deleting ? (logs[deleting.id] ?? []).length : 0;

  const sorted = [...active].sort((a, b) => {
    if (sort === 'name') return a.name.localeCompare(b.name);
    if (sort === 'newest') return b.createdAt.localeCompare(a.createdAt);
    return currentStreak(logs[b.id] ?? []) - currentStreak(logs[a.id] ?? []) || a.name.localeCompare(b.name);
  });

  const onError = (message: string) => (e: unknown) =>
    toast.push({ kind: 'danger', message: e instanceof Error ? e.message : message });

  const archiveAction = (habit: Habit) => {
    void update(habit.id, { archivedAt: new Date().toISOString() })
      .then(() => {
        toast.push({
          message: `Archived “${habit.name}”.`,
          action: {
            label: 'Undo',
            onClick: () => {
              void update(habit.id, { archivedAt: null }).catch(onError('Could not restore the habit.'));
            },
          },
        });
      })
      .catch(onError('Could not archive the habit.'));
  };

  const rowActions = (habit: Habit, isArchived: boolean) => (
    <>
      {!isArchived && (
        <IconButton label={`Edit ${habit.name}`} onClick={() => setEditing(habit)}>
          <PencilLine size={15} aria-hidden />
        </IconButton>
      )}
      {isArchived ? (
        <IconButton
          label={`Restore ${habit.name}`}
          onClick={() => {
            void update(habit.id, { archivedAt: null }).catch(onError('Could not restore the habit.'));
          }}
        >
          <ArchiveRestore size={15} aria-hidden />
        </IconButton>
      ) : (
        <IconButton label={`Archive ${habit.name}`} onClick={() => archiveAction(habit)}>
          <Archive size={15} aria-hidden />
        </IconButton>
      )}
      <IconButton label={`Delete ${habit.name}`} danger onClick={() => setDeleting(habit)}>
        <Trash2 size={15} aria-hidden />
      </IconButton>
    </>
  );

  return (
    <section>
      <header className="pt-12 pb-8">
        <div className="border-b-2 border-ink pb-6">
          <p className="mono-label text-ink-3">Manage</p>
          <h1 className="mt-3 font-serif text-[48px] leading-none text-ink">All habits</h1>
        </div>
      </header>

      <div className="flex items-center gap-3 pb-4">
        <div className="relative min-w-0 flex-1">
          <Search size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3" aria-hidden />
          <Input
            id="habit-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search habits…"
            aria-label="Search habits"
            className="h-9 pl-8 text-[13px]"
          />
        </div>
        <div className="w-36 shrink-0">
          <Select aria-label="Sort habits" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="name">Name</option>
            <option value="streak">Streak</option>
            <option value="newest">Newest</option>
          </Select>
        </div>
        <Button size="sm" onClick={openCreate} className="shrink-0">
          <Plus size={14} aria-hidden />
          New
        </Button>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          title={q ? 'No matches.' : 'No habits yet.'}
          body={q ? `Nothing in the ledger matches “${query.trim()}”.` : 'Create the first habit and check in on it daily.'}
          action={
            !q ? (
              <Button onClick={openCreate}>
                <Plus size={14} aria-hidden />
                New habit
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div aria-hidden className="flex justify-between border-b border-hairline pb-1.5 font-mono text-[9px] tracking-[0.14em] text-ink-3 uppercase max-sm:hidden">
            <span className="pl-[92px]">Entry</span>
            <span className="pr-1">Streak · Target</span>
          </div>
        <div className="border-t border-hairline">
          {sorted.map((habit, i) => (
            <HabitRow
              key={habit.id}
              index={i}
              habit={habit}
              dates={logs[habit.id] ?? []}
              pending={pending.includes(habit.id)}
              onToggle={() => {
                void toggle(habit.id).catch(onError('Could not save the check-in.'));
              }}
              actions={rowActions(habit, false)}
              showTarget
            />
          ))}
          </div>
        </>
      )}

      {archived.length > 0 && (
        <details className="group mt-10">
          <summary className="mono-label flex cursor-pointer list-none items-center gap-2 text-ink-3 hover:text-ink">
            <span aria-hidden className="inline-block transition-transform duration-[120ms] ease-[cubic-bezier(0.2,0,0,1)] group-open:rotate-90">
              ›
            </span>
            Archived ({archived.length})
          </summary>
          <div className="mt-3 border-t border-hairline">
            {archived
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((habit) => (
                <HabitRow
                  key={habit.id}
                  habit={habit}
                  dates={logs[habit.id] ?? []}
                  pending={pending.includes(habit.id)}
                  actions={rowActions(habit, true)}
                  archived
                />
              ))}
          </div>
        </details>
      )}

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title="Edit habit">
        {editing && (
          <HabitForm
            habit={editing}
            onCancel={() => setEditing(null)}
            onSubmit={async (input) => {
              await update(editing.id, input);
              setEditing(null);
            }}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete habit?"
        confirmLabel="Delete"
        body={
          deleting ? (
            <>
              <p>
                Delete “{deleting.name}”? This also removes its {deleteCount} check-in{deleteCount === 1 ? '' : 's'}.
              </p>
              <p className="mt-2 text-ink-3">You will have eight seconds to undo.</p>
            </>
          ) : null
        }
        onConfirm={async () => {
          if (!deleting) return;
          const habit = deleting;
          setDeleting(null);
          try {
            const snapshot = await remove(habit.id);
            toast.push({
              message: `Deleted “${habit.name}”.`,
              action: {
                label: 'Undo',
                onClick: () => {
                  void restore(snapshot).catch(onError('Could not restore the habit.'));
                },
              },
            });
          } catch (e) {
            onError('Could not delete the habit.')(e);
            throw e; // keep the dialog open
          }
        }}
      />
    </section>
  );
}
