import { GeoJsonLayer } from "deck.gl";
import { hexToRgb, testHex } from "../../../../utils/utils";

/**
 * Description. uses deck api to
 * collect objects in a region
 * @argument{object} e picking event
 */
export const multipleObjPicked = (e, pickingRadius, deckGLRef) => {
  const dim = pickingRadius;
  const x = e.x - dim / 2;
  const y = e.y - dim / 2;
  let multipleObj = deckGLRef.current.pickObjects({
    x: x,
    y: y,
    width: dim,
    height: dim,
  });
  return multipleObj;
};

/**
 * Description. allow only to pick cells that are
 *  not of CityScope TUI & that are intractable
 * so to not overlap TUI activity
 */
const handleGridCellEditing = (
  e,
  selectedType,
  setSelectedCellsState,
  pickingRadius,
  deckGLRef
) => {
  const { height, color, name } = selectedType;
  const multiSelectedObj = multipleObjPicked(e, pickingRadius, deckGLRef);
  multiSelectedObj.forEach((selected) => {
    const thisCellProps = selected.object.properties;
    if (thisCellProps && thisCellProps.interactive) {
      thisCellProps.color = testHex(color) ? hexToRgb(color) : color;
      thisCellProps.height = height;
      thisCellProps.name = name;
    }
  });
  setSelectedCellsState(multiSelectedObj);
};

/**
 * Description. gets `props` with geojson
 * and process the interactive area
 */
export const processGridData = (cityIOdata) => {
  // create a copy of the GEOGRID object
  const newGEOGRID = JSON.parse(JSON.stringify(cityIOdata.GEOGRID));
  // if GEOGRRIDDATA exist and is the same length as our grid
  // update GEOGRID features from GEOGRIDDATA on cityio
  for (let i = 0; i < cityIOdata?.GEOGRID?.features?.length; i++) {
    newGEOGRID.features[i].properties = cityIOdata.GEOGRIDDATA[i];
    // inject id with ES7 copy of the object
    newGEOGRID.features[i].properties = {
      ...newGEOGRID.features[i].properties,
      id: i,
    };
  }
  return newGEOGRID;
};

// display-only darkening of the cityIO colors (1 = original color), so they
// read as deeper and sit better on the dark map. The data is not modified.
const TONE = 0.9;

export default function GridLayer({
  data,
  editOn,
  state: {
    selectedType,
    keyDownState,
    selectedCellsState,
    pickingRadius,
    opacity,
  },
  updaters: { setSelectedCellsState, setDraggingWhileEditing, setHoveredObj },
  deckGLRef,
}) {
  // the layer opacity slider (0-1) only affects the fill: the outlines
  // stay solid, which is what a layer-wide `opacity` would not allow
  const fillAlpha = Math.round(255 * (opacity ?? 1));

  return new GeoJsonLayer({
    opacity: 1,
    id: "GRID",
    data,
    pickable: true,
    extruded: true,
    wireframe: true,
    // neighbour cells share walls: drawing back faces makes those coplanar
    // faces fight for depth (flicker when the camera moves)
    parameters: { cull: true },
    //!  fixed  elevation for now
    elevationScale: 5,
    lineWidthScale: 1,
    lineWidthMinPixels: 1.5,
    // dark, solid edges
    getLineColor: [20, 20, 20, 255],
    // matte finish: a specular sheen washes the colors out
    material: {
      ambient: 0.6,
      diffuse: 0.7,
      shininess: 16,
      specularColor: [20, 20, 20],
    },
    // highlight the cell under the cursor
    autoHighlight: true,
    highlightColor: [255, 255, 255, 70],
    getElevation: (d) => d.properties.height[1],
    getFillColor: (d) => {
      const [r, g, b] = d.properties.color;
      return [r * TONE, g * TONE, b * TONE, fillAlpha];
    },

    onClick: (event) => {
      if (selectedType && editOn && keyDownState !== "Shift")
        handleGridCellEditing(
          event,
          selectedType,
          setSelectedCellsState,
          pickingRadius,
          deckGLRef
        );
    },

    onDrag: (event) => {
      if (selectedType && editOn && keyDownState !== "Shift")
        handleGridCellEditing(
          event,
          selectedType,
          setSelectedCellsState,
          pickingRadius,
          deckGLRef
        );
    },

    onDragStart: () => {
      if (selectedType && editOn && keyDownState !== "Shift") {
        setDraggingWhileEditing(true);
      }
    },

    onHover: (e) => {
      if (e.object) {
        setHoveredObj(e);
      }
    },

    onDragEnd: () => {
      setDraggingWhileEditing(false);
    },
    updateTriggers: {
      getFillColor: [selectedCellsState, fillAlpha],
      getElevation: selectedCellsState,
    },
    transitions: {
      getFillColor: 500,
      getElevation: 150,
    },
  });
}
