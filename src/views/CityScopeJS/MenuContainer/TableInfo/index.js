import { useSelector } from "react-redux";
import { Avatar, Box, Typography } from "@mui/material";

// variant "avatar": round badge with the table initials (used in the rail)
// variant "header": overline + table name (used at the top of the panel)
function TableInfo({ variant = "header" }) {
  const cityIOtableName = useSelector(
    (state) => state.cityIOdataState.cityIOtableName
  );

  if (variant === "avatar") {
    return (
      <Avatar
        sx={{
          width: 45,
          height: 45,
          fontSize: 15,
          fontWeight: 600,
          bgcolor: "primary.main",
          color: "primary.contrastText",
        }}
      >
        {(cityIOtableName || "CS").slice(0, 2).toUpperCase()}
      </Avatar>
    );
  }

  return (
    <Box sx={{ px: 1, pt: 1, pb: 0.5 }}>
      <Typography variant="overline" color="text.secondary">
        CityScope
      </Typography>
      <Typography variant="h4" noWrap title={cityIOtableName}>
        {cityIOtableName}
      </Typography>
    </Box>
  );
}

export default TableInfo;
