import { useEffect, useRef, useState } from "react";
import { Box } from "@mui/material";
import { DEMO_TRANSITION_MS, DEMO_EASING } from "./layout";

const noMotion = {
  "@media (prefers-reduced-motion: reduce)": { transition: "none" },
};
const TRANSITION = [
  "left",
  "top",
  "width",
  "height",
  "border-radius",
  "box-shadow",
  "opacity",
]
  .map((p) => `${p} ${DEMO_TRANSITION_MS}ms ${DEMO_EASING}`)
  .join(", ");

/**
 * Hosts a persistent module (the map). It is always this one element, in the
 * same place of the tree: the views and the boxes only change where it sits,
 * so moving it never remounts it (which would lose unsent edits and reload
 * the tiles).
 * - regular view: the whole window
 * - demo view: over the box (`slotRect`) that shows it, or hidden if none does
 *   (`slotRect` null: it then stays where it was and fades, so nothing jumps)
 * `switchKey` changes when it has to move to another box or layout (and so
 * animate); `dragging` is true while a divider is being dragged.
 */
export default function PersistentModuleHost({
  module,
  slotRect,
  switchKey: boxKey,
  dragging,
  demoMode,
  windowSize,
}) {
  const Content = module.component;
  const visible = !demoMode || slotRect !== null;
  const switchKey = `${demoMode}|${boxKey}`;

  const lastRect = useRef(null);
  let rect;
  if (!demoMode) {
    rect = { left: 0, top: 0, ...windowSize };
  } else if (slotRect) {
    rect = slotRect;
  } else {
    rect = lastRect.current;
  }
  lastRect.current = rect;

  // While a divider is dragged the box follows it, but what the module is told
  // is its size stays the one it had: the map frames its camera again for a
  // new size, and doing that on every pixel of the drag would make it jump.
  // It gets the new size once, when the divider is dropped
  const settledRect = useRef(rect);
  if (!dragging) settledRect.current = rect;

  // It only animates when it changes view or box, never while the window is
  // being resized (which would make it lag behind the window edge)
  const [seenKey, setSeenKey] = useState(switchKey);
  const [transitioning, setTransitioning] = useState(false);
  if (seenKey !== switchKey) {
    setSeenKey(switchKey);
    setTransitioning(true);
  }
  useEffect(() => {
    if (!transitioning) return undefined;
    const timer = setTimeout(
      () => setTransitioning(false),
      DEMO_TRANSITION_MS + 50
    );
    return () => clearTimeout(timer);
  }, [transitioning, switchKey]);

  return (
    <Box
      sx={{
        position: "absolute",
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        zIndex: 0,
        overflow: "hidden",
        borderRadius: demoMode ? "28px" : "0px",
        boxShadow: `0 0 0 1px rgba(255,255,255,${demoMode ? 0.08 : 0})`,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        transition: transitioning ? TRANSITION : "none",
        ...noMotion,
      }}
    >
      <Content demoMode={demoMode} mapSize={settledRect.current} />
    </Box>
  );
}
