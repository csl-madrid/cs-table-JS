import { createSlice } from "@reduxjs/toolkit";

// how many steps the line charts keep (they slide along as the simulation goes on)
export const ABM_HISTORY_POINTS = 120;

// The metrics the ABM simulation sends at every step (`abmMetrics` of a MODULE
// message from cityIO, see cs-abm's SimulationMetricsSnapshot):
// - latest: the last snapshot as it came ({ step, simulation_time, local,
//   window, global })
// - history: what the line charts need of the last steps, oldest first
const initialState = {
  latest: null,
  history: [],
};

// Keeps from a snapshot only what a line chart plots. A key that is missing
// stays null/empty: the simulation may not send everything yet
const toPoint = (metrics) => ({
  step: metrics.step,
  time: metrics.simulation_time,
  activities: metrics.local?.activity_counts ?? {},
  modes: metrics.local?.current_mode_counts ?? {},
  meanDistance: metrics.global?.mean_trip_distance_m ?? null,
  meanDuration: metrics.global?.mean_trip_duration_min ?? null,
});

export const abmMetricsSlice = createSlice({
  name: "abmMetricsState",
  initialState,
  reducers: {
    // A new snapshot arrived
    receiveAbmMetrics: (state, action) => {
      const metrics = action.payload;
      if (!metrics || typeof metrics !== "object") return;

      const point = toPoint(metrics);
      const last = state.history[state.history.length - 1];

      // the step went back: a new simulation started, forget the old one
      if (last && typeof point.step === "number" && point.step < last.step) {
        state.history = [];
      }

      const previous = state.history[state.history.length - 1];
      if (previous && previous.step === point.step) {
        state.history[state.history.length - 1] = point; // same step again
      } else {
        state.history.push(point);
      }
      if (state.history.length > ABM_HISTORY_POINTS) {
        state.history.splice(0, state.history.length - ABM_HISTORY_POINTS);
      }
      state.latest = metrics;
    },

    clearAbmMetrics: () => initialState,
  },
});

export const { receiveAbmMetrics, clearAbmMetrics } = abmMetricsSlice.actions;
export default abmMetricsSlice.reducer;
