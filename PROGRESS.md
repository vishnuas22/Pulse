# Pulse — live build progress

Legend: `[x]` done · `[~]` in progress · `[ ]` queued. Compile, test, and
build gates all green on the current toolchain (t0 → t4 = 17.8 min total).

| # | Phase | Status | Wall time |
|---|---|---|---|
| P0 | Toolchain pin + scaffold + tokens | [x] | 9.6 min (incl. 2 dependency conflicts resolved) |
| P1 | API contract + local persistence + provider | [x] | batched with P0–P2 writes |
| P2 | Today view · create · edit · check-in | [x] | batched |
| P3 | Manage view · search/sort · archive | [x] | batched |
| P4 | Delete cascade + undo · detail + heatmap · settings | [x] | batched |
| P5 | Tests 39/39 · typecheck · production build · browser QA | [~] | now |

## Evidence trail

- **t0 = 1792726641** — start (npm registry version scan).
- Conflict 1: `typescript-eslint@8` refuses `typescript@7` → dropped lint stack (README notes the follow-up).
- Conflict 2: `jsdom@30` (via `undici@8`) crashes on Node 20 workers → pinned `jsdom@^26`.
- **t3 = 1792727490** — first typecheck: TS 7 removed `baseUrl` (tsconfig fix), then 7 small unused/narrowing errors — fixed in two rounds (~30 s total; TS 7 is fast).
- Tests wrote were correct-but-strict: two off-by-one streak expectations fixed; one REAL bug caught by tests (streakLabel's `doneToday`), and one genuine last-write-wins race reproduced by the persistence simulator and closed via a deterministic `waitFor(persisted)`.
- **t4 = 1792727707** — 39/39 tests, typecheck clean, vite build 359 ms (94.7 KB gzip JS). Commit cut.
- Remaining: live browser QA + design polish, final docs sync.
