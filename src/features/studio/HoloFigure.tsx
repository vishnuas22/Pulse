/* The Vision — a hologram figure whose light reflects the real ledger.
   Nodes are actual habits: filled ring = checked in today; click to toggle.
   The figure breathes on a sine; the whole group leans a few pixels toward
   the pointer with spring physics. */

import { useEffect, useMemo, useRef, useState } from "react";
import type { Habit, HabitId, DateKey } from "@/api/types";
import { todayKey } from "@/lib/date";
import { useSpring, useSpringNumber } from "./physics";

interface HoloFigureProps {
  habits: Habit[];
  logs: Record<HabitId, DateKey[]>;
  pending: HabitId[];
  onToggle: (id: HabitId) => void;
}

/* --- geometry (viewBox 0 0 420 660), symmetric around x=210 --- */
const HEAD = "M210 36 a25 30 0 1 0 0.1 0 Z";
const TORSO =
  "M156 138 C150 148 152 172 166 196 C176 214 180 240 178 266 C176 296 170 312 170 330 " +
  "L250 330 C250 312 244 296 242 266 C240 240 244 214 254 196 C268 172 270 148 264 138 " +
  "C240 126 180 126 156 138 Z";
const LIMBS: Array<{ d: string; w: number }> = [
  { d: "M210 92 L210 108", w: 15 },
  { d: "M162 142 C150 158 142 185 142 208 C142 236 146 262 152 286", w: 15 }, // left arm
  { d: "M258 142 C270 158 278 185 278 208 C278 236 274 262 268 286", w: 15 }, // right arm
  { d: "M152 286 C150 296 152 304 156 310", w: 12 }, // left hand
  { d: "M268 286 C270 296 268 304 264 310", w: 12 },
  { d: "M188 328 C182 372 180 420 181 464 C182 514 185 556 186 588", w: 19 }, // left leg
  { d: "M232 328 C238 372 240 420 239 464 C238 514 235 556 234 588", w: 19 },
  { d: "M186 588 L184 604", w: 14 },
  { d: "M234 588 L236 604", w: 14 },
];
const DETAILS = ["M192 130 Q210 140 228 130", "M210 212 L210 266", "M186 320 Q210 332 234 320", "M172 212 L248 212"];

interface Slot {
  x: number; // node center
  y: number;
  r: number;
  ax: number; // anchor on body
  ay: number;
}
const SLOTS: Slot[] = [
  { x: 66, y: 206, r: 23, ax: 174, ay: 158 },
  { x: 356, y: 162, r: 29, ax: 246, ay: 162 },
  { x: 62, y: 370, r: 23, ax: 150, ay: 262 },
  { x: 360, y: 428, r: 23, ax: 268, ay: 292 },
  { x: 210, y: 630, r: 23, ax: 210, ay: 560 },
];

function connector(s: Slot): string {
  const cpx = s.ax + (s.x - s.ax) * 0.55;
  const cpy = s.ay + (s.y - s.ay) * 0.32 - 30;
  return `M${s.ax} ${s.ay} Q${cpx} ${cpy} ${s.x} ${s.y - s.r - 2}`;
}

function scoreCopy(score: number, total: number): string {
  if (total === 0) return "No rituals yet — open the ledger and plant the first one.";
  if (score >= 100) return "Every ritual honored. The streak is breathing on its own.";
  if (score >= 75) return "Strong signal. One link left in today's chain.";
  if (score >= 40) return "Shape is forming. Momentum over mood.";
  if (score > 0) return "Started. A single check-in bends the whole curve.";
  return "The body waits. Open the ledger and begin.";
}

