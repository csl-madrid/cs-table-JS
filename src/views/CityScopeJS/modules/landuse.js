import DonutLargeOutlinedIcon from "@mui/icons-material/DonutLargeOutlined";
import AreaCalc from "../VisContainer/AreaCalc";

const landuse = {
  id: "landuse",
  title: "Land-use",
  subheader: "Land-uses Area",
  icon: <DonutLargeOutlinedIcon />,
  toolTipInfo:
    "Land use distribution and area. Each cell is calculated for its area (square meter ^ 2 per cell) times its floors (4.5 meters per floor)",
  component: AreaCalc,
};

export default landuse;
