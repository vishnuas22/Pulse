# Pulse — a quiet habit ledger

Frontend-only CRUD practice in React. The entire persistence story lives behind
one file (`src/api/habits.ts`): today it talks to localStorage with simulated
network latency and failures; in your backend class you implement the same
interface with `fetch()` and swap a single line. Design system and rationale:
see `PLAN.md`. Live build log: `PROGRESS.md`.

## Run it

```sh
npm install
npm run dev      # http://localhost:5173
npm run test     # vitest
npm run typecheck
npm run build
```

## The four views

| View | Route | What you practice |
|---|---|---|
| Today | `/` | Check-in (the daily UPDATE), summary read |
| Manage | `/habits` | Search, sort, edit, archive, delete + undo |
| Habit detail | `/habits/:id` | Stats, history grid, full CRUD affordances |
| Settings | `/settings` | Export/import JSON, reset, network simulation |

Keyboard: `n` new habit · `/` focus search · `Esc` closes modals ·
`Space`/`Click` on the circle toggles a check-in.

## Where the CRUD is (study map)

- **C** — `createHabit` → “New habit” modal (`src/features/habits/HabitForm.tsx`)
- **R** — `listHabits`/`listAllLogs` → provider → Today, Manage, Detail
- **U** — `setLog`/`clearLog` (optimistic + rollback), `updateHabit` (edit modal)
- **D** — `deleteHabit` cascades logs and returns an undo snapshot; archive is soft delete

The optimistic-rollback path and the failure simulator (Settings → Network
simulation) are the two pieces worth reading twice.

## Swapping in the real backend (the point of all this)

1. Write `src/api/habits.http.ts` implementing `HabitApi` with `fetch()`
   (endpoint table in `PLAN.md` §3.2). Reuse `ApiError` for status mapping.
2. In `src/api/habits.ts` change the implemented singleton to the HTTP one.
3. Uncomment the dev proxy in `vite.config.ts`.
4. Write a tiny Express server (~120 lines) to satisfy the table.

No component, hook, or view changes. Written to force that outcome.

## Follow-ups

- ESLint is not installed: `typescript-eslint` 8 does not support
  TypeScript 7 yet. Revisit when the tooling catches up (`npm i -D eslint typescript-eslint`).
- Weekly-target (`targetPerWeek`) streak logic and value-scale heat ramp ship
  as schema/tokens, activate in v2.
