# Pulse — Product & Engineering Plan

A frontend-only React CRUD application. No backend, by design: this is built
so the UI, state, and data layers are finished now, and in your backend class
you only write one small file (`src/api/habits.http.ts`) and everything keeps
working. The architecture is the lesson.

---

## 0. Summary and ground rules

**Product.** Pulse is a quiet habit ledger. You record habits, check in on
them daily, and see streaks and a history grid. One screen to *use* it, one
screen to *manage* it, one detail view, one settings panel.

**Stack.** Vite 7 · React 19 · TypeScript (strict) · Tailwind CSS 4 with CSS
design tokens · react-router 7 · lucide-react · self-hosted fonts. Runtime
dependencies: 7 (react, react-dom, react-router, lucide-react + 3 font
packages). No state library, no form library, no date library, no animation
library in v1 — each of those is a later upgrade once you feel the problem
they solve.

**Ground rules (binding).**

1. No backend. Every read/write goes through exactly one module,
   `src/api/`, backed by localStorage with simulated network latency and
   simulated failures. Components never touch `localStorage` directly.
2. The UI must not know the data is local. Loading spinners, error states,
   and optimistic rollbacks are implemented for real — the app stays honest
   the day a server replaces localStorage.
3. TypeScript strict mode from line one. Types are documentation.
4. Design tokens in section 7 are law. Section 15 is the review gate every
   phase must pass.

---

## 1. Product definition

### 1.1 Core concepts

- **Habit** — the thing you maintain. Name, optional note, one accent color
  from a fixed swatch set, weekly target, created date, archived date.
- **Check-in (log)** — one row marking a habit done on one date. This is the
  second entity, and it is what makes CRUD practice real: the same UI writes
  to two tables and deletes children along with a parent.

### 1.2 Views

| View | Route | Purpose |
|---|---|---|
| Today | `/` | The daily ritual: due habits, check/uncheck, day summary |
| Manage | `/habits` | Full ledger: search, sort, filter, edit, archive, delete |
| Habit detail | `/habits/:id` | History grid, streak stats, edit/archive/delete |
| Settings | `/settings` | Export/import, demo data reset, network simulation |

Create and edit are **modals**, not pages — they preserve the context the
user was in. Deletion is a confirm dialog, never an inline accident.

### 1.3 Out of scope (write it down, respect it)

Auth, multi-user, real-time sync, server persistence, dark mode (light-only,
print-like — dark mode done badly is exactly the look we refuse), i18n,
mobile app, drag-and-drop reorder. Drag reorder returns after buttons win.

---

## 2. Data model

```ts
// src/api/types.ts
export type HabitId = string;          // crypto.randomUUID()
export type DateKey = string;          // 'YYYY-MM-DD' — compare-safe, no Date objects in state

export interface Habit {
  id: HabitId;
  name: string;                        // 1–64 chars, trimmed, unique per user eye
  notes?: string;                      // ≤ 280 chars
  accent: AccentKey;                   // 'ember' | 'moss' | 'honey' | 'pine' | 'graphite'
  targetPerWeek: number;               // 1–7, default 7 (daily) — streak logic v1 uses daily
  createdAt: string;                   // ISO 8601
  archivedAt: string | null;
}

export interface HabitLog {
  habitId: HabitId;
  date: DateKey;                        // uniqueness: (habitId, date)
}

export interface PulseDB {
  version: 1;
  habits: Habit[];
  logs: HabitLog[];
}
```

**Invariants.** No orphan logs (deleting a habit deletes its logs). Logs are
kept sorted by date. `archivedAt !== null` habits are excluded from Today but
visible in Manage under a separate small section.

**Derived stats (pure functions in `src/lib/stats.ts`, fully unit-tested).**

- `streak(habit, logs)`: longest run of consecutive dates ending today or
  yesterday. Today not yet checked in does *not* break a streak before
  midnight — this business rule is where juniors trip; it gets its own tests.
- `best: number`, `checkedThisWeek: number` vs `targetPerWeek`, `completion7d`
  as a percentage rendered with tabular numerals.
- `history(last 120 days)` → 7-day-row grid for the heatmap.

---

## 3. The API contract — the heart of the plan

Everything above this line (UI, hooks) exists once. Below this line there
are two interchangeable implementations.

