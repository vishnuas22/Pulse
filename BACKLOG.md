# BACKLOG — the 10/10 additions (researched, curated)

> Outcome of a three-lane research pass (behavioral science · web craft maturity · codebase seam map).
> Generic ideas are deliberately absent — each entry names its non-generic thesis, its evidence,
> and its exact seams in this codebase. Effort: S ≤ half day · M ≈ 1–2 days · L = multi-day phase.

## The thesis of a 10/10 Pulse
A 10/10 is not more features. It is these four qualities the research keeps rewarding:
**identity-coherent** (every addition serves "the body keeps the score"), **engine-honest**
(deterministic stats, no fake AI), **artifact-producing** (something to take home), and
**engineering-deep** (offline, sync-tolerant, visually regression-proofed). The current app
already has voice + type + figure. What's missing is *continuum*: today the figure is binary
(lime today / dark not-today), time is date-strings only, and closing the web tab ends the story.

## S-TIER — P10 "Embodied ledger" (the soul)

### 1. Ember decay — miss as cooling, not death
- **Thesis**: no habit app renders momentum as *thermodynamics*. Each habit is an ember: after a
  check-in the node+figure limb burns bright and physically decays over 24–72h (exponential,
  chromatic, brightness-led — never red).
- **Evidence**: one missed day does not break habit automaticity (Lally 2010) — trackers that
  punish a miss create the quit (goalsandprogress.com/habit-tracker-trigger-action-reward-two-day-rule);
  ambient continuous encodings beat discrete taps (CHI 2025 ambient displays cut screen time 10.7% —
  dl.acm.org/doi/10.1145/3749507); "streak creep" shows numeric pressure erodes intrinsic joy.
- **Seams**: pure decay fn in `lib/stats.ts` (+ tests in `lib/stats.test.ts`); HoloFigure node
  gradients + per-limb limb mapping (head/heart/waist/hip/foot already node-anchored); reuse
  `--heat-*` ramp as the cooling LUT; DetailView history colors ride the decay curve.
- **Effort** M · **Risk**: keep reduced-motion static frame (grain of `prefersReducedMotion` already in physics).

### 2. Posture as aggregate momentum
- **Thesis**: the figure's spine is the aggregate metric. A strong last-7-days = standing tall
  (existing catmull spine); a fading week = a slow slouch; one check-in visibly lifts it.
