import CityIO from "../../Components/CityIO";
import { useSelector } from "react-redux";
import MenuContainer from "./MenuContainer";
import DeckGLMap from "./DeckglMap/index";
import VisContainer from "./VisContainer";
import { MapStyleProvider } from "../../Components/MapStyleContext";

export default function CityScopeJS() {
  const cityIOisDone = useSelector(
    (state) => state.cityIOdataState.cityIOisDone
  );
  const tableName = useSelector(
    (state) => state.cityIOdataState.cityIOtableName
  );

  return (
    <>
      {/* if we got a cityIO table name, start cityIO module */}
      {tableName && <CityIO tableName={tableName} />}
      {/* if cityIO module is done loading, start the CSjs app */}
      {cityIOisDone && (
        <MapStyleProvider>
          <div  style={{ height: '100vh', width: '100vw', position: 'relative', overflow: 'hidden' }}>
            <DeckGLMap />
          </div>
          <MenuContainer />
          <VisContainer />
        </MapStyleProvider>
      )}
    </>
  );
}
