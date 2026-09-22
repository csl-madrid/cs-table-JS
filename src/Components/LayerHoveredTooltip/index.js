import { Typography, Box } from "@mui/material";

export const LayerHoveredTooltip = (props) => {
  if (!props.mousePos) return null;
  const mousePos = props.mousePos;
  const layerHoveredData = props.layerHoveredData;

  return (
    <Box
      sx={{
        position: "fixed",
        left: mousePos.clientX - 100,
        top: mousePos.clientY,
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        pointerEvents: "none",
        maxWidth: 280,
        px: 1.5,
        py: 1,
        borderRadius: "12px",
        border: "1px solid",
        borderColor: "divider",
        color: "text.primary",
        // frosted glass, same look as the side panels
        backgroundColor: "rgba(17,17,17,0.72)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        boxShadow: "0 12px 32px rgba(0,0,0,0.45)",
      }}
    >
      <Typography variant="caption">
        {layerHoveredData && layerHoveredData}
      </Typography>
    </Box>
  );
};
