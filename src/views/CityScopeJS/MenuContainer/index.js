import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import BookmarksOutlinedIcon from "@mui/icons-material/BookmarksOutlined";
import LayersOutlinedIcon from "@mui/icons-material/LayersOutlined";
import ViewInArOutlinedIcon from "@mui/icons-material/ViewInArOutlined";
import MapOutlinedIcon from "@mui/icons-material/MapOutlined";
import TypesMenu from "./TypesMenu";
import LayersMenu from "./LayersMenu";
import ViewSettingsMenu from "./ViewSettingsMenu";
import ScenariosMenu from "./ScenariosMenu";
import MapStyleMenu from "./MapStyleMenu";
import SectionPanel from "../../../Components/SectionPanel";
import { DEMO_BUTTON_CLEARANCE } from "../DemoMode/DemoModeButton";
import EditMenu from "./EditMenu";
import TableInfo from "./TableInfo";
import SpecialLayersControlsMenu from "./SpecialLayersControlsMenu/";

const sections = [
  {
    id: "edit",
    title: "Edit Mode",
    subheader: "Select Types & Edit",
    icon: <EditOutlinedIcon />,
    component: (
      <>
        <EditMenu />
        <TypesMenu />
      </>
    ),
  },
  {
    id: "scenarios",
    title: "Scenarios",
    subheader: "Save and Load Scenarios",
    icon: <BookmarksOutlinedIcon />,
    component: <ScenariosMenu />,
  },
  {
    id: "layers",
    title: "Layers",
    subheader: "Layers visibility",
    icon: <LayersOutlinedIcon />,
    component: (
      <>
        <LayersMenu />
        <SpecialLayersControlsMenu />
      </>
    ),
  },
  {
    id: "map",
    title: "Map Style",
    subheader: "Change the base map",
    icon: <MapOutlinedIcon />,
    component: <MapStyleMenu />,
  },
  {
    id: "view",
    title: "View Settings",
    subheader: "Toggle different visibility settings",
    icon: <ViewInArOutlinedIcon />,
    component: <ViewSettingsMenu />,
  },
];

function MenuContainer() {
  return (
    <SectionPanel
      side="left"
      width={320}
      sections={sections}
      railTop={<TableInfo variant="avatar" />}
      header={<TableInfo />}
      // the demo-mode button floats in the bottom-left corner
      bottomInset={DEMO_BUTTON_CLEARANCE}
    />
  );
}

export default MenuContainer;
