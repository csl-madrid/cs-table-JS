import { useMemo } from "react";
import { Box } from "@mui/material";

/**
 * Wraps a chart. With `fill` it takes the whole box it is in (the box has to
 * be positioned); without it, it is left as is, as wide as its parent with the
 * proportion Chart.js gives it. Pair it with useChartOptions.
 */
export default function ChartFrame({ fill, children }) {
  if (!fill) return children;
  return <Box sx={{ position: "absolute", inset: 0 }}>{children}</Box>;
}

/** Chart.js options for a chart that may `fill` its box: no fixed proportion */
export const useChartOptions = (options, fill) =>
  useMemo(
    () => (fill ? { ...options, maintainAspectRatio: false } : options),
    [options, fill]
  );
