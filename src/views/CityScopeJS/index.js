import { useEffect, useLayoutEffect, useRef, useState } from "react";
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

const DEMO_GAP = 12;
// the metrics take the full height on the left, a bit less than half the screen
const DEMO_METRICS_WIDTH = "44%";

export default function CityScopeJS() {
  const cityIOisDone = useSelector(
    (state) => state.cityIOdataState.cityIOisDone
  );
  const tableName = useSelector(
    (state) => state.cityIOdataState.cityIOtableName
  );
  // demo view: map, metrics and a spare area, instead of map + option panels
  const [demoMode, setDemoMode] = useState(false);
  // size of the box the map lives in, so the camera can be framed for it
  const mapCellRef = useRef(null);
  const [mapSize, setMapSize] = useState();

  const measureMap = () => {
    const cell = mapCellRef.current;
    if (!cell) return;
    const width = cell.clientWidth;
    const height = cell.clientHeight;
    setMapSize((prev) =>
      prev && prev.width === width && prev.height === height
        ? prev
        : { width, height }
    );
  };

  // measured as soon as the layout changes, before the browser paints (a
  // ResizeObserver alone only reports once the page is being rendered), and
  // again on any later resize of the box
  useLayoutEffect(measureMap, [demoMode, cityIOisDone]);
  useEffect(() => {
    const cell = mapCellRef.current;
    if (!cell) return;
    const observer = new ResizeObserver(measureMap);
    observer.observe(cell);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityIOisDone]);

  return (
    <>
      {/* if we got a cityIO table name, start cityIO module */}
      {tableName && <CityIO tableName={tableName} />}
      {/* if cityIO module is done loading, start the CSjs app */}
      {cityIOisDone && (
        <MapStyleProvider>
          {/* The map stays in the same place of this tree in both modes, so
              switching never remounts it (which would lose unsent edits) */}
          <Box
            sx={
              demoMode
                ? {
                    position: "fixed",
                    inset: 0,
                    display: "grid",
                    gridTemplateColumns: `${DEMO_METRICS_WIDTH} 1fr`,
                    gridTemplateRows: "1fr 1fr",
                    gap: `${DEMO_GAP}px`,
                    p: `${DEMO_GAP}px`,
                    bgcolor: "background.default",
                  }
                : {
                    height: "100vh",
                    width: "100vw",
                    position: "relative",
                    overflow: "hidden",
                  }
            }
          >
            {demoMode && (
              <Box
                sx={{
                  gridColumn: 1,
                  gridRow: "1 / span 2",
                  minWidth: 0,
                  minHeight: 0,
                }}
              >
                <DemoMetricsPanel />
              </Box>
            )}
            <Box
              ref={mapCellRef}
              sx={
                demoMode
                  ? {
                      gridColumn: 2,
                      gridRow: 1,
                      position: "relative",
                      overflow: "hidden",
                      minWidth: 0,
                      minHeight: 0,
                      borderRadius: "28px",
                      border: "1px solid",
                      borderColor: "divider",
                    }
                  : { position: "absolute", inset: 0 }
              }
            >
              <DeckGLMap demoMode={demoMode} mapSize={mapSize} />
            </Box>
            {demoMode && (
              <Box
                sx={{
                  gridColumn: 2,
                  gridRow: 2,
                  minWidth: 0,
                  minHeight: 0,
                }}
              >
                <DemoPlaceholderPanel />
              </Box>
            )}
          </Box>
          {/* hidden, not unmounted: their sections keep local state */}
          <Box sx={{ display: demoMode ? "none" : "block" }}>
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