export function HoloFigure({ habits, logs, pending, onToggle }: HoloFigureProps) {
  const active = useMemo(() => habits.filter((h) => h.archivedAt === null), [habits]);
  const shown = active.slice(0, 5);
  const today = todayKey();

  const isDone = (id: HabitId): boolean => (logs[id] ?? []).includes(today);
  const doneN = shown.filter((h) => isDone(h.id)).length;
  const score = shown.length === 0 ? 0 : Math.round((doneN / shown.length) * 100);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<SVGGElement | null>(null);
  const nodeLayerRef = useRef<SVGGElement | null>(null);

  // Cursor lean — springs write SVG transforms, no re-renders.
  const leanX = useSpring(0, { stiffness: 60, damping: 14 });
  const leanY = useSpring(0, { stiffness: 60, damping: 14 });

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const nx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      const ny = ((e.clientY - r.top) / r.height - 0.5) * 2;
      leanX.setTarget(nx);
      leanY.setTarget(ny);
    };
    const onLeave = () => {
      leanX.setTarget(0);
      leanY.setTarget(0);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    const render = () => {
      bodyRef.current?.setAttribute(
        "style",
        `transform: translate(${leanX.value * 9}px, ${leanY.value * 7}px) rotate(${leanX.value * 1.4}deg); transform-origin: 210px 340px;`,
      );
      nodeLayerRef.current?.setAttribute(
        "style",
        `transform: translate(${leanX.value * -16}px, ${leanY.value * -10}px); transform-origin: 210px 330px;`,
      );
    };
    const u1 = leanX.onFrame(render);
    const u2 = leanY.onFrame(render);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      u1();
      u2();
    };
  }, [leanX, leanY]);

  const [focusId, setFocusId] = useState<HabitId | null>(null);
  const scoreShown = useSpringNumber(score, { stiffness: 34, damping: 11 });

  return (
    <div ref={rootRef} className="relative mx-auto w-full max-w-[430px] select-none">
      <svg viewBox="0 0 420 660" className="w-full overflow-visible" aria-hidden={false}>
        <defs>
          <radialGradient id="pulse-figHead" cx="46%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#F2FFC4" stopOpacity="0.95" />
            <stop offset="55%" stopColor="#C9E96E" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#7FA92E" stopOpacity="0.12" />
          </radialGradient>
          <linearGradient id="pulse-figTorso" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E4F9A0" stopOpacity="0.6" />
            <stop offset="60%" stopColor="#A8CF4C" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#6d8f28" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="pulse-figLimb" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#DCF28A" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#88B035" stopOpacity="0.35" />
          </linearGradient>
          <filter id="pulse-figBlurL" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="16" />
          </filter>
          <filter id="pulse-figBlurS" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
          <clipPath id="pulse-torsoClip">
            <path d={TORSO} />
          </clipPath>
        </defs>

        {/* ambient aura */}
        <ellipse cx="210" cy="330" rx="168" ry="270" fill="#a4c63a" opacity="0.07" filter="url(#pulse-figBlurL)" />

        <g ref={bodyRef} className="holo-breath">
          {/* glow pass */}
          <g filter="url(#pulse-figBlurL)" opacity="0.85">
            <path d={HEAD} fill="#C9E96E" opacity="0.5" />
            <path d={TORSO} fill="#A8CF4C" opacity="0.55" />
            {LIMBS.map((l, i) => (
              <path key={`glow-${i}`} d={l.d} stroke="#A8CF4C" strokeWidth={l.w + 6} strokeLinecap="round" fill="none" opacity="0.55" />
            ))}
          </g>

          {/* crisp pass */}
          <path d={HEAD} fill="url(#pulse-figHead)" />
          <path d={TORSO} fill="url(#pulse-figTorso)" stroke="#D9F28D" strokeOpacity="0.5" strokeWidth="1.4" />
          {LIMBS.map((l, i) => (
            <path key={`limb-${i}`} d={l.d} stroke="url(#pulse-figLimb)" strokeWidth={l.w} strokeLinecap="round" fill="none" />
          ))}

          {/* anatomy hints */}
          <g stroke="#EEFFB8" strokeOpacity="0.35" strokeWidth="1" fill="none">
            {DETAILS.map((d, i) => (
              <path key={`dt-${i}`} d={d} />
            ))}
          </g>

          {/* scan shimmer sweeping inside the torso */}
          <g clipPath="url(#pulse-torsoClip)">
            <rect x="150" y="126" width="120" height="34" fill="#E9FF9E" opacity="0.13">
              <animate attributeName="y" from="126" to="340" dur="5.2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0;0.14;0" dur="5.2s" repeatCount="indefinite" />
            </rect>
          </g>

          {/* faint field lines */}
          <line x1="210" y1="20" x2="210" y2="640" stroke="#C9E96E" strokeOpacity="0.1" strokeWidth="0.6" />
          <line x1="128" y1="130" x2="292" y2="130" stroke="#C9E96E" strokeOpacity="0.08" strokeWidth="0.6" />
        </g>

        {/* ground glow */}
        <ellipse cx="210" cy="624" rx="96" ry="12" fill="#B8D94E" opacity="0.16" filter="url(#pulse-figBlurS)" />
        <ellipse cx="210" cy="624" rx="58" ry="5" fill="#D9F28D" opacity="0.25" />

        {/* nodes + connectors */}
        <g ref={nodeLayerRef}>
          {SLOTS.map((s, i) => {
            const habit = shown[i];
            if (!habit) {
              return <path key={`empty-${i}`} d={connector(s)} stroke="#C9E96E" strokeOpacity="0.06" strokeWidth="1" fill="none" pathLength={1} className="holo-draw" style={{ animationDelay: `${i * 0.12 + 0.2}s` }} />;
            }
            const done = isDone(habit.id);
            const busy = pending.includes(habit.id);
            return (
              <g key={habit.id}>
                <path
                  d={connector(s)}
                  fill="none"
                  pathLength={1}
                  className="holo-draw"
                  style={{ animationDelay: `${i * 0.12 + 0.2}s` }}
                  stroke={done ? "#D9F28D" : "#EC6517"}
                  strokeOpacity={done ? 0.55 : 0.16}
                  strokeWidth={done ? 1.1 : 0.8}
                />
                <g
                  transform={`translate(${s.x} ${s.y})`}
                  role="button"
                  tabIndex={0}
                  aria-pressed={done}
                  aria-label={`${habit.name}${done ? " — checked in today" : " — not checked in today"}`}
                  className="holo-node"
                  onClick={() => onToggle(habit.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onToggle(habit.id);
                    }
                  }}
                  onFocus={() => setFocusId(habit.id)}
                  onBlur={() => setFocusId(null)}
                >
                  <circle r={s.r} fill="#12140B" fillOpacity="0.9" stroke={done ? "rgba(217,242,141,0.85)" : "rgba(236,233,226,0.17)"} strokeWidth="1" />
                  <circle
                    r={s.r}
                    fill="none"
                    stroke={done ? "#E9FF9E" : "transparent"}
                    strokeOpacity="0.25"
                    strokeWidth="2.4"
                    className={done ? "holo-pulse" : undefined}
                  />
                  {busy ? (
                    <circle r={s.r * 0.45} fill="none" stroke="#E9FF9E" strokeWidth="1.6" strokeDasharray="14 40" className="holo-spin" strokeLinecap="round" />
                  ) : (
                    <circle r={done ? 4.4 : 2.6} cx={0} cy={0} fill={done ? "#F2FFC4" : "#A8A29E"} />
                  )}
                  {done ? <circle r={s.r * 0.45} fill="#95BC2E" fillOpacity="0.16" /> : null}
                  <text
                    y={s.r + 16}
                    textAnchor="middle"
                    className="font-mono"
                    fontSize="9.5"
                    letterSpacing="1.6"
                    fill={done ? "#E9FF9E" : focusId === habit.id ? "#EC6517" : "rgba(236,233,226,0.55)"}
                    style={{ textTransform: "uppercase" }}
                  >
                    {habit.name.length > 17 ? `${habit.name.slice(0, 16)}…` : habit.name}
                  </text>
                </g>
              </g>
            );
          })}
        </g>
      </svg>

      {/* score */}
      <div className="mt-[-24px] text-center">
        <div className="font-sans text-[64px] leading-none text-[#F4FFC8] tabular-nums" aria-live="polite">
          {scoreShown}
          <span className="text-[#95BC2E]">%</span>
        </div>
        <div className="mono-label mt-2 text-[11px] text-[#95BC2E]">PULSE SCORE — TODAY</div>
        <p className="mx-auto mt-2 max-w-[280px] text-[13px] leading-relaxed text-[#A8A29E]">
          {scoreCopy(score, shown.length)}
        </p>
      </div>
    </div>
  );
}