- **Evidence**: weekly grids absorb rough weeks where daily chains guilt-abort (Medium — "why
  most habit trackers fail", week 2–3 abandonment pattern); glanceable weekly aggregation
  (Decision Lab). Non-punishing: slouch = low
  energy, lift = visible within one check-in.
- **Seams**: `currentStreak`/`checkedLast7` already exist in `lib/stats.ts`; Spring presets
  (`leanX/leanY` in HoloFigure) become spine bow; Momentum deck gets a "stance" readout.
- **Effort** M · **Risk**: never render red; body language, not shame.

### 3. Streak callus — insurance earned prospectively
- **Thesis**: every 7 consecutive checked days thickens a ring on the node (callus). A callus is
  consumed idempotently when a miss occurs — the streak survives one miss per 7-day run. Missing
  looks like tissue healing, never a zero.
- **Evidence**: pre-earned slack raised Duolingo daily actives +0.38% because it is insurance bought
  in advance, never a retroactive pardon (blog.duolingo.com/how-duolingo-streak-builds-habit);
  day-after-break is the highest-risk moment and needs a designed repair path.
- **Seams**: pure callus ledger fn in `lib/stats.ts` (+ tests — idempotent consumption is a test
  case); ring stroke width on HoloFigure nodes; DetailView stat strip gains "calluses held".
- **Effort** M · **Risk**: low; deterministic by design.

### 4. Close-today ceremony
- **Thesis**: the day deserves an ending. Press-and-hold on the "Day total" rule (800ms) seals
  today's plate — stamp animation (already built: `stamp-in`), date freezes into the record, a
  mono colophon notes how it closed ("sealed at 22:41" / "sealed unkept"). No app has a closing
  ceremony; products shipping "End the Day" flows are emerging (Mindsera, Clock Out, NightClose).
- **Seams**: App.tsx? No — TodayView footer + new `closedDays` concept in local persistence
  (extend `PulseDB` v2 while at it); reuse Button press-hold pattern; Hapticts? none (web).
- **Effort** S · **Risk**: cosmetic only, no locked behavior — reopening a sealed day is a ledger
  strike-through, never a block.

## M-TIER — P11 "Clockwork" (time becomes data)

### 5. Check-ins embroidered with hour (log v2 migration)
- **Thesis**: today `HabitLog` is a date string; real rhythm requires time-of-day. Version the
  log (`version: 2`) with lazy migration: strings stay strings, numbers extend with optional
  `hour` and `minute` captured at check-in.
- **Unlocks**: (a) **typographic marginalia** per habit — deterministic facts set as research notes
  ("strongest hour 06:40 ±22min · 12 of 19 days", "best week Jun 02–08 · 6 of 6") — no AI wording,
  the Spotify-Wrapped lesson applied (Wrapped's 2024 AI-score flop vs 200M who read raw facts);
  (b) **circadian figure** — the hologram's idle tempo warms toward this habit's habitual hour;
  (c) the "sealed at" colophon in #4.
- **Seams**: `src/api/types.ts` + `migrate()` in `local.ts:79`; `todayKey()` in `lib/date.ts` stays
  the boundary — hour lives alongside, never inside it; stats fns for "strongest hour ±spread".
- **Effort** M · **Risk**: migration tests required (old localStorage reads cleanly).

### 6. Time-travel simulation tray (dev/demo instrument)
- **Thesis**: the simulator is already the app's demo; make it an *instrument*. In Settings →
  Developer: scrub the calendar ±90 days, press "seed a relapse" (skip 5 days on a habit), watch
  decay/posture/calluses respond live. Also the freeze mechanism for visual tests and the fastest
  possible product demo ("hand anyone this app, they see it fail and heal in ten seconds").
- **Seams**: `sim.ts` grows `clockOffsetDays` + chaos seeds; `todayKey()` consults offset; Settings
  section; zero production data touched.
- **Effort** M · **Risk**: low; it is the honest version of fake "demo modes".

## L-TIER — P12 "Credible craft" (engineering depth + artifact)

### 7. View-transition figure morph (ledger ↔ studio)
- **Thesis**: ONE hologram traveling between routes — the figure doesn't reload, it *transfers*:
  shared-element morph with a brief ember dissolve. The most credibility-per-effort item on this
  list: View Transitions API is Baseline (Chrome 111+, Safari 18+, Stable Firefox 144 — Oct 2025);
  React 19.3 ships native `<ViewTransition>`; fallback is a no-op.
- **Seams**: App.tsx route shell; `view-transition-name` on HoloFigure container; avoid typed
  transitions (Firefox lacks `addTransitionType`); reduced-motion skip.
- **Effort** S–M · **Risk**: near zero with the no-op fallback pattern.

### 8. Local-first spine — Dexie + IndexedDB + cross-tab + PWA shell
- **Thesis**: the ledger becomes a pocket object. IndexedDB (via Dexie) replaces the
  localStorage single-string; `liveQuery`/BroadcastChannel gives cross-tab sync for free; a thin
  manifest + service worker makes it installable and offline.
- **Scope discipline**: NO CRDT. Yjs/Automerge is scope creep for a single user (Automerge froze
  6.4s on Android in a 2026 field report; Dexie's BroadcastChannel path covers tabs at zero cost).
  Second-device sync is a "later" via the existing import/export.
- **Seams**: swap `createLocalApi()` internals only — `habits.ts` one-line flip stays; `local.test.ts`
  (14 tests) ports to Dexie fake-indexed; Settings Connectivity row gains "cross-tab · offline".
- **Effort** M · **Risk**: Dexie test harness + storage-key versioning.

### 9. Visual regression — Playwright `toHaveScreenshot`
- **Thesis**: the craft (figure, grain, ink) becomes a guarded asset. Low overhead; freeze
  animation through the time-travel tray; focus-visible landmarks through the design.
- **Effort** S (1–2h) · **Risk**: flake from the animated figure — solved by its own tray.

### 10. The year plate (artifact export)
- **Thesis**: take-home object. One button prints the year as a plate: 365-cell grid, figure-state
  montage, marginalia colophon — SVG/PNG **download**, generative but deterministic (your numbers,
  your ink). A month punch-card variant for printing on paper.
- **Evidence**: Wrapped-class artifacts create the strongest organic spread in personal software;
  the lesson of the 2024 Wrapped flop: facts, not AI prose.
- **Seams**: new studio section (seam "new studio section") reusing the grid + fonts; `canvas`
  or SVG serialization; download blob.
- **Effort** M · **Risk**: rendering-to-image quirks cross-browser (SVG width units).

### 11. Ember sound design (garnish, last)
- **Thesis**: one gesture-unlocked AudioContext; a 200ms ember tick pitch-jittered ±cents on
  check-in (momentum-scaled), a barely-audible hum chord at a 100% day. OFF by default, muted
  with reduced-motion and hidden tabs (MDN autoplay/battery best practices).
- **Effort** S–M · **Risk**: tastefulness only; nothing architectural.

## Explicitly rejected (generic — rejected so nobody re-adds them)
- **Push reminders / nags** — research shows reminder-dependency actively blocks automaticity;
  the always-lit figure IS the reminder.
- **Badges / XP / levels** — reward decay, streak-creep, juvenile complaints in every review.
- **Social / streak challenges** — leaderboards don't sustain motivation; the private print-masthead
  ledger's identity is *not* being a social platform.
- **AI coach chat** — note honesty is this project's value; deterministic marginalia does the job.
- **⌘K command palette** — 2024-trendy-generic; keyboard-first can live in the row-number keys.
- **CRDT multi-device sync now** — scope creep without demo payoff (revive for real multi-device).
- **Pomodoro timer, calendar view, "charts"** — commodity features every tracker ships.

## Recommended order
1. **P10 (soul)**: #1 ember decay → #3 callus → #2 posture → #4 close-today. All deterministic,
   all test-covered via `lib/stats.ts`, all rendered on the existing figure. One phase, one theme.
2. **P11 (clock)**: #5 hour-migration (gates everything time-based) → #6 sim tray → marginalia.
3. **P12 (craft)**: #7 morph → #8 local-first → #9 visual regression → #10 year plate → #11 sound.

Each phase keeps the gates: typecheck 0 · 39+ tests · build budget (last: 358.54 KB / 111.31 KB gz).
