import { useState } from "react";
import { useDispatch } from "react-redux";
import {
  Box,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Tooltip,
  Typography,
} from "@mui/material";
import SwapHorizRoundedIcon from "@mui/icons-material/SwapHorizRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import BlockOutlinedIcon from "@mui/icons-material/BlockOutlined";
import VerticalSplitRoundedIcon from "@mui/icons-material/VerticalSplitRounded";
import HorizontalSplitRoundedIcon from "@mui/icons-material/HorizontalSplitRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import {
  setSlotModule,
  splitBox,
  removeBox,
} from "../../../redux/reducers/demoLayoutSlice";
import { MODULES, getModule } from "../modules";
import {
  DEMO_TRANSITION_MS,
  DEMO_EASING,
  DEMO_GAP,
  EMPTY_MODULE_ID,
} from "./layout";

// not a module: what a slot shows when nothing is chosen for it
const EMPTY_OPTION = {
  id: EMPTY_MODULE_ID,
  title: "Empty",
  subheader: "",
  icon: <BlockOutlinedIcon />,
};

const noMotion = {
  "@media (prefers-reduced-motion: reduce)": { transition: "none" },
};
// height taken by the title row of a box, and the room kept under its content
const HEADER_HEIGHT = 78;
const CONTENT_BOTTOM = 16;
// room kept under the content of a box that has the demo buttons over it
const BUTTON_CLEARANCE = 72;

/**
 * Menu on the corner of a box: which module it shows, and splitting it in two
 * or removing it
 */
function SlotSelector({ slot, moduleId, canSplitCol, canSplitRow, canRemove }) {
  const dispatch = useDispatch();
  const [anchorEl, setAnchorEl] = useState(null);

  const choose = (id) => {
    setAnchorEl(null);
    dispatch(setSlotModule({ slot, moduleId: id }));
  };
  const run = (action) => {
    setAnchorEl(null);
    dispatch(action);
  };

  return (
    <>
      <Tooltip title="Box options" placement="left">
        <IconButton
          aria-label="Box options"
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{
            position: "absolute",
            top: 12,
            right: 12,
            zIndex: 2,
            width: 36,
            height: 36,
            color: "text.secondary",
            border: "1px solid",
            borderColor: "divider",
            backgroundColor: "rgba(17,17,17,0.72)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            "&:hover": {
              color: "text.primary",
              backgroundColor: "rgba(40,40,40,0.85)",
            },
            // the map's box lets mouse events through to the map: this button
            // is the one part of it that has to catch them
            pointerEvents: "auto",
          }}
        >
          <SwapHorizRoundedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        {[...MODULES, EMPTY_OPTION].map((m) => (
          <MenuItem
            key={m.id}
            selected={m.id === moduleId}
            onClick={() => choose(m.id)}
          >
            <ListItemIcon sx={{ color: "inherit" }}>{m.icon}</ListItemIcon>
            <ListItemText>{m.title}</ListItemText>
            {m.comingSoon && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ ml: 2 }}
              >
                soon
              </Typography>
            )}
            {m.id === moduleId && (
              <CheckRoundedIcon fontSize="small" sx={{ ml: 2 }} />
            )}
          </MenuItem>
        ))}
        <Divider />
        <MenuItem
          disabled={!canSplitCol}
          onClick={() => run(splitBox({ slot, dir: "col" }))}
        >
          <ListItemIcon sx={{ color: "inherit" }}>
            <VerticalSplitRoundedIcon />
          </ListItemIcon>
          <ListItemText>Split right</ListItemText>
        </MenuItem>
        <MenuItem
          disabled={!canSplitRow}
          onClick={() => run(splitBox({ slot, dir: "row" }))}
        >
          <ListItemIcon sx={{ color: "inherit" }}>
            <HorizontalSplitRoundedIcon />
          </ListItemIcon>
          <ListItemText>Split down</ListItemText>
        </MenuItem>
        <MenuItem
          disabled={!canRemove}
          onClick={() => run(removeBox({ slot }))}
        >
          <ListItemIcon sx={{ color: "inherit" }}>
            <CloseRoundedIcon />
          </ListItemIcon>
          <ListItemText>Remove box</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}

/** What a box shows for a module that is rendered inside it (not persistent) */
function ModuleCard({ module, clearsButton }) {
  const isEmpty = module.id === EMPTY_MODULE_ID;
  const Content = module.component;
  // A box in the bottom-left corner has the demo-mode buttons floating over
  // it, so it keeps more room under the content
  const bottomRoom = clearsButton ? BUTTON_CLEARANCE : CONTENT_BOTTOM;

  if (isEmpty) {
    return (
      <Box
        sx={{
          height: "100%",
          borderRadius: "28px",
          border: "1px dashed",
          borderColor: "divider",
        }}
      />
    );
  }

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
      {/* right padding keeps the title clear of the selector on the corner */}
      <Box sx={{ pl: 3, pr: 8, pt: 2.5, pb: 2, minHeight: HEADER_HEIGHT }}>
        <Typography variant="h6" noWrap>
          {module.title}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap>
          {module.subheader}
        </Typography>
      </Box>

      {/* All the room the title leaves: the module fills it (`fill`), whatever
          the shape of the box, so it adapts to any layout. The module is
          positioned inside this box, whose size comes from the layout alone */}
      <Box
        sx={{
          position: "relative",
          flexGrow: 1,
          minHeight: 0,
          mx: 3,
          mb: `${bottomRoom}px`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {Content ? (
          <Content fill />
        ) : (
          <Typography variant="caption" color="text.secondary">
            Coming soon
          </Typography>
        )}
      </Box>
    </Paper>
  );
}

/**
 * One box of the demo view, placed at `rect` over the screen, showing the
 * module it is given and with a menu on its corner to change it, split the box
 * or remove it.
 * A persistent module (the map) is not rendered here: it lives in its own
 * element that moves over its box (see PersistentModuleHost), so the box is
 * left transparent for it
 */
export default function DemoSlot({
  slot,
  moduleId,
  rect,
  windowSize,
  visible,
  canSplitCol,
  canSplitRow,
  canRemove,
}) {
  const module = getModule(moduleId) || EMPTY_OPTION;
  const isPersistent = Boolean(module.persistent);
  const clearsButton =
    rect.left <= DEMO_GAP + 1 &&
    rect.top + rect.height >= windowSize.height - DEMO_GAP - 1;

  return (
    <Box
      sx={{
        position: "absolute",
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        zIndex: 1,
        opacity: visible ? 1 : 0,
        // fades with the rest of the view; no transition on the position, so
        // resizing the window doesn't make the boxes lag behind it
        transition: `opacity ${DEMO_TRANSITION_MS}ms ${DEMO_EASING}`,
        // while fading out it must not catch clicks; over the map it lets
        // them through (only the selector button catches them)
        pointerEvents: visible && !isPersistent ? "auto" : "none",
        ...noMotion,
      }}
    >
      {!isPersistent && (
        <ModuleCard module={module} clearsButton={clearsButton} />
      )}
      {visible && (
        <SlotSelector
          slot={slot}
          moduleId={module.id}
          canSplitCol={canSplitCol}
          canSplitRow={canSplitRow}
          canRemove={canRemove}
        />
      )}
    </Box>
  );
}
