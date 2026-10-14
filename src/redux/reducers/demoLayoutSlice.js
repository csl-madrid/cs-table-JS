import { createSlice, current } from "@reduxjs/toolkit";
import {
  DEFAULT_DEMO_MODULES,
  DEFAULT_PRESET_ID,
  EMPTY_MODULE_ID,
  getPreset,
} from "../../views/CityScopeJS/DemoMode/layout";
import {
  assignIds,
  leafIds,
  setRatio,
  splitLeaf,
  removeLeaf,
} from "../../views/CityScopeJS/DemoMode/layoutTree";

// the smallest and largest share of a split that either side can have
const MIN_RATIO = 0.05;

// Gives the modules of a layout, in the order of its boxes, to its boxes
const modulesByBox = (tree, modules) =>
  Object.fromEntries(leafIds(tree).map((id, i) => [id, modules[i]]));

const initial = assignIds(getPreset(DEFAULT_PRESET_ID).tree);

// The layout of the demo view (a tree of splits, see layoutTree.js) and what
// each of its boxes shows. Everything that changes it (the menus and dividers
// of the demo view today, anything else tomorrow) goes through these actions,
// so there is a single place that decides how the layout moves.
// - presetId: the layout chosen from the list, or null once it was edited
// - modules[boxId]: the id of the module box `boxId` shows
// - nextId: where the ids of new boxes and splits continue from
export const demoLayoutSlice = createSlice({
  name: "demoLayoutState",
  initialState: {
    presetId: DEFAULT_PRESET_ID,
    tree: initial.tree,
    modules: modulesByBox(initial.tree, DEFAULT_DEMO_MODULES),
    nextId: initial.nextId,
  },
  reducers: {
    // Shows `moduleId` in box `slot`. A module is on screen once at most, so if
    // it is already in another box the two boxes swap contents
    setSlotModule: (state, action) => {
      const { slot, moduleId } = action.payload;
      const shown = state.modules[slot];
      if (shown === undefined || shown === moduleId) return;
      if (moduleId !== EMPTY_MODULE_ID) {
        const other = Object.keys(state.modules).find(
          (id) => id !== slot && state.modules[id] === moduleId
        );
        if (other) state.modules[other] = shown;
      }
      state.modules[slot] = moduleId;
    },

    // Changes the whole layout. A layout that brings its own modules puts them
    // in its boxes. Otherwise modules keep their place by box order; if the new
    // layout has fewer boxes, the ones left over take the empty boxes that
    // remain before being dropped, and if it has more, the new ones are empty
    setPreset: (state, action) => {
      const preset = getPreset(action.payload.presetId);
      if (!preset) return;
      if (preset.id === state.presetId && !preset.modules) return;
      const { tree, nextId } = assignIds(preset.tree, state.nextId);
      const count = leafIds(tree).length;
      let kept;
      if (preset.modules) {
        kept = preset.modules.slice(0, count);
      } else {
        const inOrder = leafIds(current(state.tree)).map(
          (id) => state.modules[id]
        );
        kept = inOrder.slice(0, count);
        const leftOver = inOrder
          .slice(count)
          .filter((m) => m !== EMPTY_MODULE_ID);
        for (let i = 0; i < kept.length && leftOver.length; i++) {
          if (kept[i] === EMPTY_MODULE_ID) kept[i] = leftOver.shift();
        }
      }
      while (kept.length < count) kept.push(EMPTY_MODULE_ID);
      state.presetId = preset.id;
      state.tree = tree;
      state.modules = modulesByBox(tree, kept);
      state.nextId = nextId;
    },

    // Moves a divider: `splitId` gives `ratio` of its room to its first side
    setSplitRatio: (state, action) => {
      const { splitId, ratio } = action.payload;
      const clamped = Math.min(Math.max(ratio, MIN_RATIO), 1 - MIN_RATIO);
      state.tree = setRatio(current(state.tree), splitId, clamped);
      state.presetId = null;
    },

    // Splits box `slot` in two (`dir`: "col" side by side, "row" one over the
    // other). The box keeps its module, the new one (second) starts empty
    splitBox: (state, action) => {
      const { slot, dir } = action.payload;
      if (state.modules[slot] === undefined) return;
      const splitId = `s${state.nextId}`;
      const boxId = `b${state.nextId + 1}`;
      state.tree = splitLeaf(current(state.tree), slot, dir, splitId, boxId);
      state.modules[boxId] = EMPTY_MODULE_ID;
      state.nextId += 2;
      state.presetId = null;
    },

    // Removes box `slot`, its module with it: the box next to it takes its room.
    // The last box can't be removed
    removeBox: (state, action) => {
      const { slot } = action.payload;
      if (state.modules[slot] === undefined) return;
      if (Object.keys(state.modules).length <= 1) return;
      state.tree = removeLeaf(current(state.tree), slot);
      delete state.modules[slot];
      state.presetId = null;
    },
  },
});

export const {
  setSlotModule,
  setPreset,
  setSplitRatio,
  splitBox,
  removeBox,
} = demoLayoutSlice.actions;
export default demoLayoutSlice.reducer;
