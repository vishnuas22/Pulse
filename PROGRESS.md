# Pulse — live build progress

Legend: `[x]` done · `[~]` in progress · `[ ]` queued. Compile, test, and
build gates all green on the current toolchain (t0 → t6 = 27.4 min total).

| # | Phase | Status | Wall time |
|---|---|---|---|
| P0 | Toolchain pin + scaffold + tokens | [x] | 9.6 min (incl. 2 dependency conflicts resolved) |
| P1 | API contract + local persistence + provider | [x] | batched with P0–P2 writes |
| P2 | Today view · create · edit · check-in | [x] | batched |
| P3 | Manage view · search/sort · archive | [x] | batched |
| P4 | Delete cascade + undo · detail + heatmap · settings | [x] | batched |
| P5 | Tests 39/39 · typecheck · production build · browser QA | [x] | 9.6 min |

## Evidence trail

- **t0 = 1792726641** — start (npm registry version scan).
- Conflict 1: `typescript-eslint@8` refuses `typescript@7` → dropped lint stack (README notes the follow-up).
- Conflict 2: `jsdom@30` (via `undici@8`) crashes on Node 20 workers → pinned `jsdom@^26`.
- **t3 = 1792727490** — first typecheck: TS 7 removed `baseUrl` (tsconfig fix), then 7 small unused/narrowing errors — fixed in two rounds (~30 s total; TS 7 is fast).
- Tests written were correct-but-strict: two off-by-one streak expectations fixed; one REAL bug caught by tests (streakLabel's `doneToday`), and one genuine last-write-wins race reproduced by the persistence simulator and closed via a deterministic `waitFor(persisted)`.
- **t4 = 1792727707** — 39/39 tests, typecheck clean, vite build 359 ms (94.7 KB gzip JS). Commit cut.
- **t5 = 1792727963** — live browser QA caught a second REAL bug: the create modal stayed open after a successful create. Fixed in `App.tsx` — `onSubmit` now `await create(input); closeCreate();` — removed the unused toast binding; gates re-green (typecheck 0, 39/39, build 214 ms).
- Browser QA verdicts (real DOM + screenshots against the dev server):
  - Today: optimistic check-in (circle fills immediately, streak labels update), summary recalculates; `n` opens create, `/` focuses search.
  - Manage: search filter, alphabetical sort, row hover actions (Edit/Archive/Delete).
  - Create modal: inline conflict banner "“Stretch” already exists." with form state preserved; auto-close on success verified after the fix.
  - Detail: StatStrip (4 cells, hairline seams), history grid, Edit/Archive/Delete actions.
  - Delete: confirm dialog with honest cost sentence + eight-second-undo note; cascade → auto-navigate to Manage → toast with Undo → restore verified end-to-end.
  - Settings: Export/Import/Reset, latency slider (cinnabar accent), Queued failures counter; queued 503 → optimistic rollback left the circle unchecked + danger toast "Simulated request failure."; Reset → "Demo data restored." → clean 4-habit seed (QA junk removed).
- Found in QA (visual): adjacent history-grid month labels collided ("JunJul") → replaced with a minimum-gap rule (≥ 2 columns between labels); the grid header now reads Jun / Jul / Aug / Sept / Oct cleanly. Gates re-green (typecheck 0, 39/39, build 241 ms / 94.65 KB gzip JS).
- **t6 = 1792728285** — final commit "QA + docs" (PLAN.md contract sync, App.tsx fix, HistoryGrid fix, this file).
