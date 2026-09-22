import DonutLargeOutlinedIcon from "@mui/icons-material/DonutLargeOutlined";
import RadarOutlinedIcon from "@mui/icons-material/RadarOutlined";
import BarChartOutlinedIcon from "@mui/icons-material/BarChartOutlined";
import RadarChart from "./RadarChart";
import BarChart from "./BarChart";
import AreaCalc from "./AreaCalc";
import SectionPanel from "../../../Components/SectionPanel";

const sections = [
  {
    id: "landuse",
    title: "Land-use",
    subheader: "Land-uses Area",
    icon: <DonutLargeOutlinedIcon />,
    toolTipInfo:
      "Land use distribution and area. Each cell is calculated for its area (square meter ^ 2 per cell) times its floors (4.5 meters per floor)",
    component: <AreaCalc />,
  },
  {
    id: "radar",
    title: "Radar Chart",
    subheader: "Metrics and KPIs",
    icon: <RadarOutlinedIcon />,
    component: <RadarChart />,
  },
  {
    id: "bar",
    title: "Bar Chart",
    subheader: "Metrics and KPIs",
    icon: <BarChartOutlinedIcon />,
    component: <BarChart />,
  },
];

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
