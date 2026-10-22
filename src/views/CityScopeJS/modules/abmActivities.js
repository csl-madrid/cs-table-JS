import TimelineOutlinedIcon from "@mui/icons-material/TimelineOutlined";
import { AbmActivities } from "../VisContainer/ABM";

const abmActivities = {
  id: "abmActivities",
  title: "Activities",
  subheader: "Agents doing each activity",
  icon: <TimelineOutlinedIcon />,
  component: AbmActivities,
};

export default abmActivities;
