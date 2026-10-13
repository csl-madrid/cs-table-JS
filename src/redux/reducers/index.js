import { combineReducers } from "redux";
import cityIOdataSliceReducer from "./cityIOdataSlice";
import menuSliceReducer from "./menuSlice";
import demoLayoutSliceReducer from "./demoLayoutSlice";

export default combineReducers({
  cityIOdataState: cityIOdataSliceReducer,
  menuState: menuSliceReducer,
  demoLayoutState: demoLayoutSliceReducer,
});
