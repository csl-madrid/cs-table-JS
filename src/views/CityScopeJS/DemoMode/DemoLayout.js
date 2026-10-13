import { useEffect, useState } from "react";
import { Box } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import DemoSlot from "./DemoSlot";
import DemoDivider from "./DemoDivider";
import PersistentModuleHost from "./PersistentModuleHost";
import { setSplitRatio } from "../../../redux/reducers/demoLayoutSlice";
import { MODULES } from "../modules";
import {
  DEMO_TRANSITION_MS,
  DEMO_GAP,
  DEMO_MIN_BOX,
  demoLayout,
} from "./layout";
import { leafIds, setRatio, structureKey } from "./layoutTree";

const PERSISTENT_MODULES = MODULES.filter((m) => m.persistent);

// window size, to know the size every box will have in each view. It is also
// read again whenever `refreshKey` changes: a window that was resized before
// this listener existed, or without a resize event, would otherwise leave a
// stale size behind
const useWindowSize = (refreshKey) => {
  const read = () => ({ width: window.innerWidth, height: window.innerHeight });
  const [size, setSize] = useState(read);
  useEffect(() => {
    const update = () =>
      setSize((prev) => {
        const next = read();
        return prev.width === next.width && prev.height === next.height
          ? prev
          : next;
      });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [refreshKey]);
  return size;
};

/**
 * The full-screen area of both views: the persistent modules (the map) and,
 * in the demo view, the boxes with the rest of the modules and the dividers
 * between them. The layout and what each box shows are in Redux
 * (demoLayoutState)
 */
export default function DemoLayout({ demoMode }) {
  const dispatch = useDispatch();
  const tree = useSelector((state) => state.demoLayoutState.tree);
  const modules = useSelector((state) => state.demoLayoutState.modules);
  const windowSize = useWindowSize(demoMode);

  // A divider being dragged: the layout follows the pointer without writing
  // to Redux on every move, and the final position is saved when it is dropped
  const [draft, setDraft] = useState(null);
  const liveTree = draft ? setRatio(tree, draft.splitId, draft.ratio) : tree;
  const { boxes, dividers } = demoLayout(
    liveTree,
    windowSize.width,
    windowSize.height
  );
  const boxIds = leafIds(liveTree);
  // changes when boxes are added, removed or rearranged, not when they resize
  const structure = structureKey(tree);

  // the boxes exist only while the demo view is (or is still animating out
  // of) on screen
  const [boxesMounted, setBoxesMounted] = useState(false);
  useEffect(() => {
    if (demoMode) {
      setBoxesMounted(true);
      return undefined;
    }
    const timer = setTimeout(
      () => setBoxesMounted(false),
      DEMO_TRANSITION_MS + 50
    );
    return () => clearTimeout(timer);
  }, [demoMode]);

  const drop = (splitId, ratio) => {
    if (ratio !== null) dispatch(setSplitRatio({ splitId, ratio }));
    setDraft(null);
  };

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        bgcolor: "background.default",
      }}
    >
      {PERSISTENT_MODULES.map((module) => {
        const box = Object.keys(modules).find((id) => modules[id] === module.id);
        return (
          <PersistentModuleHost
            key={module.id}
            module={module}
            slotRect={box ? boxes[box] : null}
            switchKey={`${box}|${structure}`}
            dragging={draft !== null}
            demoMode={demoMode}
            windowSize={windowSize}
          />
        );
      })}
      {boxesMounted &&
        boxIds.map((id) => (
          <DemoSlot
            key={id}
            slot={id}
            moduleId={modules[id]}
            rect={boxes[id]}
            windowSize={windowSize}
            visible={demoMode}
            canSplitCol={boxes[id].width >= 2 * DEMO_MIN_BOX + DEMO_GAP}
            canSplitRow={boxes[id].height >= 2 * DEMO_MIN_BOX + DEMO_GAP}
            canRemove={boxIds.length > 1}
          />
        ))}
      {demoMode &&
        dividers.map((divider) => (
          <DemoDivider
            key={divider.id}
            divider={divider}
            onDrag={(splitId, ratio) => setDraft({ splitId, ratio })}
            onDrop={drop}
          />
        ))}
    </Box>
  );
}
