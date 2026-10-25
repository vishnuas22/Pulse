import { useRef, useState } from 'react';
import type { PulseDB } from '@/api/types';
import { devApi } from '@/api/local';
import { sim } from '@/api/sim';
import { useHabits } from '@/app/HabitsProvider';
import { Button } from '@/ui/Button';
import { ConfirmDialog } from '@/ui/Modal';
import { useToast } from '@/ui/Toast';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-hairline py-8 last:border-b-0">
      <p className="mono-label text-ink-3">{title}</p>
      <div className="mt-5 max-w-md">{children}</div>
    </section>
  );
}

export function SettingsView() {
  const { refresh } = useHabits();
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);

  const [latency, setLatency] = useState(sim.latencyMs);
  const [failures, setFailures] = useState(sim.pendingFailures);
  const [confirmingReset, setConfirmingReset] = useState(false);

  const exportAll = () => {
    void devApi
      .exportAll()
      .then((db: PulseDB) => {
        const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'pulse-export.json';
        a.click();
        URL.revokeObjectURL(url);
        toast.push({ message: `Export downloaded — ${db.habits.length} habits, ${db.logs.length} check-ins.` });
      })
      .catch((e: unknown) =>
        toast.push({
          kind: 'danger',
          message: e instanceof Error ? e.message : 'Could not export.',
        }),
      );
  };

  const importAll = (file: File) => {
    void file
      .text()
      .then((text) => JSON.parse(text) as PulseDB)
      .then((db) => devApi.importAll(db))
      .then(() => refresh())
      .then(() => toast.push({ message: 'Import complete.' }))
      .catch(() => toast.push({ kind: 'danger', message: 'That file is not a valid Pulse export.' }));
  };

  return (
    <section>
      <header className="pt-10 pb-6">
        <div className="border-b-2 border-ink pb-6">
          <p className="mono-label text-ink-3">Settings</p>
          <h1 className="mt-3 font-display text-[48px] font-semibold leading-none tracking-[-0.01em] text-ink">Preferences</h1>
        </div>
      </header>

      <div className="border-t border-hairline">
        <Section title="Data">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={exportAll}>
              Export JSON
            </Button>
            <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
              Import JSON
            </Button>
            <Button variant="danger-ghost" size="sm" onClick={() => setConfirmingReset(true)}>
              Reset to demo data
            </Button>
          </div>
          <input
            ref={fileInput}
            id="import-file"
            type="file"
            accept="application/json,.json"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) importAll(file);
              e.target.value = '';
            }}
            className="sr-only"
          />
          <p className="tnum mt-4 font-mono text-[12px] text-ink-3">
            storage key: pulse.v1 · data never leaves this browser
          </p>
        </Section>

        <Section title="Network simulation">
          <div className="flex flex-col gap-4">
            <div>
              <div className="flex items-baseline justify-between">
                <label htmlFor="sim-latency" className="text-[13px] text-ink-2">
                  Latency per request
                </label>
                <span aria-live="polite" className="tnum font-mono text-[12px] text-ink">
                  {latency} ms
                </span>
              </div>
              <input
                id="sim-latency"
                type="range"
                min={0}
                max={800}
                step={20}
                value={latency}
                onChange={(e) => {
                  sim.latencyMs = Number(e.target.value);
                  setLatency(sim.latencyMs);
                }}
                className="accent-accent mt-2 w-full"
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <p className="text-[13px] text-ink-2">Queued failures</p>
              <div className="flex items-center gap-2">
                <span aria-live="polite" className="tnum font-mono text-[12px] text-ink">
                  {failures}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    sim.pendingFailures += 1;
                    setFailures(sim.pendingFailures);
                  }}
                >
                  Fail next request
                </Button>
              </div>
            </div>
            <p className="text-[12px] text-ink-3">
              A real backend is slower and fallible than localStorage. Keep simulation on while you build, so
              loading, error, and rollback paths stay honest.
            </p>
          </div>
        </Section>

        <Section title="About">
          <p className="text-[13px] leading-normal text-ink-2">
            Pulse is a frontend-only habit ledger built to practice CRUD operations. Its api layer is a drop-in
            seam: when the backend class adds Express routes, one file swaps in and nothing else changes.
          </p>
        </Section>
      </div>

      <ConfirmDialog
        open={confirmingReset}
        onClose={() => setConfirmingReset(false)}
        title="Reset to demo data?"
        confirmLabel="Reset"
        body={
          <p>Replaces everything currently stored in this browser with the seeded example habits.</p>
        }
        onConfirm={async () => {
          try {
            await devApi.reset();
            await refresh();
            toast.push({ message: 'Demo data restored.' });
          } catch (e) {
            toast.push({
              kind: 'danger',
              message: e instanceof Error ? e.message : 'Could not reset.',
            });
            throw e;
          }
        }}
      />
    </section>
  );
}