```ts
// src/api/habits.ts
export interface HabitApi {
  listHabits(): Promise<Habit[]>;
  getHabit(id: HabitId): Promise<Habit>;
  createHabit(input: NewHabit): Promise<Habit>;
  updateHabit(id: HabitId, patch: HabitPatch): Promise<Habit>;
  deleteHabit(id: HabitId): Promise<DeletedHabit>;   // returns habit + logs for client-side undo

  listLogs(habitId: HabitId): Promise<DateKey[]>;
  listAllLogs(): Promise<Record<HabitId, DateKey[]>>;  // one round-trip for the whole ledger
  setLog(habitId: HabitId, date: DateKey): Promise<void>;     // idempotent upsert
  clearLog(habitId: HabitId, date: DateKey): Promise<void>;   // idempotent
}

export const habitApi: HabitApi = createLocalApi(); // v0 — swap to createHttpApi(url) in class
```

```ts
// src/api/error.ts — the SAME shape fetch() errors get later, so UI code never changes
export class ApiError extends Error {
  status: number;   // future: maps to real HTTP status
  code: string;     // 'not_found' | 'validation' | 'conflict' | 'network' | 'unknown'
}
```

### 3.1 Fake implementation details (`createLocalApi`)

- Storage key `pulse.v1`, envelope `{ version, habits, logs }`.
- **Simulated latency** (200–400 ms) and a **fail-next-N-requests toggle** in
  Settings, so every loading/error path in the UI is reachable and testable.
- A single write queue (a `Promise` chain) so overlapping mutations never
  lose writes; `structuredClone` on read/write so callers can't mutate
  storage by reference — both are real backend problems practiced early.
- A `migrate()` hook keyed on `version` so schema changes are a principled
  step, not an ad-hoc patch.

### 3.2 Future REST contract (what your class will build)

| api method | HTTP | Path | Success | Errors |
|---|---|---|---|---|
| listHabits | GET | `/api/habits` | 200 `Habit[]` | 500 |
| getHabit | GET | `/api/habits/:id` | 200 | 404 |
| createHabit | POST | `/api/habits` | 201 `Habit` | 400, 409 name conflict |
| updateHabit | PATCH | `/api/habits/:id` | 200 | 400, 404 |
| deleteHabit | DELETE | `/api/habits/:id` | 200 `{ habit, logs }` | 404 |
| listLogs | GET | `/api/habits/:id/logs` | 200 `DateKey[]` | 404 |
| listAllLogs | GET | `/api/logs` | 200 `Record<id, DateKey[]>` | — |
| setLog | PUT | `/api/habits/:id/logs/:date` | 204 | 400 |
| clearLog | DELETE | `/api/habits/:id/logs/:date` | 204 | 404 |

Error envelope: `{ "error": { "code": "not_found", "message": "..." } }`.
Swap cost: one line in `src/api/habits.ts` plus a Vite dev proxy — zero
component changes. That is the entire point of the plan.

---

## 4. State and data flow

```
<HabitsProvider>            // one context: habits, logs, status, mutations
  └─ calls api (await)      // the ONLY module that knows "persistence"
      └─ persists to localStorage (now) or HTTP (later: same interface)
UI (routes/components)      // reads via useHabits(); never reads storage directly
```

- No Redux, no Zustand in v1. One reducer inside `HabitsProvider` holds
  `habits`, `logs`, `status` (`idle | loading | ready | error`), and one
  `mutatingId` per habit for per-row pending states.
