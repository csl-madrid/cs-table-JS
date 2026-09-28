import { Box } from "@mui/material";

// spare space in the demo view, for content that is still to be defined
export default function DemoPlaceholderPanel() {
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
