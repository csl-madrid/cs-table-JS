import { setDemoMode, setPreset } from "../redux/reducers/demoLayoutSlice";
import { setVoiceVisible } from "../redux/reducers/voiceSlice";
import { getPreset } from "../views/CityScopeJS/DemoMode/layout";

/**
 * Runs a UI_COMMAND message of cityIO (see CS_CityIO_WS): an order for the
 * interface, like the ones the voice assistant sends. `content` is
 * `{ action, value }`:
 *  - layout:    value is the id of a layout of DEMO_PRESETS ("layout1", "three"...)
 *  - vo:        value is "show" or "hide": the voice assistant's floating window
 * Anything else is ignored, since any client of the table can send these
 */
export function handleUiCommand(content, dispatch) {
  const { action, value } = content || {};

  switch (action) {
    case "layout":
      if (!getPreset(value)) {
        console.warn(`UI_COMMAND: unknown layout "${value}"`);
        return;
      }
      // a layout can only be seen in the demo view
      dispatch(setDemoMode(true));
      dispatch(setPreset({ presetId: value }));
      return;

    case "vo":
      if (value === "show") dispatch(setVoiceVisible(true));
      else if (value === "hide") dispatch(setVoiceVisible(false));
      else console.warn(`UI_COMMAND: unknown vo value "${value}"`);
      return;

    default:
      console.warn(`UI_COMMAND: unknown action "${action}"`);
  }
}
