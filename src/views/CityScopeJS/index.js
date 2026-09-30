import { useEffect, useState } from "react";
import { Box } from "@mui/material";
import CityIO from "../../Components/CityIO";
import { useSelector } from "react-redux";
import MenuContainer from "./MenuContainer";
import DeckGLMap from "./DeckglMap/index";
import VisContainer from "./VisContainer";
import { MapStyleProvider } from "../../Components/MapStyleContext";
import DemoModeButton from "./DemoMode/DemoModeButton";
import DemoMetricsPanel from "./DemoMode/DemoMetricsPanel";
import DemoPlaceholderPanel from "./DemoMode/DemoPlaceholderPanel";
import {
  DEMO_TRANSITION_MS,
  DEMO_EASING,
  DEMO_GAP,
  DEMO_METRICS_SHARE,
  targetMapSize,
} from "./DemoMode/layout";

// the metrics column, relative to the map column, in `fr` units
const METRICS_FR = DEMO_METRICS_SHARE / (1 - DEMO_METRICS_SHARE);
const noMotion = { "@media (prefers-reduced-motion: reduce)": { transition: "none" } };
const fade = `opacity ${DEMO_TRANSITION_MS}ms ${DEMO_EASING}`;

// window size, to know the size the map box will have in each view
const useWindowSize = () => {
  const read = () => ({ width: window.innerWidth, height: window.innerHeight });
  const [size, setSize] = useState(read);
  useEffect(() => {
    const onResize = () => setSize(read());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return size;
};

export default function CityScopeJS() {
  const cityIOisDone = useSelector(
    (state) => state.cityIOdataState.cityIOisDone
  );
  const tableName = useSelector(
    (state) => state.cityIOdataState.cityIOtableName
  );
  // demo view: map, metrics and a spare area, instead of map + option panels
  const [demoMode, setDemoMode] = useState(false);
  // the metrics and the spare box exist only while the demo view is (or is
  // still animating out of) on screen
  const [demoPanelsMounted, setDemoPanelsMounted] = useState(false);
  const windowSize = useWindowSize();
  const mapSize = targetMapSize(demoMode, windowSize.width, windowSize.height);

  useEffect(() => {
    if (demoMode) {
      setDemoPanelsMounted(true);
      return;
    }
    const timer = setTimeout(
      () => setDemoPanelsMounted(false),
      DEMO_TRANSITION_MS + 50
    );
    return () => clearTimeout(timer);
  }, [demoMode]);

  return (
    <>
      {/* if we got a cityIO table name, start cityIO module */}
      {tableName && <CityIO tableName={tableName} />}
      {/* if cityIO module is done loading, start the CSjs app */}
      {cityIOisDone && (
        <MapStyleProvider>
          {/* One grid for both views: in the regular one the map takes it all
              (the other tracks are 0 wide/high), in the demo one the tracks
              open up. Animating the tracks is what makes the switch glide.
              The map stays in the same place of this tree, so switching never
              remounts it (which would lose unsent edits and reload the tiles) */}
          <Box
            sx={{
              position: "fixed",
              inset: 0,
              display: "grid",
              gridTemplateColumns: demoMode ? `${METRICS_FR}fr 1fr` : "0fr 1fr",
              gridTemplateRows: demoMode ? "1fr 1fr" : "1fr 0fr",
              gap: demoMode ? `${DEMO_GAP}px` : "0px",
              padding: demoMode ? `${DEMO_GAP}px` : "0px",
              overflow: "hidden",
              bgcolor: "background.default",
              transition: [
                "grid-template-columns",
                "grid-template-rows",
                "gap",
                "padding",
              ]
                .map((p) => `${p} ${DEMO_TRANSITION_MS}ms ${DEMO_EASING}`)
                .join(", "),
              ...noMotion,
            }}
          >
            {demoPanelsMounted && (
              <Box
                sx={{
                  gridColumn: 1,
                  gridRow: "1 / span 2",
                  minWidth: 0,
                  minHeight: 0,
                  overflow: "hidden",
                  opacity: demoMode ? 1 : 0,
                  transition: fade,
                  ...noMotion,
                }}
              >
                {/* its final width, so the panel is uncovered rather than
                    squeezed while the column opens */}
                <Box
                  sx={{
                    height: "100%",
                    width: `calc((100vw - ${3 * DEMO_GAP}px) * ${DEMO_METRICS_SHARE})`,
                  }}
                >
                  <DemoMetricsPanel />
                </Box>
              </Box>
            )}
            <Box
              sx={{
                gridColumn: 2,
                gridRow: 1,
                position: "relative",
                overflow: "hidden",
                minWidth: 0,
                minHeight: 0,
                borderRadius: demoMode ? "28px" : "0px",
                boxShadow: `0 0 0 1px rgba(255,255,255,${demoMode ? 0.08 : 0})`,
                transition: `border-radius ${DEMO_TRANSITION_MS}ms ${DEMO_EASING}, box-shadow ${DEMO_TRANSITION_MS}ms ${DEMO_EASING}`,
                ...noMotion,
              }}
            >
              <DeckGLMap demoMode={demoMode} mapSize={mapSize} />
            </Box>
            {demoPanelsMounted && (
              <Box
                sx={{
                  gridColumn: 2,
                  gridRow: 2,
                  minWidth: 0,
                  minHeight: 0,
                  overflow: "hidden",
                  opacity: demoMode ? 1 : 0,
                  transition: fade,
                  ...noMotion,
                }}
              >
                <DemoPlaceholderPanel />
              </Box>
            )}
          </Box>
          {/* hidden, not unmounted: their sections keep local state. They
              fade out first and only then stop taking clicks */}
          <Box
            sx={
              demoMode
                ? {
                    opacity: 0,
                    visibility: "hidden",
                    transition: `${fade}, visibility 0s linear ${DEMO_TRANSITION_MS}ms`,
                  }
                : { opacity: 1, visibility: "visible", transition: fade }
            }
          >
            <MenuContainer />
            <VisContainer />
          </Box>
          <DemoModeButton
            demoMode={demoMode}
            onToggle={() => setDemoMode((on) => !on)}
          />
        </MapStyleProvider>
      )}
    </>
  );
}
