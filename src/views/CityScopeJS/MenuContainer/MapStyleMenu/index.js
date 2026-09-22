import { Box, ButtonBase, Typography } from "@mui/material";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import { MAP_STYLES, useMapStyle } from "../../../../Components/MapStyleContext";

export default function MapStyleMenu() {
  const { mapStyle, setMapStyleId } = useMapStyle();

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {MAP_STYLES.map((s) => {
        const selected = s.id === mapStyle.id;
        return (
          <ButtonBase
            key={s.id}
            aria-pressed={selected}
            onClick={() => setMapStyleId(s.id)}
            sx={{
              display: "flex",
              justifyContent: "flex-start",
              alignItems: "center",
              gap: 1.5,
              p: 1,
              textAlign: "left",
              borderRadius: "14px",
              border: "1px solid",
              borderColor: selected ? "primary.main" : "divider",
              backgroundColor: selected
                ? "rgba(255,255,255,0.08)"
                : "transparent",
              transition: "background-color 0.2s ease, border-color 0.2s ease",
              "&:hover": {
                backgroundColor: selected
                  ? "rgba(255,255,255,0.12)"
                  : "rgba(255,255,255,0.04)",
              },
              "@media (prefers-reduced-motion: reduce)": { transition: "none" },
            }}
          >
            <Box
              sx={{
                flexShrink: 0,
                width: 44,
                height: 44,
                borderRadius: "10px",
                border: "1px solid",
                borderColor: "divider",
                background: s.preview,
              }}
            />
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography variant="subtitle2" noWrap>
                {s.name}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                noWrap
                component="div"
              >
                {s.description}
              </Typography>
            </Box>
            {selected && <CheckRoundedIcon fontSize="small" />}
          </ButtonBase>
        );
      })}
    </Box>
  );
}
