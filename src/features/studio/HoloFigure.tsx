/* The Vision — a hologram figure whose light reflects the real ledger.
   Anatomy: one closed catmull-rom loop (head → jaw → neck → traps → torso →
   legs → feet), arms as closed shapes painted beneath the torso. All shapes
   sample ONE userSpaceOnUse gradient, so the union is seamless; the figure is
   rim-lit from the right (the body stroke is masked behind the arms so no
   flank seam shows). Nodes are actual habits: filled ring = checked in today;
   click to toggle. The figure breathes on a sine; the whole group leans a few
   pixels toward the pointer with spring physics. */

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

/* --- anatomy (viewBox 0 0 420 740), generated landmark loop --- */
const BODY = "M219 26 C224.8 28 232.2 32.3 236 38 C239.8 43.7 241.8 51.7 242 60 C242.2 68.3 239.3 81.3 237 88 C234.7 94.7 230.2 96.3 228 100 C225.8 103.7 224.5 105 224 110 C223.5 115 222.7 124.3 225 130 C227.3 135.7 232.8 140 238 144 C243.2 148 249.7 151 256 154 C262.3 157 271.3 159 276 162 C280.7 165 284.3 166.3 284 172 C283.7 177.7 276.7 187.7 274 196 C271.3 204.3 270.3 211.3 268 222 C265.7 232.7 262.5 247.3 260 260 C257.5 272.7 253.5 287 253 298 C252.5 309 256.2 317.3 257 326 C257.8 334.7 258 339 258 350 C258 361 258 373 257 392 C256 411 252.7 445.7 252 464 C251.3 482.3 254.2 486.3 253 502 C251.8 517.7 248.3 541 245 558 C241.7 575 234 591.3 233 604 C232 616.7 238.5 626 239 634 C239.5 642 239.3 649.7 236 652 C232.7 654.3 221.5 651.3 219 648 C216.5 644.7 220 639.7 221 632 C222 624.3 224.2 615.7 225 602 C225.8 588.3 226.7 567.3 226 550 C225.3 532.7 222.7 512.3 221 498 C219.3 483.7 216.3 478.7 216 464 C215.7 449.3 218.7 425.3 219 410 C219.3 394.7 219.5 378 218 372 C216.5 366 212.7 374 210 374 C207.3 374 203.5 366 202 372 C200.5 378 200.7 394.7 201 410 C201.3 425.3 204.3 449.3 204 464 C203.7 478.7 200.7 483.7 199 498 C197.3 512.3 194.7 532.7 194 550 C193.3 567.3 194.2 588.3 195 602 C195.8 615.7 198 624.3 199 632 C200 639.7 203.5 644.7 201 648 C198.5 651.3 187.3 654.3 184 652 C180.7 649.7 180.5 642 181 634 C181.5 626 188 616.7 187 604 C186 591.3 178.3 575 175 558 C171.7 541 168.2 517.7 167 502 C165.8 486.3 168.7 482.3 168 464 C167.3 445.7 164 411 163 392 C162 373 162 361 162 350 C162 339 162.2 334.7 163 326 C163.8 317.3 167.5 309 167 298 C166.5 287 162.5 272.7 160 260 C157.5 247.3 154.3 232.7 152 222 C149.7 211.3 148.7 204.3 146 196 C143.3 187.7 136.3 177.7 136 172 C135.7 166.3 139.3 165 144 162 C148.7 159 157.7 157 164 154 C170.3 151 176.8 148 182 144 C187.2 140 192.7 135.7 195 130 C197.3 124.3 196.5 115 196 110 C195.5 105 194.2 103.7 192 100 C189.8 96.3 185.3 94.7 183 88 C180.7 81.3 177.8 68.3 178 60 C178.2 51.7 180.2 43.7 184 38 C187.8 32.3 195.2 28 201 26 C206.8 24 213.2 24 219 26 Z";
const ARM_R = "M262 158 C265 155.7 273.3 157.7 278 162 C282.7 166.3 287.5 175.3 290 184 C292.5 192.7 293.2 203.7 293 214 C292.8 224.3 289.5 234.7 289 246 C288.5 257.3 290.2 271.3 290 282 C289.8 292.7 288.8 301.3 288 310 C287.2 318.7 285.3 326 285 334 C284.7 342 286.2 351.3 286 358 C285.8 364.7 285.7 370 284 374 C282.3 378 278.7 381.3 276 382 C273.3 382.7 269.8 383 268 378 C266.2 373 266.8 362 265 352 C263.2 342 258 329.7 257 318 C256 306.3 258 294 259 282 C260 270 261.8 258.3 263 246 C264.2 233.7 266.5 219.7 266 208 C265.5 196.3 260.7 184.3 260 176 C259.3 167.7 259 160.3 262 158 Z";
const ARM_L = "M160 176 C159.3 184.3 154.5 196.3 154 208 C153.5 219.7 155.8 233.7 157 246 C158.2 258.3 160 270 161 282 C162 294 164 306.3 163 318 C162 329.7 156.8 342 155 352 C153.2 362 153.8 373 152 378 C150.2 383 146.7 382.7 144 382 C141.3 381.3 137.7 378 136 374 C134.3 370 134.2 364.7 134 358 C133.8 351.3 135.3 342 135 334 C134.7 326 132.8 318.7 132 310 C131.2 301.3 130.2 292.7 130 282 C129.8 271.3 131.5 257.3 131 246 C130.5 234.7 127.2 224.3 127 214 C126.8 203.7 127.5 192.7 130 184 C132.5 175.3 137.3 166.3 142 162 C146.7 157.7 155 155.7 158 158 C161 160.3 160.7 167.7 160 176 Z";

