import { useSelector } from 'react-redux';
import VoiceAssistant from './VoiceAssistant';

const FADE_MS = 250;

// Floating window for VoiceAssistant (which is used as it is, filling its
// container): a card on the top right, over everything else. It is shown and
// hidden by the voice script, with UI_COMMAND messages through cityIO
// ({ action: "vo", value: "show" | "hide" }, see utils/uiCommands.js)
export default function VoiceFloating() {
  const active = useSelector((state) => state.voiceState.visible);

  return (
    <div
      aria-hidden={!active}
      style={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 1250,
        width: 320,
        height: 250,
        maxWidth: 'calc(100vw - 32px)',
        boxSizing: 'border-box',
        borderRadius: 24,
        border: '1px solid rgba(255, 255, 255, 0.08)',
        background: 'rgba(17, 17, 17, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
        overflow: 'hidden',
        // lets everything under it keep taking clicks
        pointerEvents: 'none',
        opacity: active ? 1 : 0,
        transform: active ? 'translateY(0)' : 'translateY(-12px)',
        visibility: active ? 'visible' : 'hidden',
        transition: `opacity ${FADE_MS}ms ease, transform ${FADE_MS}ms ease, visibility 0s linear ${active ? 0 : FADE_MS}ms`
      }}
    >
      <VoiceAssistant />
    </div>
  );
}
