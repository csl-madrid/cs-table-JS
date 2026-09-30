import { useState } from "react";
import {
  Box,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { metricSections } from "../VisContainer";

/**
 * Demo view: the metrics of the right-hand panel, shown one at a time in a
 * big panel, with a switch to change which one is on screen
 */
export default function DemoMetricsPanel() {
  const [activeId, setActiveId] = useState(metricSections[0].id);
  const active = metricSections.find((s) => s.id === activeId);

  return (
    <Paper
      elevation={0}
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderRadius: "28px",
        border: "1px solid",
        borderColor: "divider",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          px: 3,
          pt: 2.5,
          pb: 2,
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 1.5,
        }}
      >
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="h6" noWrap>
            {active.title}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {active.subheader}
          </Typography>
        </Box>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={activeId}
          onChange={(_, id) => id && setActiveId(id)}
          aria-label="Metric"
        >
          {metricSections.map((s) => (
            <ToggleButton
              key={s.id}
              value={s.id}
              aria-label={s.title}
              sx={{
                gap: 0.75,
                px: 1.5,
                textTransform: "none",
                "& svg": { fontSize: 18 },
              }}
            >
              {s.icon}
              {s.title}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {/* the bottom padding keeps content clear of the demo-mode button that
          floats over this panel's bottom-left corner */}
      <Box
        sx={{
          flexGrow: 1,
          minHeight: 0,
          overflow: "auto",
          // stays scrollable (a fallback for content that doesn't fit, e.g.
          // Land-use's legend) but hides the scrollbar chrome itself, which
          // otherwise nibbles a few px off the chart's available width
          scrollbarWidth: "none", // Firefox
          msOverflowStyle: "none", // old Edge/IE
          "&::-webkit-scrollbar": { display: "none" }, // Chrome/Safari/Edge
          colorScheme: "dark",
          px: 3,
          pb: 9,
          display: "flex",
        }}
      >
        {/* the charts are square, so their width is capped by the screen
            height too: otherwise they overflow the panel. `m: auto` centers
            without making the top of an overflowing chart unreachable */}
        <Box
          sx={{
            m: "auto",
            // a percentage height needs a parent with a definite (non-flex-
            // computed) height to resolve against, which this box's parent
            // doesn't have - so a plain `height: min(100%, ...)` here is
            // silently invalid and falls back to auto, sized by the chart
            // itself, making a vh term in it a no-op. aspectRatio sidesteps
            // that entirely: height always simply follows the resolved width
            width: "min(100%, 820px, calc(100vh - 80px))",
            aspectRatio: "1",
          }}
        >
          {active.component}
        </Box>
      </Box>
    </Paper>
  );
}
