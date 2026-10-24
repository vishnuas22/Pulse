# Pulse — live build progress

Legend: `[x]` done · `[~]` in progress · `[ ]` queued. Compile, test, and
build gates all green on the current toolchain (t0 → t7 = 83.6 min total).

| # | Phase | Status | Wall time |
|---|---|---|---|
| P0 | Toolchain pin + scaffold + tokens | [x] | 9.6 min (incl. 2 dependency conflicts resolved) |
| P1 | API contract + local persistence + provider | [x] | batched with P0–P2 writes |
| P2 | Today view · create · edit · check-in | [x] | batched |
| P3 | Manage view · search/sort · archive | [x] | batched |
| P4 | Delete cascade + undo · detail + heatmap · settings | [x] | batched |
| P5 | Tests 39/39 · typecheck · production build · browser QA | [x] | 9.6 min |
| P6 | Pulse Studio — cinematic dark route (live-data hologram, breath session, momentum deck) | [x] | 56.2 min |
| P7 | Ledger redesign — print editorial direction · anatomical hologram figure rebuild | [x] | batched |

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
- **t7 = 1792731659** — **P6 complete: Pulse Studio.** Reference distillation (ember breath player + dark stat deck + luminous score figure) fused into one route `/studio`, mounted full-bleed beside the ledger via an `App.tsx` Layout↔Outlet restructure (768px paper shell untouched; header gains a STUDIO link).
- Real physics, hand-rolled (`studio/physics.ts`): spring-damper solver (semi-implicit Euler, k/c, near-critical damping) → `Spring`, `useSpring`, `useSpringNumber`, `useMagnetic` (pointer-attracted CTAs), `useReveal` (IntersectionObserver reveals; also treats "already scrolled past" as in-view). No animation library.
- Real photography, verified before use (HTTP 200 `image/jpeg` + visually inspected): hero/session candidates downloaded and screened — half the remembered IDs were wrong subjects (a dog, pastel abstracts); the live cast is hero `…afcc221` (ember horizon), session `…9c3c85` (profile against ember sky, ref-1 layout), momentum band `…7429ae` (aerial runners, duotone), divider `…df0df` (ember sky marquee), finale `…b3285` (balancing on the sun).
- Living data: hologram figure's glow/breathing/scan-shimmer wraps **5 orbiting habit nodes bound to the real ledger** — ring burns lime when checked in today; clicking a node (or checklist row) toggles the habit live. Verified in-page: 75% → 100% flips copy to "Every ritual honored."; undo → "Strong signal." Momentum deck reads `currentStreak`/`checkedLast7`/30-day aggregate into a catmull-rom route chart, split bars, and a stat rail.
- Breath session verified in-page: phase math correct ("hold" at 5.2 s of a 10 s cycle at 6 bpm), rail fill 0.84% at 5.2 s / 10:00, ±10s transport, pace pill synthetic-drag snapped 6 → 8 bpm (ruby-band + spring), theme cycle Bright→Ember→Night→… (filter class swaps).
- Caught & fixed during QA: `useReveal` never fired for elements above the viewport after scroll-restore → IO now also reveals `boundingClientRect.bottom < 0`, plus `scrollRestoration='manual'` + scroll-to-top on studio mount (H1 was invisible after reload); leftover `ref={heroTypeRef}` crashed `/studio` (`ReferenceError`) → removed; dull hero overlays lightened + `object-[center_25%]`; embers re-sprited with hot cores (were smudges).
- Gates on final code: typecheck exit 0 · 39/39 tests · build 352.12 KB JS / 109.23 KB gzip (195 ms). Demo seed restored to pristine (2 of 4: Meditate + Write checked) via the ledger UI. Note: late-session glamour screenshots blocked by an invisible desktop browser window — a11y snapshots + in-page `evaluate` are the QA evidence of record.
- **t8 = 1792859302** — **P7 complete: the ledger redesign + the anatomical figure.** Two user call-outs answered. (Wall-clock from t7 spans an overnight gap + an assistant outage, so no honest per-minute delta is reconstructable; logged "batched".)
- Call-out 1 "the ledger looks AI-generated" → rebuilt in the studio's language but as *print*, not as a dark re-skin: broadsheet masthead with a double keyline (2px ink/85 rule over a 1px ink/25 thin rule), serif wordmark "Pulse." + mono colophon "A habit ledger", small-cap mono nav on ink underlines. Today is now a day-page: giant 72px serif date split into weekday / numeral / italic month, a right-hand bookkeeping block (76px tabular serif numerals above the exact required "N of M checked in" line), rows became ledger lines — entry indices 01–04, serif 19px names, streak annotations in accent when kept today — closed by a "Day total" rule. Manage gained a ruled column-header strip + entry numbers; Detail swapped the card stat box for a ruled 4-column strip with 34px serif numerals; HistoryGrid prints ink squares with a cinnabar today-ring (76 cells, 1 ring — matched data). Buttons read as ink stamps (mono, uppercase, tracked), fields are underlines; `CheckCircle` is a 32px seal with a two-phase `stamp-in` overshoot — roles/aria/disabled/title untouched, so 39/39 held under edit. New token `--paper-2` for hovers.
- Call-out 2 "the body looks funny" → the figure was rebuilt as real anatomy: ONE closed catmull-rom loop authored from 33 right-half landmarks (crown → skull → jaw-corner turn → neck pinch → trap → delt → lat/waist → iliac → pelvis → leg outer → foot → inner leg → crotch → mirrored return), arms as closed shapes painted beneath the torso, every shape sampling ONE userSpaceOnUse gradient so the union is seamless; rim light from the right; the body rim stroke is masked behind the arm shapes so no flank seam shows. Checked against QuickLook thumbnails over seven gen→preview rounds (flat crown + skull width, attached delt caps, arm inner edge grazing the waist, near-touching knees, tapered feet). Component re-anchored: viewBox 420×740 (body bbox x136–284, y25–653), nodes re-anchored to anatomy — head, heart (large), waist, hip, below-foot — breath origin retuned; `useSpringNumber` now rounds per frame (16-decimal score flash removed).
- In-page QA: Today (masthead rules, serif names, indices, exact switch labels, single summary line, day-total footer), studio (figure bbox exact, node toggle Morning run true→false via dispatched clicks, score springs, connectors 5) and detail (ruled strip 1px/1px, serif stat numerals, ink grid + today ring) all verified via a11y snapshots + `evaluate` (screenshot tooling still blocked by the invisible window).
- Gates on final code: typecheck exit 0 · 39/39 · build 357.50 KB JS / 111.15 KB gzip (311 ms). Demo seed pristine (2 of 4).
