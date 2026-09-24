import { useEffect, useMemo } from "react";

// how long a single particle's animation runs. Kept in sync with
// BURST_LIFETIME_MS in DeckglMap/index.js, which drops the burst's data
// shortly after this so it doesn't animate again on remount
const BURST_ANIM_MS = 700;
const PARTICLES_PER_BURST = 10;

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
    @keyframes cs-particle-confetti {
      0% { opacity: 1; transform: translate(-50%, -50%) translate(0, 0) scale(1); }
      55% { opacity: 1; transform: translate(-50%, -50%) translate(var(--dx), var(--dy-peak)) scale(0.9); }
      100% { opacity: 0; transform: translate(-50%, -50%) translate(var(--dx), var(--dy-end)) scale(0.4); }
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
    const angle = (i / PARTICLES_PER_BURST) * Math.PI * 2 + rand() * 0.6;
    const distance = 26 + rand() * 34;
    return {
      dx: Math.cos(angle) * distance,
      // placed: confetti pops up then falls past its start (gravity).
      // removed: dust just drifts outward and up, no fall
      dyPeak: placed ? -distance * 0.6 - rand() * 10 : -distance * 0.5,
      dyEnd: placed ? distance * 0.7 : -distance * 1.1,
      // dust reads better bigger: confetti pieces are meant to look crisp
      // and paper-like, dust is a puff and needs more presence to register
      size: placed ? 4 + rand() * 4 : 7 + rand() * 7,
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
  const anim =
    burst.kind === "placed" ? "cs-particle-confetti" : "cs-particle-dust";

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
            borderRadius: burst.kind === "placed" ? 2 : "50%",
            background: rgb,
            boxShadow: `0 0 ${burst.kind === "placed" ? 4 : 6}px ${rgb}`,
            animation: `${anim} ${BURST_ANIM_MS}ms ease-out ${p.delay}ms both`,
            "--dx": `${p.dx}px`,
            "--dy-peak": `${p.dyPeak}px`,
            "--dy-end": `${p.dyEnd}px`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * A short-lived burst of particles at the screen position of a cell that
 * was just placed (confetti popping up and falling) or removed (dust
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
