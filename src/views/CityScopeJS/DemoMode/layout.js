// Shared by the demo layout (CSS) and the map camera, so both animate together

// how long switching between the regular and the demo view takes
export const DEMO_TRANSITION_MS = 600;
export const DEMO_EASING = "cubic-bezier(0.2, 0.8, 0.2, 1)";

// space around and between the boxes of the demo view, in px
export const DEMO_GAP = 12;
// share of the width the metrics take (the rest is the map and the spare box)
export const DEMO_METRICS_SHARE = 0.44;

// Size the map box ends up with in each view, computed from the window instead
// of measured: while the layout animates its real size keeps changing, and the
// camera has to aim at the final one
export const targetMapSize = (demoMode, windowWidth, windowHeight) =>
  demoMode
    ? {
        // padding on both sides plus one gap between the two columns
        width: (windowWidth - 3 * DEMO_GAP) * (1 - DEMO_METRICS_SHARE),
        // padding on both sides plus one gap between the two rows
        height: (windowHeight - 3 * DEMO_GAP) / 2,
      }
    : { width: windowWidth, height: windowHeight };
