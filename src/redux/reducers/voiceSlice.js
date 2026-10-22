import { createSlice } from "@reduxjs/toolkit";

// The voice assistant's floating window (see VoiceAssistant/VoiceFloating).
// - visible: whether the window is shown. The voice script decides it, with
//   UI_COMMAND messages through cityIO ({ action: "vo", value: "show" | "hide" })
export const voiceSlice = createSlice({
  name: "voiceState",
  initialState: {
    visible: false,
  },
  reducers: {
    setVoiceVisible: (state, action) => {
      state.visible = Boolean(action.payload);
    },
  },
});

export const { setVoiceVisible } = voiceSlice.actions;
export default voiceSlice.reducer;
