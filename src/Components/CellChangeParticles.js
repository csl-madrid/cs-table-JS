import { useEffect, useMemo } from "react";

// how long a single particle's animation runs. Kept in sync with
// BURST_LIFETIME_MS in DeckglMap/index.js, which drops the burst's data
// shortly after this so it doesn't animate again on remount
const BURST_ANIM_MS = 700;
// placed blocks: each falls for DROP_MS, starting up to DROP_STAGGER_MS after
// the first one, so the whole burst must stay under BURST_LIFETIME_MS
const DROP_MS = 500;
const DROP_STAGGER_MS = 300;
const PARTICLES_PER_BURST = 25;

// injects the shared keyframes once, no matter how many bursts are on
// screen - a plain <style> tag is simpler and more reliable here than
// fighting deck.gl's own WebGL attribute transitions, which is what this
// whole component exists to sidestep
let stylesInjected = false;
const injectStyles = () => {
  if (stylesInjected || typeof document === "undefined") return;
  stylesInjected = true;
  const style = document.createElement("style");
  style.textContent = `
    @keyframes cs-block-fall {
      0% { transform: translate(-50%, -50%) translate(var(--dx), var(--dy-start)) scale(1, 1); animation-timing-function: cubic-bezier(0.5, 0, 1, 0.7); }
      55% { transform: translate(-50%, -50%) translate(var(--dx), var(--dy-land)) scale(1, 1); animation-timing-function: ease-out; }
      65% { transform: translate(-50%, -50%) translate(var(--dx), var(--dy-land)) scale(1.35, 0.6); animation-timing-function: ease-out; }
      100% { transform: translate(-50%, -50%) translate(var(--dx), var(--dy-land)) scale(1, 1); }
    }
    @keyframes cs-block-fade {
      0% { opacity: 0; }
      8% { opacity: 1; }
      75% { opacity: 1; }
      100% { opacity: 0; }
    }
    @keyframes cs-particle-dust {
      0% { opacity: 0.9; transform: translate(-50%, -50%) translate(0, 0) scale(1); }
      100% { opacity: 0; transform: translate(-50%, -50%) translate(var(--dx), var(--dy-end)) scale(0.5); }
    }
  `;
  document.head.appendChild(style);
};

// small deterministic PRNG seeded from the burst's own key, so re-renders
// during the animation don't reshuffle an in-flight burst's particles
const makeParticles = (seedKey, kind) => {
  let seed = 0;
  for (let i = 0; i < seedKey.length; i++) {
    seed = (seed * 31 + seedKey.charCodeAt(i)) >>> 0;
  }
  const rand = () => {
    seed = (seed * 1103515245 + 12345) >>> 0;
    return (seed % 1000) / 1000;
  };
  const placed = kind === "placed";
  return Array.from({ length: PARTICLES_PER_BURST }, (_, i) => {
    if (placed) {
      // building blocks: drop from above onto the piece's footprint, one
      // after another, each landing a bit higher than the last (stacking)
      return {
        dx: (rand() - 0.5) * 100,
        dyStart: -(120 + rand() * 90),
        dyLand: -(i / PARTICLES_PER_BURST) * 14,
        size: 8 + rand() * 6,
        delay: rand() * DROP_STAGGER_MS,
      };
    }
    const angle = (i / PARTICLES_PER_BURST) * Math.PI * 2 + rand() * 0.6;
    // dust travels far and wide so the removal is easy to notice
    const distance = 55 + rand() * 60;
    return {
      dx: Math.cos(angle) * distance,
      dyEnd: -distance * 1.0,
      size: 7 + rand() * 7,
      delay: rand() * 80,
    };
  });
};

function Burst({ burst }) {
  const particles = useMemo(
    () => makeParticles(burst.key, burst.kind),
    [burst.key, burst.kind]
  );
  const color = burst.color?.length >= 3 ? burst.color : [255, 255, 255];
  const rgb = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
  const placed = burst.kind === "placed";
  const animationFor = (delay) =>
    placed
      ? `cs-block-fall ${DROP_MS}ms linear ${delay}ms both, cs-block-fade ${DROP_MS}ms linear ${delay}ms both`
      : `cs-particle-dust ${BURST_ANIM_MS}ms ease-out ${delay}ms both`;

  return (
    <div style={{ position: "absolute", left: burst.x, top: burst.y }}>
      {particles.map((p, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: p.size,
            height: p.size,
            borderRadius: placed ? 2 : "50%",
            background: rgb,
            border: placed ? "1px solid rgba(255, 255, 255, 0.4)" : "none",
            boxSizing: "border-box",
            boxShadow: `0 0 ${placed ? 4 : 6}px ${rgb}`,
            animation: animationFor(Math.round(p.delay)),
            "--dx": `${p.dx}px`,
            ...(placed
              ? {
                  "--dy-start": `${p.dyStart}px`,
                  "--dy-land": `${p.dyLand}px`,
                }
              : { "--dy-end": `${p.dyEnd}px` }),
          }}
        />
      ))}
    </div>
  );
}

/**
 * A short-lived burst of particles at the screen position of a cell that
 * was just placed (blocks dropping in and stacking up) or removed (dust
 * drifting away), so the change is unmistakable even at a glance - a
 * plain HTML/CSS overlay above the map canvas, not a deck.gl layer, so it
 * is never hidden behind a building regardless of camera angle or height.
 *
 * `bursts`: [{ key, x, y, color: [r,g,b], kind: "placed" | "removed" }]
 * `x`/`y` are already-projected screen pixels (see DeckglBase.js).
 */
export default function CellChangeParticles({ bursts = [] }) {
  useEffect(() => {
    injectStyles();
  }, []);

  if (!bursts.length) return null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 5,
        overflow: "hidden",
      }}
    >
      {bursts.map((b) => (
        <Burst key={b.key} burst={b} />
      ))}
    </div>
  );
}
