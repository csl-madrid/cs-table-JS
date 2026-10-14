// Shared by the demo layout (CSS), the map camera and the Redux layout state,
// so all of them agree on where each box is. Pure constants and maths only
import { leaf, col, row, computeLayout } from "./layoutTree";

// how long switching between the regular and the demo view takes
export const DEMO_TRANSITION_MS = 600;
export const DEMO_EASING = "cubic-bezier(0.2, 0.8, 0.2, 1)";

// space around and between the boxes of the demo view, in px
export const DEMO_GAP = 12;
// the smallest a box can be made by dragging a divider, or split into, in px
export const DEMO_MIN_BOX = 160;
// share of the width the left column takes in the "three boxes" layout
export const DEMO_METRICS_SHARE = 0.44;

// what a box holds when it shows no module
export const EMPTY_MODULE_ID = "empty";

/**
 * The layouts the demo view can start from, described with the builders of
 * layoutTree.js. The order of the boxes (left to right, top to bottom as they
 * are written) is the order modules are kept in when switching layouts. A
 * layout can also bring its own `modules` (module ids in that same order): then
 * choosing it puts them in its boxes, instead of keeping what was on screen.
 * To add a layout, add an entry here.
 */
export const DEMO_PRESETS = [
  {
    id: "layout1",
    name: "Layout 1",
    tree: col(DEMO_METRICS_SHARE, leaf(), row(0.5, leaf(), leaf())),
    modules: ["radar", "map", "abm"],
  },
  {
    // two columns: the map on the left, the radar chart and the bar chart
    // (the metrics that matter most here) sharing the bigger right column
    id: "layout2",
    name: "Layout 2",
    tree: col(0.4, leaf(), row(0.5, leaf(), leaf())),
    modules: ["map", "radar", "bar"],
  },
  { id: "side", name: "Main and side", tree: col(0.68, leaf(), leaf()) },
  {
    id: "three",
    name: "Three boxes",
    tree: col(
      DEMO_METRICS_SHARE,
      leaf(),
      row(0.5, leaf(), leaf())
    ),
  },
  {
    id: "top",
    name: "Main on top",
    tree: row(0.62, leaf(), col(0.5, leaf(), leaf())),
  },
  {
    id: "four",
    name: "Four boxes",
    tree: row(0.5, col(0.5, leaf(), leaf()), col(0.5, leaf(), leaf())),
  },
];

// the layout, and what its boxes show, until someone changes them (module ids
// are the ones of ../modules, in the order of the layout's boxes)
export const DEFAULT_PRESET_ID = "three";
export const DEFAULT_DEMO_MODULES = ["landuse", "map", EMPTY_MODULE_ID];

export const getPreset = (id) => DEMO_PRESETS.find((p) => p.id === id);

/**
 * Where the boxes and dividers of `tree` go on a window of this size. Computed
 * from the window instead of measured: while the layout animates the real size
 * keeps changing, and the map camera has to aim at the final one
 */
export const demoLayout = (tree, windowWidth, windowHeight) =>
  computeLayout(tree, windowWidth, windowHeight, DEMO_GAP);
