import MapOutlinedIcon from "@mui/icons-material/MapOutlined";
import DeckGLMap from "../DeckglMap/index";

const map = {
  id: "map",
  title: "Map & 3D",
  subheader: "The table and its 3D model",
  icon: <MapOutlinedIcon />,
  // heavy and stateful (tiles, unsent edits): mounted once and moved, never
  // recreated. Receives `demoMode` and `mapSize` (see DemoLayout)
  persistent: true,
  component: DeckGLMap,
};

export default map;
