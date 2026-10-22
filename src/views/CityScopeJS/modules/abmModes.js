import DirectionsBusOutlinedIcon from "@mui/icons-material/DirectionsBusOutlined";
import { AbmModes } from "../VisContainer/ABM";

const abmModes = {
  id: "abmModes",
  title: "Transport modes",
  subheader: "Agents using each mode",
  icon: <DirectionsBusOutlinedIcon />,
  component: AbmModes,
};

export default abmModes;
