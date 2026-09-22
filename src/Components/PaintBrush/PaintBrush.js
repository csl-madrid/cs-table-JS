import { testHex, hexToRgb } from "../../utils/utils";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { Typography, Box } from "@mui/material";

/**
 * cell selection
 * meta div
 * @param {*} props
 */

export const PaintBrush = (props) => {
  if (!props.mousePos || !props.hoveredCells) return null;
  const selectedType = props.selectedType;
  const isInteractiveCell = props.hoveredCells.object.properties.interactive;
  const mousePos = props.mousePos;
  const divSize = props.divSize;
  let col = selectedType.color;
  if (testHex(col)) {
    col = hexToRgb(col);
  }
  const color = "rgb(" + col[0] + "," + col[1] + "," + col[2] + ")";
  const colorTrans = "rgba(" + col[0] + "," + col[1] + "," + col[2] + ",0.6)";
  let mouseX = mousePos.clientX - divSize / 2;
  let mouseY = mousePos.clientY - divSize / 2;
  return (
    <>
      <Box
        sx={{
          border: isInteractiveCell ? "3px solid" : "1px dashed",
          borderRadius: "6px",
          position: "fixed",
          backgroundColor:
            props.mouseDown && isInteractiveCell ? colorTrans : "rgba(0,0,0,0)",
          padding: "1vw",
          color: color,
          borderColor: color,
          zIndex: 10,
          pointerEvents: "none",
          width: divSize,
          height: divSize,
          left: mouseX,
          top: mouseY,
        }}
      />

      <Box
        sx={{
          position: "fixed",
          left: mouseX + divSize + 10,
          top: mouseY - 10,
          display: "flex",
          flexDirection: "column",
          m: 1,
          px: 1.5,
          py: 1,
          pointerEvents: "none",
          zIndex: 10,
          color: color,
          // frosted glass, same look as the side panels
          borderRadius: "12px",
          border: "1px solid",
          borderColor: "divider",
          backgroundColor: "rgba(17,17,17,0.72)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          boxShadow: "0 12px 32px rgba(0,0,0,0.45)",
        }}
      >
        <Typography variant="caption">
          {isInteractiveCell && <strong>{selectedType.thisTypeName}</strong>}
        </Typography>
        {!isInteractiveCell && (
          <>
            <ErrorOutlineIcon sx={{ color: color }} />
            <Typography variant="caption">
              <strong>{selectedType.thisTypeName}</strong>
            </Typography>
            <Typography variant="caption">
              Cell {props.hoveredCells.object.properties.id} is not interactive
            </Typography>
          </>
        )}
      </Box>
    </>
  );
};
