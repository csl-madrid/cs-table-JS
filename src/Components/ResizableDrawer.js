import { useState, useCallback, useRef } from "react";
import { Box } from "@mui/material";
import Paper from "@mui/material/Paper";

// distance between the floating panel and the window edge
const GAP = 12;
// width of the (invisible) area that catches the resize gesture
const HANDLE_W = 16;
const MIN_WIDTH = 200;
const MOTION = "0.3s cubic-bezier(0.2, 0.8, 0.2, 1)";

/**
 * Floating, resizable side panel.
 * - direction: "left" | "right"
 * - width: initial width in px
 * - offset: extra space (px) between the window edge and the panel, e.g. to leave room for a rail
 * - open: hides the panel without unmounting its children (keeps their state)
 */
export default function ResizableDrawer({
  children,
  direction = "left",
  width,
  offset = 0,
  open = true,
}) {
  const [drawerWidth, setDrawerWidth] = useState(
    width || window.innerWidth / 2
  );
  const [collapsed, setCollapsed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragged = useRef(false);

  const isRight = direction === "right";
  const edge = GAP + offset;
  const visible = open && !collapsed;

  const handleMouseMove = useCallback(
    (e) => {
      dragged.current = true;
      const newWidth = isRight
        ? window.innerWidth - e.clientX - edge
        : e.clientX - edge;
      const maxWidth = window.innerWidth * 0.6;
      setDrawerWidth(Math.min(Math.max(newWidth, MIN_WIDTH), maxWidth));
    },
    [isRight, edge]
  );

  const handleMouseDown = (e) => {
    dragged.current = false;
    setDragging(true);
    const handleMouseUp = () => {
      document.removeEventListener("mouseup", handleMouseUp, true);
      document.removeEventListener("mousemove", handleMouseMove, true);
      setDragging(false);
    };
    document.addEventListener("mouseup", handleMouseUp, true);
    document.addEventListener("mousemove", handleMouseMove, true);
    e.preventDefault();
  };

  // a plain click on the handle (not a drag) shows / hides the panel
  const handleClick = () => {
    if (!dragged.current) setCollapsed((c) => !c);
  };

  return (
    <>
      <Paper
        elevation={0}
        sx={{
          position: "fixed",
          top: GAP,
          bottom: GAP,
          left: isRight ? undefined : edge,
          right: isRight ? edge : undefined,
          width: drawerWidth,
          zIndex: 100,
          overflow: "hidden",
          borderRadius: "24px",
          border: "1px solid",
          borderColor: "divider",
          boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
          // children stay mounted so their local state is kept
          visibility: visible ? "visible" : "hidden",
          opacity: visible ? 1 : 0,
          // slides in from / out towards its own edge
          transform: visible
            ? "translateX(0) scale(1)"
            : `translateX(${isRight ? 32 : -32}px) scale(0.97)`,
          transformOrigin: isRight ? "right center" : "left center",
          transition: `transform ${MOTION}, opacity 0.22s ease, visibility 0.3s`,
          "@media (prefers-reduced-motion: reduce)": { transition: "none" },
        }}
      >
        <Box
          sx={{
            height: "100%",
            overflowY: "auto",
            overflowX: "hidden",
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(255,255,255,0.15) transparent",
          }}
        >
          {children}
        </Box>
      </Paper>

      {/* resize handle: a discreet pill centered on the panel edge */}
      <Box
        onMouseDown={handleMouseDown}
        onClick={handleClick}
        sx={{
          position: "fixed",
          top: "50%",
          transform: "translateY(-50%)",
          width: HANDLE_W,
          height: 96,
          left: isRight
            ? undefined
            : (visible ? edge + drawerWidth : edge) - HANDLE_W / 2,
          right: isRight
            ? (visible ? edge + drawerWidth : edge) - HANDLE_W / 2
            : undefined,
          zIndex: 1000,
          cursor: "col-resize",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          // no transition while dragging so the handle sticks to the cursor
          transition: dragging
            ? "none"
            : `left ${MOTION}, right ${MOTION}, opacity 0.22s ease`,
          "@media (prefers-reduced-motion: reduce)": { transition: "none" },
          "& > span": {
            width: 4,
            height: 40,
            borderRadius: 2,
            backgroundColor: dragging ? "#fff" : "rgba(255,255,255,0.25)",
            transition: "background-color 0.15s ease, height 0.2s ease",
          },
          "&:hover > span": {
            backgroundColor: "#fff",
            height: 56,
          },
        }}
      >
        <span />
      </Box>
    </>
  );
}
