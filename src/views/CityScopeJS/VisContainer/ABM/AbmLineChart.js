import { useMemo } from "react";
import { useSelector } from "react-redux";
import { Typography } from "@mui/material";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import ChartFrame, { useChartOptions } from "../ChartFrame";
import {
  ABM_COLORS,
  OTHER_COLOR,
  OTHER_NAME,
  TEXT_COLOR,
  MUTED_COLOR,
  GRID_COLOR,
  clockOf,
} from "./abmPalette";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

/**
 * Line chart of something the simulation reports at every step, sliding along
 * as it advances. It plots one line per name `select` finds in each step.
 * - select(point): { name: value } of a history point (see abmMetricsSlice)
 * - registry: gives each name its color (see abmPalette)
 * - unit: what the y axis counts
 * With more than one line it shows a legend; one line is named by the title
 */
export default function AbmLineChart({ select, registry, unit, fill = false }) {
  const history = useSelector((state) => state.abmMetricsState.history);

  const data = useMemo(() => {
    const perStep = history.map(select);
    const lines = new Map(); // slot -> { name, values }
    const other = history.map(() => null); // names without a color left

    perStep.forEach((values, i) => {
      Object.entries(values).forEach(([name, value]) => {
        if (typeof value !== "number") return;
        const slot = registry.slot(name);
        if (slot === null) {
          other[i] = (other[i] ?? 0) + value;
          return;
        }
        if (!lines.has(slot)) {
          lines.set(slot, { name, values: history.map(() => null) });
        }
        lines.get(slot).values[i] = value;
      });
    });

    const datasets = [...lines.entries()]
      .sort(([a], [b]) => a - b)
      .map(([slot, { name, values }]) => ({
        label: name,
        data: values,
        borderColor: ABM_COLORS[slot],
        backgroundColor: ABM_COLORS[slot],
      }));
    if (other.some((v) => v !== null)) {
      datasets.push({
        label: OTHER_NAME,
        data: other,
        borderColor: OTHER_COLOR,
        backgroundColor: OTHER_COLOR,
      });
    }

    return {
      labels: history.map((p) => clockOf(p.time) || `${p.step}`),
      datasets: datasets.map((d) => ({ ...d, spanGaps: true })),
    };
  }, [history, select, registry]);

  const options = useChartOptions(
    useMemo(
      () => ({
        // it is redrawn at every step: no animation
        animation: false,
        interaction: { mode: "index", intersect: false },
        elements: {
          line: { borderWidth: 2, tension: 0.25 },
          point: { radius: 0, hoverRadius: 4 },
        },
        plugins: {
          legend: {
            display: data.datasets.length > 1,
            position: "bottom",
            labels: { color: TEXT_COLOR, boxWidth: 12, boxHeight: 2 },
          },
          datalabels: { display: false },
        },
        scales: {
          x: {
            ticks: { color: MUTED_COLOR, maxTicksLimit: 6, maxRotation: 0 },
            grid: { color: GRID_COLOR },
          },
          y: {
            beginAtZero: true,
            ticks: { color: MUTED_COLOR },
            grid: { color: GRID_COLOR },
            title: {
              display: Boolean(unit),
              text: unit,
              color: MUTED_COLOR,
            },
          },
        },
      }),
      [data.datasets.length, unit]
    ),
    fill
  );

  if (!history.length || !data.datasets.length) {
    return (
      <Typography variant="caption" color="text.secondary">
        Waiting for simulation data...
      </Typography>
    );
  }

  return (
    <ChartFrame fill={fill}>
      <Line data={data} options={options} />
    </ChartFrame>
  );
}
