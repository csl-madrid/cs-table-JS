import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Box,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Tooltip,
} from "@mui/material";
import GridViewRoundedIcon from "@mui/icons-material/GridViewRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import { setPreset } from "../../../redux/reducers/demoLayoutSlice";
import {
  DEMO_BUTTON_NEXT_LEFT,
  DEMO_BUTTON_SIZE,
  DEMO_BUTTON_BOTTOM,
} from "./DemoModeButton";
import { DEMO_PRESETS } from "./layout";
import { assignIds, computeLayout } from "./layoutTree";

const THUMB_WIDTH = 44;
const THUMB_HEIGHT = 30;
const THUMB_GAP = 3;

/** Small drawing of a layout: its boxes on a miniature screen */
function PresetThumb({ preset }) {
  const { boxes } = computeLayout(
    assignIds(preset.tree).tree,
    THUMB_WIDTH,
    THUMB_HEIGHT,
    THUMB_GAP
  );
  return (
    <Box
      sx={{
        position: "relative",
        flexShrink: 0,
        width: THUMB_WIDTH,
        height: THUMB_HEIGHT,
        mr: 1.5,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: "5px",
      }}
    >
      {Object.entries(boxes).map(([id, r]) => (
        <Box
          key={id}
          sx={{
            position: "absolute",
            left: r.left,
            top: r.top,
            width: r.width,
            height: r.height,
            borderRadius: "2px",
            backgroundColor: "rgba(255,255,255,0.28)",
          }}
        />
      ))}
    </Box>
  );
}

/**
 * Button next to the demo-mode one, only in the demo view, to choose the
 * layout of its boxes
 */
export default function DemoPresetButton({ demoMode }) {
  const dispatch = useDispatch();
  const presetId = useSelector((state) => state.demoLayoutState.presetId);
  const [anchorEl, setAnchorEl] = useState(null);

  if (!demoMode) return null;

  return (
    <>
      <Tooltip title="Layout" placement="top">
        <Paper
          elevation={0}
          sx={{
            position: "fixed",
            left: DEMO_BUTTON_NEXT_LEFT,
            bottom: DEMO_BUTTON_BOTTOM,
            width: DEMO_BUTTON_SIZE,
            height: DEMO_BUTTON_SIZE,
            zIndex: 1000,
            borderRadius: "18px",
            border: "1px solid",
            borderColor: "divider",
            boxShadow: "0 12px 32px rgba(0,0,0,0.45)",
          }}
        >
          <IconButton
            aria-label="Layout"
            onClick={(e) => setAnchorEl(e.currentTarget)}
            sx={{
              width: "100%",
              height: "100%",
              borderRadius: "inherit",
              color: "text.secondary",
              "& svg": { fontSize: 24 },
              "&:hover": {
                backgroundColor: "rgba(255,255,255,0.12)",
                color: "text.primary",
              },
            }}
          >
            <GridViewRoundedIcon />
          </IconButton>
        </Paper>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "top", horizontal: "left" }}
        transformOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        {DEMO_PRESETS.map((preset) => (
          <MenuItem
            key={preset.id}
            selected={preset.id === presetId}
            onClick={() => {
              setAnchorEl(null);
              dispatch(setPreset({ presetId: preset.id }));
            }}
          >
            <ListItemIcon sx={{ minWidth: 0 }}>
              <PresetThumb preset={preset} />
            </ListItemIcon>
            <ListItemText>{preset.name}</ListItemText>
            {preset.id === presetId && (
              <CheckRoundedIcon fontSize="small" sx={{ ml: 2 }} />
            )}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
