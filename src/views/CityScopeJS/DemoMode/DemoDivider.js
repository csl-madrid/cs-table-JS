import { Box } from "@mui/material";
import { DEMO_GAP, DEMO_MIN_BOX } from "./layout";

// extra px that can be grabbed on each side of the gap, which is thin
const GRAB = 6;

/**
 * The strip between two boxes, to drag. It reports where the pointer puts the
 * split (`onDrag`, while dragging; `onDrop`, when let go) as the share of the
 * split's room the first side gets, never leaving either side under the
 * minimum size
 */
export default function DemoDivider({ divider, onDrag, onDrop }) {
  const isCol = divider.dir === "col";

  const ratioAt = (event) => {
    const { node } = divider;
    const room = (isCol ? node.width : node.height) - DEMO_GAP;
    const pointer = isCol ? event.clientX - node.left : event.clientY - node.top;
    // centered on the gap, so the strip stays under the pointer
    const ratio = (pointer - DEMO_GAP / 2) / room;
    const min = Math.min(DEMO_MIN_BOX / room, 0.5);
    return Math.min(Math.max(ratio, min), 1 - min);
  };

  const { rect } = divider;
  return (
    <Box
      role="separator"
      aria-orientation={isCol ? "vertical" : "horizontal"}
      onPointerDown={(e) => e.currentTarget.setPointerCapture(e.pointerId)}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          onDrag(divider.id, ratioAt(e));
        }
      }}
      onPointerUp={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
          onDrop(divider.id, ratioAt(e));
        }
      }}
      onPointerCancel={() => onDrop(divider.id, null)}
      sx={{
        position: "absolute",
        zIndex: 2,
        left: isCol ? rect.left - GRAB : rect.left,
        top: isCol ? rect.top : rect.top - GRAB,
        width: isCol ? rect.width + 2 * GRAB : rect.width,
        height: isCol ? rect.height : rect.height + 2 * GRAB,
        cursor: isCol ? "col-resize" : "row-resize",
        touchAction: "none",
        // a line in the middle of the gap, shown when it can be grabbed
        "&::after": {
          content: '""',
          position: "absolute",
          borderRadius: "2px",
          backgroundColor: "rgba(255,255,255,0.45)",
          opacity: 0,
          transition: "opacity 0.15s ease",
          ...(isCol
            ? { left: "50%", top: "50%", width: 3, height: 48, transform: "translate(-50%, -50%)" }
            : { left: "50%", top: "50%", width: 48, height: 3, transform: "translate(-50%, -50%)" }),
        },
        "&:hover::after, &:active::after": { opacity: 1 },
      }}
    />
  );
}
