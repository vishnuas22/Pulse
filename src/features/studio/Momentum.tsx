/* Momentum — the reference-2 deck, fed by the real ledger: a 30-day
   "route" of check-ins, split bars per ritual, and a stat rail. */

import { useEffect, useMemo, useRef } from "react";
import { Clock3, Flame, HeartPulse, MapPin } from "lucide-react";
import type { Habit, HabitId, DateKey } from "@/api/types";
import { currentStreak, checkedLast7 } from "@/lib/stats";
import { lastNDays, todayKey } from "@/lib/date";
import { Spring, useReveal } from "./physics";

interface MomentumProps {
  habits: Habit[];
  logs: Record<HabitId, DateKey[]>;
}

const CHART_W = 640;
const CHART_H = 190;
const PAD_X = 26;
const PAD_TOP = 26;
const PAD_BOTTOM = 30;

export function Momentum({ habits, logs }: MomentumProps) {
  const active = useMemo(() => habits.filter((h) => h.archivedAt === null), [habits]);
  const today = todayKey();
  const days = useMemo(() => lastNDays(today, 30), [today]);

  const perDay = useMemo(
    () => days.map((d) => active.reduce((n, h) => n + ((logs[h.id] ?? []).includes(d) ? 1 : 0), 0)),
    [days, active, logs],
  );
  const maxDay = Math.max(1, ...perDay);
  const totalCheckins = useMemo(
    () => active.reduce((n, h) => n + (logs[h.id]?.length ?? 0), 0),
    [active, logs],
  );
  const bestStreak = useMemo(
    () => active.reduce((n, h) => Math.max(n, currentStreak(logs[h.id] ?? [], today)), 0),
    [active, logs, today],
  );
  const weekDone = active.reduce((n, h) => n + checkedLast7(logs[h.id] ?? [], today), 0);
  const weekTarget = active.reduce((n, h) => n + h.targetPerWeek, 0);
  const weekPct = weekTarget === 0 ? 0 : Math.round((weekDone / weekTarget) * 100);

  /* smooth path (catmull-rom → bezier) */
  const points = perDay.map((v, i) => ({
    x: PAD_X + (i * (CHART_W - PAD_X * 2)) / 29,
    y: CHART_H - PAD_BOTTOM - (v / maxDay) * (CHART_H - PAD_TOP - PAD_BOTTOM),
  }));
  const path = useMemo(() => {
    if (points.length < 2) return "";
    let d = `M${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
    for (let i = 0; i < points.length - 1; i += 1) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];
      const c1x = p1.x + (p2.x - p0.x) / 6;
      const c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6;
      const c2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return d;
  }, [perDay, maxDay]); // eslint-disable-line react-hooks/exhaustive-deps

  const bandRef = useRef<HTMLDivElement | null>(null);
  const bandY = useRef<Spring | null>(null);
  useEffect(() => {
    const el = bandRef.current;
    if (!el) return;
    bandY.current = new Spring(0, { stiffness: 40, damping: 13 });
    const spring = bandY.current;
    const img = el.firstElementChild as HTMLElement | null;
    const render = () => {
      if (img) img.style.transform = `translateY(${spring.value.toFixed(1)}px) scale(1.08)`;
    };
    const uf = spring.onFrame(render);
    let raf = 0;
    let pendingScroll = true;
    const measure = () => {
      pendingScroll = false;
      const r = el.getBoundingClientRect();
      const mid = r.top + r.height / 2 - window.innerHeight / 2;
      const target = Math.max(-34, Math.min(34, -mid * 0.08));
      spring.setTarget(target);
    };
    const onScroll = () => {
      if (!pendingScroll) {
        pendingScroll = true;
        raf = requestAnimationFrame(measure);
      }
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
      uf();
    };
  }, []);

  const headRef = useReveal<HTMLDivElement>(0.12);
  const railRef = useReveal<HTMLDivElement>(0.15);
  const splitsRef = useReveal<HTMLDivElement>(0.1);

  const statRows = [
    { icon: MapPin, label: "ACTIVE RITUALS", value: String(active.length), sub: "tracked in the ledger" },
    { icon: HeartPulse, label: "ALL-TIME CHECK-INS", value: String(totalCheckins), sub: "every rep since day one" },
    { icon: Flame, label: "LONGEST STREAK", value: `${bestStreak}d`, sub: "unbroken to this morning" },
    { icon: Clock3, label: "WEEKLY RHYTHM", value: `${weekPct}%`, sub: `${weekDone} of ${weekTarget} reps this week` },
  ];

  return (
    <section id="studio-momentum" className="relative bg-[#0a0a08] px-6 pb-32 pt-28">
      <div className="mx-auto w-full max-w-[1080px]">
        <p className="mono-label text-[11px] text-[#EC6517]">04 — MOMENTUM</p>
        <h2 ref={headRef} className="mt-4 max-w-[520px] font-serif text-[44px] leading-[1.06] text-[#F1EDE4] sm:text-[56px]">
          The route your repetition has carved.
        </h2>

        {/* duotone band with scroll parallax */}
        <div ref={bandRef} className="studio-reveal mt-12 overflow-hidden rounded-[28px] border border-[#26251f]">
          <div className="relative aspect-[21/9]">
            <img
              src="https://images.unsplash.com/photo-1502904550040-7534597429ae?auto=format&fit=crop&w=2400&q=80"
              alt="Runners on an amber track, seen from above"
              className="size-full object-cover [filter:grayscale(0.35)_sepia(0.35)_saturate(1.9)_contrast(1.05)] will-change-transform"
            />
            <div className="absolute inset-0 bg-[#EC6517]/25 mix-blend-multiply" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a08]/70 via-transparent to-[#0a0a08]/30" />
            <p className="absolute bottom-5 left-6 max-w-[280px] font-serif text-[20px] leading-snug text-[#FFF3E8]">
              Pace is personal. Cadence is honest.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[300px_1fr]">
          {/* stat rail */}
          <div ref={railRef} className="studio-reveal flex flex-col rounded-[24px] border border-[#26251f] bg-[#111110]">
            {statRows.map((row, i) => {
              const Icon = row.icon;
              return (
                <div key={row.label} className={`flex items-start gap-4 p-5 ${i > 0 ? "border-t border-[#23221c]" : ""}`}>
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-[#2c2b24] text-[#C9E96E]">
                    <Icon size={14} strokeWidth={1.7} />
                  </span>
                  <div>
                    <p className="mono-label text-[10px] text-[#8a857a]">{row.label}</p>
                    <p className="mt-1 font-sans text-[26px] font-medium leading-none text-[#F1EDE4] tabular-nums">{row.value}</p>
                    <p className="mt-1.5 text-[12px] leading-snug text-[#6d675c]">{row.sub}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* route card */}
          <div className="rounded-[24px] border border-[#26251f] bg-[#111110] p-6">
            <div className="flex items-baseline justify-between">
              <p className="mono-label text-[10px] text-[#8a857a]">CHECK-INS — LAST 30 DAYS</p>
              <p className="font-mono text-[11px] text-[#C9E96E] tabular-nums">
                {perDay[perDay.length - 1]} today
              </p>
            </div>
            <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="mt-4 w-full" role="img" aria-label="Check-ins per day over the last 30 days">
              <defs>
                <linearGradient id="m-stroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#6d8f28" />
                  <stop offset="100%" stopColor="#E9FF9E" />
                </linearGradient>
                <linearGradient id="m-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C9E96E" stopOpacity="0.16" />
                  <stop offset="100%" stopColor="#C9E96E" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0, 1, 2, 3].map((i) => {
                const y = CHART_H - PAD_BOTTOM - (i / 3) * (CHART_H - PAD_TOP - PAD_BOTTOM);
                return (
                  <g key={i}>
                    <line x1={PAD_X} x2={CHART_W - PAD_X} y1={y} y2={y} stroke="#26251f" strokeWidth="1" strokeDasharray={i === 0 ? "0" : "2 5"} />
                    <text x={PAD_X - 8} y={y + 3} textAnchor="end" fontSize="8" fill="#6d675c" className="font-mono">
                      {Math.round((maxDay * i) / 3)}
                    </text>
                  </g>
                );
              })}
              {path ? (
                <>
                  <path d={`${path} L${points[points.length - 1].x.toFixed(1)} ${CHART_H - PAD_BOTTOM} L${points[0].x.toFixed(1)} ${CHART_H - PAD_BOTTOM} Z`} fill="url(#m-area)" opacity="0.6" />
                  <path d={path} fill="none" stroke="url(#m-stroke)" strokeWidth="1.8" strokeLinecap="round" />
                </>
              ) : null}
              {points.length > 0 ? (
                <g>
                  <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="9" fill="#E9FF9E" opacity="0.14">
                    <animate attributeName="r" values="7;13;7" dur="2.6s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.18;0.04;0.18" dur="2.6s" repeatCount="indefinite" />
                  </circle>
                  <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="3.4" fill="#F4FFC8" />
                </g>
              ) : null}
            </svg>
            <div className="mt-2 flex justify-between font-mono text-[9px] tracking-[0.14em] text-[#6d675c]">
              <span>{days[0]}</span>
              <span>{days[14]}</span>
              <span>{days[days.length - 1]}</span>
            </div>
          </div>
        </div>

        {/* splits */}
        <div ref={splitsRef} className="studio-reveal mt-6 rounded-[24px] border border-[#26251f] bg-[#111110] p-6">
          <div className="flex items-baseline justify-between">
            <p className="mono-label text-[10px] text-[#8a857a]">SPLITS BY RITUAL</p>
            <p className="text-[11px] text-[#6d675c]">streak · this week</p>
          </div>
          <ol className="mt-4">
            {active.length === 0 ? (
              <li className="py-6 text-[13px] text-[#6d675c]">The ledger is empty — no splits to score yet.</li>
            ) : null}
            {active.map((h, i) => {
              const done7 = checkedLast7(logs[h.id] ?? [], today);
              const streak = currentStreak(logs[h.id] ?? [], today);
              const w = Math.min(100, Math.round((h.targetPerWeek === 0 ? 0 : Math.min(1, done7 / h.targetPerWeek)) * 100));
              return (
                <li key={h.id} className={`flex items-center gap-4 py-3.5 ${i > 0 ? "border-t border-[#1c1b18]" : ""}`}>
                  <span className="w-5 font-mono text-[10px] text-[#6d675c]">{String(i + 1).padStart(2, "0")}</span>
                  <span className="w-40 shrink-0 truncate text-[13px] text-[#F1EDE4]">{h.name}</span>
                  <span className="hidden w-16 shrink-0 sm:block">
                    <span className={`inline-block rounded-full px-2 py-0.5 font-mono text-[10px] tabular-nums ${streak > 0 ? "bg-[#C9E96E]/12 text-[#C9E96E]" : "bg-[#EC6517]/12 text-[#EC8A5A]"}`}>
                      {streak === 0 ? "no streak" : `${streak}d`}
                    </span>
                  </span>
                  <span className="relative h-[5px] flex-1 overflow-hidden rounded-full bg-[#24231e]">
                    <span className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#6d8f28] to-[#C9E96E]" style={{ width: `${w}%` }} />
                  </span>
                  <span className="w-24 shrink-0 text-right font-mono text-[11px] text-[#8a857a] tabular-nums">
                    {done7}/{h.targetPerWeek} · wk
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
