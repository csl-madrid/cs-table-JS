import { combineReducers } from "redux";
import cityIOdataSliceReducer from "./cityIOdataSlice";
import menuSliceReducer from "./menuSlice";
import demoLayoutSliceReducer from "./demoLayoutSlice";
import abmMetricsSliceReducer from "./abmMetricsSlice";
import voiceSliceReducer from "./voiceSlice";

export default combineReducers({
  cityIOdataState: cityIOdataSliceReducer,
  menuState: menuSliceReducer,
  demoLayoutState: demoLayoutSliceReducer,
  abmMetricsState: abmMetricsSliceReducer,
  voiceState: voiceSliceReducer,
});
