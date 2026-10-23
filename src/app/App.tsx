import { useEffect } from 'react';
import { Link, NavLink, Route, Routes } from 'react-router';
import { Plus, Settings } from 'lucide-react';
import { HabitsProvider, useHabits } from './HabitsProvider';
import { AppUiProvider, useAppUi } from './ui-context';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { Modal } from '@/ui/Modal';
import { ToastProvider } from '@/ui/Toast';
import { DetailView } from '@/features/habits/DetailView';
import { HabitForm } from '@/features/habits/HabitForm';
import { ManageView } from '@/features/habits/ManageView';
import { SettingsView } from '@/features/habits/SettingsView';
import { TodayView } from '@/features/habits/TodayView';
import { cn } from '@/lib/cn';

const NAV = 'mono-label transition-colors duration-[120ms] ease-[cubic-bezier(0.2,0,0,1)]';

function NotFound() {
  return (
    <EmptyState
      title="Page not found."
      body="The route does not exist in this ledger."
      action={
        <Link to="/" className="mt-1 text-[13px] font-medium text-accent hover:underline underline-offset-4">
          Back to today
        </Link>
      }
    />
  );
}

function Layout() {
  const { create } = useHabits();
  const { createOpen, openCreate, closeCreate } = useAppUi();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);
      if (typing) return;
      if (e.key === 'n') {
        e.preventDefault();
        openCreate();
      } else if (e.key === '/') {
        e.preventDefault();
        document.getElementById('habit-search')?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openCreate]);

  return (
    <div className="min-h-dvh">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[70] focus:rounded-input focus:bg-surface focus:px-3 focus:py-2 focus:text-[13px] focus:font-medium"
      >
        Skip to content
      </a>

      <header className="border-b border-hairline">
        <div className="mx-auto flex h-16 w-full max-w-[768px] items-center justify-between px-6">
          <Link to="/" className="flex items-baseline gap-1.5">
            <span className="font-serif text-[20px] leading-none text-ink">Pulse</span>
            <span aria-hidden className="mb-1 inline-block size-1.5 rounded-full bg-accent" />
          </Link>

          <nav aria-label="Primary" className="flex items-center gap-5">
            <NavLink to="/" end className={({ isActive }) => cn(NAV, isActive ? 'text-ink' : 'text-ink-3 hover:text-ink')}>
              Today
            </NavLink>
            <NavLink to="/habits" end className={({ isActive }) => cn(NAV, isActive ? 'text-ink' : 'text-ink-3 hover:text-ink')}>
              Manage
            </NavLink>
          </nav>

          <div className="flex items-center gap-1">
            <Button size="sm" onClick={openCreate}>
              <Plus size={14} aria-hidden />
              New habit
            </Button>
            <Link
              to="/settings"
              aria-label="Settings"
              title="Settings"
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-input text-ink-3 transition-colors duration-[120ms] ease-[cubic-bezier(0.2,0,0,1)] hover:bg-[#eceae5] hover:text-ink"
            >
              <Settings size={16} aria-hidden />
            </Link>
          </div>
        </div>
      </header>

      <main id="content" className="mx-auto w-full max-w-[768px] px-6 pb-28">
        <Routes>
          <Route path="/" element={<TodayView />} />
          <Route path="/habits" element={<ManageView />} />
          <Route path="/habits/:id" element={<DetailView />} />
          <Route path="/settings" element={<SettingsView />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <Modal open={createOpen} onClose={closeCreate} title="New habit">
        <HabitForm
          onCancel={closeCreate}
          onSubmit={async (input) => {
            // Throws on failure (the form renders the banner); closes only on success.
            await create(input);
            closeCreate();
          }}
        />
      </Modal>
    </div>
  );
}

export function App() {
  return (
    <ToastProvider>
      <HabitsProvider>
        <AppUiProvider>
          <Layout />
        </AppUiProvider>
      </HabitsProvider>
    </ToastProvider>
  );
}
