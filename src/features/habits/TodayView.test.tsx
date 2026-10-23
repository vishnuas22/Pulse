import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, expect, it } from 'vitest';
import type { ReactNode } from 'react';
import { sim } from '@/api/sim';
import { HabitsProvider } from '@/app/HabitsProvider';
import { AppUiProvider } from '@/app/ui-context';
import { ToastProvider } from '@/ui/Toast';
import { todayKey } from '@/lib/date';
import { TodayView } from './TodayView';

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter>
      <ToastProvider>
        <HabitsProvider>
          <AppUiProvider>{children}</AppUiProvider>
        </HabitsProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  localStorage.clear();
  sim.latencyMs = 0;
  sim.pendingFailures = 0;
});

it('renders the seeded ledger with the summary line', async () => {
  render(
    <Wrapper>
      <TodayView />
    </Wrapper>,
  );
  expect(await screen.findByText('Meditate')).toBeInTheDocument();
  expect(screen.getByText('Morning run')).toBeInTheDocument();
  expect(screen.getByText(/2 of 4 checked in/)).toBeInTheDocument(); // Meditate + Write 300 words are seeded as done
});

it('optimistically checks in and updates the summary', async () => {
  const user = userEvent.setup();
  render(
    <Wrapper>
      <TodayView />
    </Wrapper>,
  );
  const circle = await screen.findByRole('switch', { name: /check in for Morning run/i });
  expect(circle).toHaveAttribute('aria-checked', 'false');
  await user.click(circle);
  await waitFor(() => expect(circle).toHaveAttribute('aria-checked', 'true'));
  // Wait for persistence too, not just the optimistic UI — otherwise the
  // write lands inside the next test (a real last-write-wins race).
  await waitFor(() => {
    const db = JSON.parse(localStorage.getItem('pulse.v1') ?? '{}') as {
      logs?: Array<{ habitId: string; date: string }>;
    };
    expect(db.logs?.some((l) => l.habitId === 'seed-1' && l.date === todayKey())).toBe(true);
  });
  expect(await screen.findByText(/3 of 4 checked in/)).toBeInTheDocument();
});

it('rolls back with a toast when the request fails', async () => {
  const user = userEvent.setup();
  render(
    <Wrapper>
      <TodayView />
    </Wrapper>,
  );
  const circle = await screen.findByRole('switch', { name: /check in for Morning run/i });
  sim.pendingFailures = 1;
  await user.click(circle);
  // The toast surfaces the real ApiError message — a simulated network failure here.
  await waitFor(() => expect(circle).toHaveAttribute('aria-checked', 'false'));
  expect(await screen.findByText(/simulated request failure/i)).toBeInTheDocument();
});
