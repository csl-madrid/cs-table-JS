import SectionPanel from "../../../Components/SectionPanel";
import landuse from "../modules/landuse";
import radar from "../modules/radar";
import bar from "../modules/bar";

// the metrics of this panel; each one describes itself in ../modules
const sections = [landuse, radar, bar].map((m) => ({
  ...m,
  component: <m.component />,
}));

function VisContainer() {
  return (
    <SectionPanel
      side="right"
      // wide enough for the charts, otherwise a fifth of the screen
      width={Math.max(320, window.innerWidth / 5)}
      sections={sections}
      // charts can be compared side by side
      multiple
    />
  );
}

export default VisContainer;
