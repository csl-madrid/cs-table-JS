// Colors of the ABM charts: the eight categorical hues of the dataviz palette,
// stepped for a dark surface, always in this order (never cycled)
export const ABM_COLORS = [
  "#3987e5", // blue
  "#d95926", // orange
  "#199e70", // aqua
  "#c98500", // yellow
  "#d55181", // magenta
  "#008300", // green
  "#9085e9", // violet
  "#e66767", // red
];

// what is left over when a chart has more series than colors
export const OTHER_NAME = "Other";
export const OTHER_COLOR = "#8a8a85";

// text and lines of the charts: quiet, so the data stands out
export const TEXT_COLOR = "#bcbcbc";
export const MUTED_COLOR = "#959595";
export const GRID_COLOR = "rgba(255, 255, 255, 0.07)";
// the surface the charts sit on, for the gap between the slices of a pie
export const SURFACE_COLOR = "#111111";

/**
 * Gives each name (an activity, a transport mode...) its own color, the first
 * time it is seen, and keeps it: the color follows the entity, so a series
 * that appears or disappears never repaints the others. When all the colors
 * are taken, `slot` returns null and the name goes into "Other".
 * Charts that show the same kind of names (the modes line chart and the modes
 * pie) share a registry, so a mode has the same color in both.
 */
export function createColorRegistry() {
  const slots = new Map();
  return {
    slot(name) {
      if (!slots.has(name)) {
        if (slots.size >= ABM_COLORS.length) return null;
        slots.set(name, slots.size);
      }
      return slots.get(name);
    },
  };
}

export const activityColors = createColorRegistry();
export const modeColors = createColorRegistry();

// "2026-01-01T08:05:00" -> "08:05"
export const clockOf = (isoTime) =>
  typeof isoTime === "string" && isoTime.length >= 16
    ? isoTime.slice(11, 16)
    : "";
