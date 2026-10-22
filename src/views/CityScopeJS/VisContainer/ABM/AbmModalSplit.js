import { useMemo } from "react";
import { useSelector } from "react-redux";
import { Typography } from "@mui/material";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Pie } from "react-chartjs-2";
import ChartFrame, { useChartOptions } from "../ChartFrame";
import {
  ABM_COLORS,
  OTHER_COLOR,
  OTHER_NAME,
  TEXT_COLOR,
  SURFACE_COLOR,
  modeColors,
} from "./abmPalette";

ChartJS.register(ArcElement, Tooltip, Legend);

const baseOptions = {
  animation: false,
  plugins: {
    legend: {
      position: "bottom",
      labels: { color: TEXT_COLOR, boxWidth: 12, boxHeight: 12 },
    },
    tooltip: {
      callbacks: {
        // the share of the whole, whatever the scale of the values is
        label: (context) => {
          const total = context.dataset.data.reduce((sum, v) => sum + v, 0);
          const share = total ? (context.parsed / total) * 100 : 0;
          return `${context.label}: ${share.toFixed(1)}%`;
        },
      },
    },
    datalabels: { display: false },
  },
};

/** Pie chart of the share of the trips of each transport mode so far */
export default function AbmModalSplit({ fill = false }) {
  const split = useSelector(
    (state) => state.abmMetricsState.latest?.global?.modal_split
  );

  const data = useMemo(() => {
    const labels = [];
    const values = [];
    const colors = [];
    let other = 0;

    Object.entries(split ?? {}).forEach(([mode, value]) => {
      if (typeof value !== "number" || value <= 0) return;
      const slot = modeColors.slot(mode);
      if (slot === null) {
        other += value;
        return;
      }
      labels.push(mode);
      values.push(value);
      colors.push(ABM_COLORS[slot]);
    });
    if (other > 0) {
      labels.push(OTHER_NAME);
      values.push(other);
      colors.push(OTHER_COLOR);
    }

    return {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: colors,
          // a gap of the surface between slices
          borderColor: SURFACE_COLOR,
          borderWidth: 2,
        },
      ],
    };
  }, [split]);

  const options = useChartOptions(baseOptions, fill);

  if (!data.labels.length) {
    return (
      <Typography variant="caption" color="text.secondary">
        Waiting for simulation data...
      </Typography>
    );
  }

  return (
    <ChartFrame fill={fill}>
      <Pie data={data} options={options} />
    </ChartFrame>
  );
}
