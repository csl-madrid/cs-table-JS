import { useSelector } from "react-redux";
import { Box, Typography } from "@mui/material";
import { clockOf } from "./abmPalette";

// "2026-01-01T08:05:00" -> "2026-01-01"
const dayOf = (isoTime) =>
  typeof isoTime === "string" && isoTime.length >= 10
    ? isoTime.slice(0, 10)
    : "";

function Value({ label, value, detail }) {
  return (
    <Box sx={{ textAlign: "center", minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" noWrap>
        {label}
      </Typography>
      <Typography
        variant="h4"
        sx={{ fontVariantNumeric: "tabular-nums", lineHeight: 1.2 }}
        noWrap
      >
        {value}
      </Typography>
      {detail && (
        <Typography variant="caption" color="text.secondary" noWrap>
          {detail}
        </Typography>
      )}
    </Box>
  );
}

/**
 * The numbers of the simulation that are shown as they are, not as a chart:
 * the simulation time, the agents that are moving and the trips completed
 */
export default function AbmValues({ fill = false }) {
  const latest = useSelector((state) => state.abmMetricsState.latest);

  if (!latest) {
    return (
      <Typography variant="caption" color="text.secondary">
        Waiting for simulation data...
      </Typography>
    );
  }

  const number = (value) => (typeof value === "number" ? value : "-");

  return (
    <Box
      sx={{
        ...(fill ? { position: "absolute", inset: 0 } : {}),
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-around",
        gap: 1,
      }}
    >
      <Value
        label="Simulation time"
        value={clockOf(latest.simulation_time) || "-"}
        detail={dayOf(latest.simulation_time)}
      />
      <Value label="Agents moving" value={number(latest.local?.moving_agents)} />
      <Value
        label="Trips completed"
        value={number(latest.global?.completed_trips)}
      />
    </Box>
  );
}
