import AbmLineChart from "./AbmLineChart";
import AbmValues from "./AbmValues";
import AbmModalSplit from "./AbmModalSplit";
import { activityColors, modeColors } from "./abmPalette";

// What each line chart plots of a history point (see abmMetricsSlice)
const activities = (point) => point.activities;
const modes = (point) => point.modes;
const distance = (point) => ({ "Mean distance": point.meanDistance });
const duration = (point) => ({ "Mean duration": point.meanDuration });

// the single-line charts always use the first color
const singleLine = { slot: () => 0 };

export { AbmValues, AbmModalSplit };

export const AbmActivities = (props) => (
  <AbmLineChart
    {...props}
    select={activities}
    registry={activityColors}
    unit="agents"
  />
);

export const AbmModes = (props) => (
  <AbmLineChart {...props} select={modes} registry={modeColors} unit="agents" />
);

export const AbmDistance = (props) => (
  <AbmLineChart {...props} select={distance} registry={singleLine} unit="m" />
);

export const AbmDuration = (props) => (
  <AbmLineChart {...props} select={duration} registry={singleLine} unit="min" />
);