/* Interior anatomy hints: clavicle pair, ab dashes, pelvis line. */
const HINTS = [
  "M232 152 Q210 160 188 152",
  "M197 302 h26",
  "M199 320 h22",
  "M195 334 Q210 341 225 334",
];

interface Slot {
  x: number; // node center
  y: number;
  r: number;
  ax: number; // anchor on body
  ay: number;
}
/* Nodes anchored to anatomy: head, heart (large), core, hip, below the feet. */
const SLOTS: Slot[] = [
  { x: 56, y: 118, r: 23, ax: 184, ay: 64 },
  { x: 358, y: 208, r: 29, ax: 262, ay: 206 },
  { x: 60, y: 330, r: 23, ax: 168, ay: 300 },
  { x: 358, y: 424, r: 23, ax: 254, ay: 386 },
  { x: 210, y: 704, r: 23, ax: 210, ay: 600 },
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
      <svg viewBox="0 0 420 740" className="w-full overflow-visible" aria-hidden={false}>
        <defs>
          <linearGradient id="pulse-figFill" x1="0" y1="28" x2="0" y2="665" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#F0FFC0" />
            <stop offset="0.3" stopColor="#CDEB76" />
            <stop offset="0.7" stopColor="#93BC3C" />
            <stop offset="1" stopColor="#61812B" />
          </linearGradient>
          <linearGradient id="pulse-figArmFill" x1="0" y1="150" x2="0" y2="400" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#C9E86C" />
            <stop offset="1" stopColor="#7BA032" />
          </linearGradient>
          <linearGradient id="pulse-figRim" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0.55" stopColor="#F4FFC8" stopOpacity="0" />
            <stop offset="1" stopColor="#F4FFC8" stopOpacity="0.85" />
          </linearGradient>
          <filter id="pulse-figBlurL" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="16" />
          </filter>
          <filter id="pulse-figBlurS" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
          <clipPath id="pulse-figClip">
            <path d={BODY} />
          </clipPath>
          {/* body rim stroke minus the arm-overlap segments (no flank seam) */}
          <mask id="pulse-figBodyMask" maskUnits="userSpaceOnUse" x="0" y="0" width="420" height="740">
            <path d={BODY} fill="white" />
            <path d={ARM_R} fill="black" />
            <path d={ARM_L} fill="black" />
          </mask>
        </defs>

        {/* ambient aura */}
        <ellipse cx="210" cy="340" rx="150" ry="270" fill="#a4c63a" opacity="0.07" filter="url(#pulse-figBlurL)" />

        <g ref={bodyRef} className="holo-breath">
          {/* glow pass — group-filtered so overlaps don't double-darken */}
          <g filter="url(#pulse-figBlurL)" opacity="0.8">
            <path d={BODY} fill="#A8CF4C" opacity="0.55" />
            <path d={ARM_L} fill="#A8CF4C" opacity="0.5" />
            <path d={ARM_R} fill="#A8CF4C" opacity="0.5" />
          </g>

          {/* arms beneath, torso over — shared user-space gradients keep the union seamless */}
          <path d={ARM_L} fill="url(#pulse-figArmFill)" />
          <path d={ARM_R} fill="url(#pulse-figArmFill)" />
          <path d={BODY} fill="url(#pulse-figFill)" />

          {/* rim light from the right; body stroke masked out where arms overlap */}
          <path d={BODY} fill="none" stroke="url(#pulse-figRim)" strokeWidth="1.1" mask="url(#pulse-figBodyMask)" />
          <path d={ARM_R} fill="none" stroke="url(#pulse-figRim)" strokeWidth="1.1" />
          <path d={ARM_L} fill="none" stroke="url(#pulse-figRim)" strokeWidth="1.1" />

          {/* anatomy hints */}
          <g stroke="#EEFFB8" strokeOpacity="0.3" strokeWidth="1" fill="none">
            {HINTS.map((d, i) => (
              <path key={`hint-${i}`} d={d} />
            ))}
          </g>

          {/* scan shimmer sweeping inside the torso */}
          <g clipPath="url(#pulse-figClip)">
            <rect x="140" y="130" width="140" height="34" fill="#E9FF9E" opacity="0.13">
              <animate attributeName="y" from="130" to="360" dur="5.2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0;0.14;0" dur="5.2s" repeatCount="indefinite" />
            </rect>
          </g>

          {/* faint field lines */}
          <line x1="210" y1="20" x2="210" y2="706" stroke="#C9E96E" strokeOpacity="0.1" strokeWidth="0.6" />
          <line x1="126" y1="151" x2="294" y2="151" stroke="#C9E96E" strokeOpacity="0.08" strokeWidth="0.6" />
        </g>

        {/* ground glow */}
        <ellipse cx="210" cy="672" rx="96" ry="12" fill="#B8D94E" opacity="0.16" filter="url(#pulse-figBlurS)" />
        <ellipse cx="210" cy="672" rx="58" ry="5" fill="#D9F28D" opacity="0.25" />

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
        <div className="font-display text-[64px] font-semibold leading-none tracking-[-0.015em] text-[#F4FFC8] tabular-nums" aria-live="polite">
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
