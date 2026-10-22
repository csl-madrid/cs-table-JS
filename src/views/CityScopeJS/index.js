import { Box } from "@mui/material";
import CityIO from "../../Components/CityIO";
import { useSelector, useDispatch } from "react-redux";
import { toggleDemoMode } from "../../redux/reducers/demoLayoutSlice";
import MenuContainer from "./MenuContainer";
import VisContainer from "./VisContainer";
import { MapStyleProvider } from "../../Components/MapStyleContext";
import DemoModeButton from "./DemoMode/DemoModeButton";
import DemoLayout from "./DemoMode/DemoLayout";
import DemoPresetButton from "./DemoMode/DemoPresetButton";
import VoiceFloating from "./VoiceAssistant/VoiceFloating";
import { DEMO_TRANSITION_MS, DEMO_EASING } from "./DemoMode/layout";

const fade = `opacity ${DEMO_TRANSITION_MS}ms ${DEMO_EASING}`;

export default function CityScopeJS() {
  const cityIOisDone = useSelector(
    (state) => state.cityIOdataState.cityIOisDone
  );
  const tableName = useSelector(
    (state) => state.cityIOdataState.cityIOtableName
  );
  // demo view: boxes with modules (map, charts...) instead of map + option panels.
  // It lives in Redux so that anything (the buttons, a UI_COMMAND from cityIO)
  // can turn it on or off
  const demoMode = useSelector((state) => state.demoLayoutState.demoMode);
  const dispatch = useDispatch();

  return (
    <>
      {/* if we got a cityIO table name, start cityIO module */}
      {tableName && <CityIO tableName={tableName} />}
      {/* if cityIO module is done loading, start the CSjs app */}
      {cityIOisDone && (
        <MapStyleProvider>
          <DemoLayout demoMode={demoMode} />
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
            onToggle={() => dispatch(toggleDemoMode())}
          />
          <DemoPresetButton demoMode={demoMode} />
        </MapStyleProvider>
      )}
      <VoiceFloating />
    </>
  );
}
