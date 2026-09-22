import { useState } from "react";
import {
  Box,
  Collapse,
  IconButton,
  Paper,
  Tooltip,
  Typography,
} from "@mui/material";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ResizableDrawer from "./ResizableDrawer";

const RAIL_WIDTH = 62;
const GAP = 12;
const EASING = "cubic-bezier(0.2, 0.8, 0.2, 1)";

/**
 * Icon rail + floating panel that shows one section at a time
 * (or several at once with `multiple`).
 * Sections are hidden, never unmounted: they may hold local state
 * (and some sync it to the Redux store), so remounting would reset it.
 *
 * - side: "left" | "right"
 * - sections: [{ id, title, subheader, icon, component, toolTipInfo? }]
 * - defaultSection: id of the section open at start (all closed if omitted)
 * - multiple: allow several sections open at the same time
 * - width: initial panel width in px
 * - railTop: optional node at the top of the rail (e.g. an avatar)
 * - header: optional node at the top of the panel
 */
export default function SectionPanel({
  side = "left",
  sections,
  defaultSection,
  multiple = false,
  width = 320,
  railTop,
  header,
}) {
  const isRight = side === "right";
  // ids of the sections currently shown (empty = none)
  const [activeIds, setActiveIds] = useState(
    defaultSection ? [defaultSection] : []
  );
  const [panelVisible, setPanelVisible] = useState(true);
  const isActive = (id) => activeIds.includes(id);
  // the panel is on screen only when it has at least one section open
  const shown = panelVisible && activeIds.length > 0;

  // Opening a section always brings the panel back.
  // Single mode: clicking another section switches to it, clicking the active one closes it.
  // Multiple mode: each click toggles only that section.
  const toggleSection = (id) => {
    setPanelVisible(true);
    setActiveIds((prev) => {
      const wasOn = panelVisible && prev.includes(id);
      if (multiple) {
        return wasOn ? prev.filter((x) => x !== id) : [...new Set([...prev, id])];
      }
      return wasOn ? [] : [id];
    });
  };

  // the arrow hides the panel, or brings it back (opening the first
  // section when everything is closed)
  const togglePanel = () => {
    if (shown) {
      setPanelVisible(false);
      return;
    }
    setPanelVisible(true);
    if (activeIds.length === 0) {
      const first = defaultSection ?? sections[0]?.id;
      if (first) setActiveIds([first]);
    }
  };

  const railButtonSx = (active) => ({
    width: 45,
    height: 45,
    "& svg": { fontSize: 26 },
    color: active ? "text.primary" : "text.secondary",
    backgroundColor: active ? "rgba(255,255,255,0.14)" : "transparent",
    transition:
      "background-color 0.2s ease, color 0.2s ease, transform 0.15s ease",
    "&:hover": {
      backgroundColor: active
        ? "rgba(255,255,255,0.2)"
        : "rgba(255,255,255,0.08)",
      color: "text.primary",
    },
    "&:active": { transform: "scale(0.92)" },
    "@media (prefers-reduced-motion: reduce)": { transition: "none" },
  });

  const tooltipPlacement = isRight ? "left" : "right";

  return (
    <>
      {/* icon rail */}
      <Paper
        elevation={0}
        sx={{
          position: "fixed",
          top: GAP,
          bottom: GAP,
          left: isRight ? undefined : GAP,
          right: isRight ? GAP : undefined,
          width: RAIL_WIDTH,
          zIndex: 101,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 1.25,
          py: 1.75,
          borderRadius: "28px",
          border: "1px solid",
          borderColor: "divider",
          boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
        }}
      >
        {railTop && (
          <>
            {railTop}
            <Box
              sx={{ width: 28, height: "1px", bgcolor: "divider" }}
            />
          </>
        )}

        {sections.map((s) => {
          const active = shown && isActive(s.id);
          return (
            <Tooltip key={s.id} title={s.title} placement={tooltipPlacement}>
              <IconButton
                aria-label={s.title}
                aria-pressed={active}
                onClick={() => toggleSection(s.id)}
                sx={railButtonSx(active)}
              >
                {s.icon}
              </IconButton>
            </Tooltip>
          );
        })}

        <Box sx={{ flexGrow: 1 }} />

        <Tooltip
          title={shown ? "Hide panel" : "Show panel"}
          placement={tooltipPlacement}
        >
          <IconButton
            aria-label={shown ? "Hide panel" : "Show panel"}
            onClick={togglePanel}
            sx={railButtonSx(false)}
          >
            <ChevronLeftRoundedIcon
              sx={{
                // the arrow always points towards where the panel will go
                transform:
                  shown === isRight ? "rotate(180deg)" : "none",
                transition: `transform 0.3s ${EASING}`,
              }}
            />
          </IconButton>
        </Tooltip>
      </Paper>

      <ResizableDrawer
        direction={side}
        width={width}
        offset={RAIL_WIDTH + GAP}
        open={shown}
      >
        <Box sx={{ p: 1.5, pb: header ? 1.5 : 0 }}>
          {header}
          {sections.map((s) => (
            // Collapse animates the height but keeps children mounted
            <Collapse
              key={s.id}
              in={isActive(s.id)}
              timeout={300}
              easing={EASING}
            >
              <Box
                sx={{
                  mt: header ? 1.5 : 0,
                  mb: header ? 0 : 1.5,
                  p: 2,
                  borderRadius: "20px",
                  border: "1px solid",
                  borderColor: "divider",
                  backgroundColor: "rgba(255,255,255,0.03)",
                  opacity: isActive(s.id) ? 1 : 0,
                  transition: "opacity 0.25s ease",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", mb: 1.5 }}>
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      mr: 1.5,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "10px",
                      color: "primary.main",
                      backgroundColor: "rgba(255,255,255,0.06)",
                      "& svg": { fontSize: 18 },
                    }}
                  >
                    {s.icon}
                  </Box>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography variant="subtitle2" noWrap>
                      {s.title}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      noWrap
                      component="div"
                    >
                      {s.subheader}
                    </Typography>
                  </Box>
                  {s.toolTipInfo && (
                    <Tooltip
                      placement="top"
                      title={<Typography>{s.toolTipInfo}</Typography>}
                    >
                      <InfoOutlinedIcon
                        fontSize="small"
                        sx={{ color: "text.secondary", mx: 0.5 }}
                      />
                    </Tooltip>
                  )}
                  <IconButton
                    size="small"
                    aria-label={`Hide ${s.title}`}
                    onClick={() => toggleSection(s.id)}
                    sx={{ color: "text.secondary" }}
                  >
                    <CloseRoundedIcon fontSize="small" />
                  </IconButton>
                </Box>
                {s.component}
              </Box>
            </Collapse>
          ))}
        </Box>
      </ResizableDrawer>
    </>
  );
}