- **UI states contract — every list view renders all four states:**
  `loading` (inline spinner, not skeletons) · `empty` (authored empty state,
  the feature's most designed moment) · `error` (message + Retry button) ·
  `content`.
- **Mutation ladder** (the hidden curriculum):
  - v1 *pessimistic*: mutate → show pending → await api → refetch list.
    Boring, correct, always consistent.
  - v2 *optimistic with rollback*: update UI first, on failure roll back and
    toast. Implemented for check-in/uncheck because it should feel instant.
  - v3 (after backend class): adopt TanStack Query and compare — it automates
    exactly the cache/cancellation problems you felt in v1. Rebuild the end
    result with the same UI.

Undo delete is a client-side toast with an 8 s window (captures the snapshot
and re-creates it). Honest wording: "Can't be undone after this."

---

## 5. Views and interaction

Routes from react-router 7 (library mode). Compositions: a single centered
column, max width 720 px, generous top margin, one hairline rule under the
header. No hero sections, no cards-in-cards.

```
Today (route /)                              Manage (route /habits)
┌──────────────────────────────────────┐    ┌──────────────────────────────────────┐
│ PULSE        Today · Manage          │    │ PULSE        Today · Manage    + New │
│ (12px mono label row)                │    │                                      │
│                                      │    │ Search habits…            Sort: Name ▾│
│ Friday, 23 October                   │    │ ───────────────────────────────────  │
│ 5 of 7 checked in — week 43          │    │ ○ meditate                  ▸ ⋯      │
│ ───────────────────────────────────  │    │ ○ morning run              ▸ ⋯      │
│ ○ meditate                 32 streak │    │ ○ read 20 pages            ▸ ⋯      │
│ ○ morning run              12 streak │    │ …                          (actions) │
│ ○ read 20 pages             3-day gap│    │                                      │
│ ● already done today (muted)         │    │ Archived (2) ▾                       │
│                                      │    │                                      │
└──────────────────────────────────────┘    └──────────────────────────────────────┘
```

**Keyboard contract.** `n` opens the new-habit modal (when not typing in a
field), `/` focuses search, `Enter` submits a form, `Esc` cancels and returns
focus to the trigger button, `Space` on a row toggles the check-in.

---

## 6. CRUD map — the table to keep in your head

| Verb | UI affordance | Api call | Ux detail |
|---|---|---|---|
| Create | `+ New habit` → modal, validated form | `createHabit` | Validate before enabling submit; new row fades in 180 ms (no confetti) |
| Read | Today list · Manage table · Detail page · search/sort/filter | `listHabits`, `getHabit`, `listLogs` | Empty, loading, error states first-class |
| Update | Edit modal; row check/uncheck; archive/unarchive | `updateHabit`, `setLog`, `clearLog` | Check-in is optimistic; archive = soft update, delete is the bad path |
| Delete | Row menu → confirm dialog naming the cost | `deleteHabit` | “Delete ‘Morning run’? This removes its 132 check-ins. Can’t be undone.” + undo toast |

Deleting a habit must remove its logs (cascade) — the first real relational
operation you practice, testable in the fake api exactly as in SQL.

---

## 7. Design system

**Direction:** a print-like ledger with instrument-panel numerals. Inkwave
neutrals on warm paper, hairline rules, exactly one accent. The restraint is
the luxury; the mono tabular figures are the instrument.

### 7.1 Color tokens (`src/ui/tokens.css`)

| Token | Value | Use |
|---|---|---|
| `--bg` | `#F6F5F1` | page background (warm paper) |
| `--surface` | `#FFFFFF` | modals, table rows on hover |
| `--ink` | `#1A1918` | primary text — ~15.5:1 on bg (AAA) |
| `--ink-2` | `#57534E` | secondary text — ~7.4:1 on surface |
| `--ink-3` | `#A8A29E` | disabled/hairline text only, never body |
| `--hairline` | `#E7E5E1` | 1 px borders and rules |
| `--accent` | `#BF3B1B` | cinnabar ink — one color, ~5.0:1 on paper (AA) |
| `--accent-hover` | `#A43216` | pressed/active states |

Habit swatch set (deliberate, muted, non-default — no blues/purples, no neon):
ember `#BF3B1B` · moss `#5F6D22` · honey `#96690A` · pine `#2F5D50` ·
graphite `#44474B`. Swatches are small 8 px dots; the habit *name* always
renders in `--ink`.

History grid ramp (accent mixed into paper, 5 steps): `#EFDFD7`, `#E6C1B5`,
`#DC9B8A`, `#CE6F57`, full `#BF3B1B`. Zero is `--hairline` fill. No rainbow.

### 7.2 Typography (self-hosted via `@fontsource-*` — no CDN fonts)

| Role | Face | Notes |
|---|---|---|
| Display / dates / empty states | **SF Pro Display** (native on Apple devices) | 600, tracking −0.005…−0.015em — the apple.com hero voice |
| UI / body / forms | **SF Pro Text** (system) → **Roboto Variable** (bundled) elsewhere | 400/500/600, body tracking −0.006em class |
| Data / labels / streaks | **IBM Plex Mono** | 11–12 px, `tabular-nums`, machine voice |

Scale: `12 · 13 · 15 · 17 · 22 · 34 · 40 · 48 · 56` px (display). Display line-height
1.02–1.08 with −0.015em at hero sizes; body 1.47. `+0.08em` on 11 px uppercase mono
labels; Apple's optical tracking curve: smaller type opens up, larger tightens.

### 7.3 Geometry, elevation, motion

- Spacing: 4 px base — `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64`.
- Radius: 8 px inputs/buttons · 10 px cards/modals · 999 px pills. Nothing rounder.
- Borders: 1 px `--hairline` first; shadows only when something floats —
  rest `0 1px 2px rgb(26 25 24 / .06)`, raised `0 8px 24px rgb(26 25 24 / .10)`.
  No colored shadows, no glow.
- Motion: `120 / 180 / 240 ms`, `cubic-bezier(.2, 0, 0, 1)`, opacity and
  transform only. Modals enter at `scale(.98) → 1`. Everything honors
  `prefers-reduced-motion`. Toasts slide 8 px, fade 180 ms. That is the
  whole choreography — no libraries needed.
- Icons: **lucide-react only**, 1.5 px stroke, sizes 16/20. Full ban:
  emoji anywhere (UI, copy, toasts, empty states, title attribute), gradient
  fills, icon packs mixed. Copy: sentence case, no exclamation marks, no
  cheerleading ("Great job!"). The app talks like a instrument label.

---

## 8. Component inventory

| Component | Key props | Purpose |
|---|---|---|
| `Button` | variant `primary/outline/ghost/danger`, size `sm/md` | one button to rule them all |
| `IconButton` | icon, label (aria), variant | rows and menus |
| `Field` | label, hint, error | wraps Input/NumberField; wires `aria-describedby`, `aria-invalid` |
| `Input`, `Textarea`, `NumberField` | — | native elements, styled only |
| `Modal` | open, onClose, title | focus trap, Esc, restore trigger focus, `aria-modal` |
| `ConfirmDialog` | title, body, onConfirm | destructive confirm, danger button |
| `ToastProvider` / `Toast` | kind `info/danger`, action (Undo) | hand-rolled, ~80 lines, teaches portals + timers |
| `HabitRow` | habit, streak, onToggle, onEdit, onDelete | the one row everyone touches |
| `HabitForm` | habit? | both create & edit; validation lives here |
| `HistoryGrid` | habitId | 17 columns × 7 rows heatmap |
| `StatStrip` | habit stats | mono tabular numerals |
| `SearchInput`, `SortSelect` | — | Manage toolbar |
| `EmptyState` | title, body, action | the designed moment |
| `DevControls` | latency, failNext | Settings-only, ships hidden in prod build gate |

Feature components live in `src/features/habits/`, primitives in `src/ui/`.
One shared `cn()` helper (clsx), no tailwind-merge in v1.

---

## 9. Accessibility contract

- Modal focus trap + focus return; dialog announced via `aria-modal` and title.
- Every icon-only button has an `aria-label`; tables announce as lists.
- Forms: bound labels, `aria-invalid` + `role="alert"` errors, error summary
  on failed submit, Enter submits, Esc cancels.
- Check-in is a `button` with `aria-pressed`, not a div with onClick.
- Minimum hit target 40 px; focus ring `2px solid var(--ink)` offset 2 px —
  visible, not pretty-noise.
- Contrast verified per section 7 table with a checker tool at build time.

---

## 10. Persistence engineering

- Envelope `{ version, habits, logs }` under key `pulse.v1`; writes go
  through the api queue; reads are defensively cloned.
- Migration pattern documented now: `migrate(db) → db` array indexed by
  version. First schema change will use it.
- Settings: export full JSON (download), import JSON (validated, versioned),
  reset to seeded demo data (marked clearly as demo).
- Multi-tab sync via `storage` event: stretch goal, one small effect in the
  provider, and it demos beautifully when a real backend finally handles it.

---

## 11. Testing and QA

Vitest + Testing Library. The test suite is the study guide.

1. `stats.ts`: streaks — normal run, end-today, end-yesterday unchecked,
   gap-resume, empty logs, long runs.
2. `api/local`: create/update/delete round-trip; cascade delete removes
   logs; idempotent `setLog`; latency and failure simulation via fake timers.
3. `HabitForm`: validation paths, submit enablement.
4. Provider: loading → ready; error → retry; optimistic rollback on failure.
5. Flows: create habit → check in → edit name → undo delete, end-to-end.

Manual gates per phase: keyboard-only walkthrough of every CRUD path; Lighthouse
a11y ≥ 95; zero console errors; reload persistence check; contrast audit.

---

## 12. Roadmap

| Phase | Content | Est. | Done when |
|---|---|---|---|
| P0 | `git init`, scaffold, tokens, fonts, shell (header/rule/routes) | 3–4 h | App renders from tokens alone, zero scaffold-blue |
| P1 | api types + local api + provider + four UI states | 4–5 h | Features work against a fake server with latency |
| P2 | Today view + create + edit + check/uncheck (optimistic) | 8–10 h | Daily ritual usable, keyboard complete |
| P3 | Manage view: search/sort/filter, archive, stats | 6–8 h | Whole ledger navigable, per-row pending states |
| P4 | Delete cascade + confirm + undo toast; Detail + HistoryGrid + Settings (export/import/sim) | 6–8 h | All 8 api methods exercised by UI |
| P5 | Test suite, a11y pass, contrast audit, README | 4–6 h | Gates in §11 green |

~30–40 h total — two weekends of honest work. Commit per phase; every commit
passes the Section 15 gate.

---

## 13. Bridge to your backend class

What you'll add to *only* `src/api/`:

1. Write `createHttpApi(url): HabitApi` using `fetch`, mapping HTTP statuses
   to `ApiError.status/code` — the error class already exists.
2. In `habits.ts` switch the export line to the HTTP implementation.
3. `vite.config.ts`: dev proxy `'/api'` → `http://localhost:4000` (no CORS pain).
4. Server sketch for class (will compile against the §3.2 table):

```ts
app.get('/api/habits', (req, res) => res.json(db.habits));
app.post('/api/habits', validate, (req, res) => { /* 201, return habit */ });
app.patch('/api/habits/:id', validate, (req, res) => { /* 200 */ });
app.delete('/api/habits/:id', (req, res) => { /* 204 + cascade */ });
app.put('/api/habits/:id/logs/:date', (req, res) => { /* 204, idempotent */ });
```

Lecture-topic mapping: REST routes ↔ api methods used verbatim; validation ↔
`HabitForm` schema you already wrote; cascade delete ↔ invariant in §2;
latency/caching/auth ↔ the sim panel plus TanStack Query (v3) later.

---

## 14. Decision log

| Decision | Alternatives rejected | Why |
|---|---|---|
| localStorage behind an `HabitApi` interface | in-memory store | survives reloads; forces the same async patterns as HTTP |
| No state library in v1 | Zustand/Redux/Context-only everywhere | one provider suffices; you learn the cache problem before reaching for TanStack Query |
| Hand-rolled forms | react-hook-form + zod | two forms — raw control teaches more; upgrade path documented |
| `<DateKey>` strings over Date objects | date-fns everywhere | compare/serialize trivially; no timezone UI bugs; pure stats are testable |
| Modals for create/edit | dedicated pages | context preserved; focus management is a skill worth having |
| Archive (soft) + Delete (hard cascade) | soft-delete only | both semantics practiced, honest wording in UI |
| Optimistic only for check-in | optimistic everywhere | dopamine where it matters; consistency everywhere else |
| Tailwind 4 + CSS var tokens | vanilla CSS / styled-components | speed without giving up a token system |
| Self-hosted Instrument trio | Google Fonts CDN / Inter-everything | offline, deterministic, and not the generic look |
| `PUT /logs/:date` for check-ins | `POST /logs` with a body | idempotency is a first-class lesson |

---

## 15. Anti-slop gate (checks before every phase)

- [ ] No gradients anywhere; no glassmorphism/blur; no neon, no glow.
- [ ] One accent color total; all other color is ink/paper.
- [ ] No default blues/violets; no Tailwind default palette hues.
- [ ] Icons from lucide only; **zero emoji** anywhere in the product.
- [ ] No generated imagery at all — the product is typographic and interactive.
- [ ] Tabular numerals for every number shown in data context.
- [ ] Light mode only; print-like.
- [ ] Loading = spinner, never shimmer skeletons; no confetti, no bouncy springs.
- [ ] Copy: terse, sentence case, no exclamation marks, no marketing tone.
- [ ] Every empty state is designed; every list has all four UI states.
- [ ] Contrast table (§7.1) verified with a checker.
- [ ] The app still feels honest with the failure sim turned on.
