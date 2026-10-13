import { IconButton, Paper, Tooltip } from "@mui/material";
import ViewQuiltRoundedIcon from "@mui/icons-material/ViewQuiltRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";

const GAP = 12;
const SIZE = 46;
// the left icon rail is 62px wide and starts GAP from the edge: this centers
// the button under it
const LEFT = GAP + (62 - SIZE) / 2;

// where the layout button of the demo view sits: right next to this one
export const DEMO_BUTTON_NEXT_LEFT = LEFT + SIZE + 8;
export const DEMO_BUTTON_SIZE = SIZE;
export const DEMO_BUTTON_BOTTOM = GAP;

// space the left rail leaves free at the bottom so the button never covers it
export const DEMO_BUTTON_CLEARANCE = GAP * 2 + SIZE;

/**
 * Fixed button in the bottom-left corner that switches between the regular
 * view (map + option panels) and the demo view (map, metrics, spare space)
 */
export default function DemoModeButton({ demoMode, onToggle }) {
  const label = demoMode ? "Exit demo mode" : "Demo mode";
  return (
    <Tooltip title={label} placement="right">
      <Paper
        elevation={0}
        sx={{
          position: "fixed",
          left: LEFT,
          bottom: GAP,
          width: SIZE,
          height: SIZE,
          zIndex: 1000,
          borderRadius: "18px",
          border: "1px solid",
          borderColor: "divider",
          boxShadow: "0 12px 32px rgba(0,0,0,0.45)",
        }}
      >
        <IconButton
          aria-label={label}
          aria-pressed={demoMode}
          onClick={onToggle}
          sx={{
            width: "100%",
            height: "100%",
            borderRadius: "inherit",
            "& svg": { fontSize: 24 },
            color: demoMode ? "text.primary" : "text.secondary",
            backgroundColor: demoMode ? "rgba(255,255,255,0.14)" : "transparent",
            "&:hover": {
              backgroundColor: "rgba(255,255,255,0.12)",
              color: "text.primary",
            },
          }}
        >
          {demoMode ? <TuneRoundedIcon /> : <ViewQuiltRoundedIcon />}
        </IconButton>
      </Paper>
    </Tooltip>
  );
}
