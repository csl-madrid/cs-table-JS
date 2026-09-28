import { GeoJsonLayer } from "deck.gl";
import {
  hexToRgb,
  testHex,
  easeOutBack,
  isEmptyCellType,
} from "../../../../utils/utils";

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

// the "Remove piece" edit makes a cell identical to an empty cell of the grid
const EMPTY_REFERENCE_CELL_ID = 0;
// fields that identify the cell itself, never copied from the empty cell
const CELL_IDENTITY_KEYS = ["id", "interactive"];

/**
 * Properties of an empty cell of the grid: cell 0 if it is empty, else the
 * first empty one. Tables label pieces with either `type` or `name`, so
 * the whole set of fields is copied rather than guessing which one is used.
 * Falls back to the virtual "Remove piece" type when no cell is empty
 */
const findEmptyCellTemplate = (data, virtualType) => {
  const cells = (data?.features || []).map((f) => f.properties);
  const reference =
    cells.find(
      (p) => p?.id === EMPTY_REFERENCE_CELL_ID && isEmptyCellType(p)
    ) || cells.find((p) => p && isEmptyCellType(p));
  if (reference) return reference;
  const { height, color, name } = virtualType;
  return { type: name, name, height, color };
};

// turns a cell into a copy of the template: the template's fields are set,
// and any other piece field the cell had (e.g. `name` on a `type`-only empty
// cell) is removed, so nothing of the old piece is left behind
const emptyCell = (cellProps, template) => {
  Object.keys(cellProps).forEach((key) => {
    if (!CELL_IDENTITY_KEYS.includes(key) && !(key in template))
      delete cellProps[key];
  });
  Object.entries(template).forEach(([key, value]) => {
    if (CELL_IDENTITY_KEYS.includes(key)) return;
    cellProps[key] = Array.isArray(value) ? [...value] : value;
  });
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
  deckGLRef,
  data,
  onCellsEdited
) => {
  const { height, color, name } = selectedType;
  const emptyTemplate = selectedType.isEmptyType
    ? findEmptyCellTemplate(data, selectedType)
    : null;
  const multiSelectedObj = multipleObjPicked(e, pickingRadius, deckGLRef);
  // cells that went from empty to filled or the other way round
  const changes = [];
  multiSelectedObj.forEach((selected) => {
    const thisCellProps = selected.object.properties;
    if (thisCellProps && thisCellProps.interactive) {
      const wasEmpty = isEmptyCellType(thisCellProps);
      const previousColor = thisCellProps.color;
      if (emptyTemplate) {
        emptyCell(thisCellProps, emptyTemplate);
      } else {
        thisCellProps.color = testHex(color) ? hexToRgb(color) : color;
        thisCellProps.height = height;
        thisCellProps.name = name;
      }
      // painting over a cell that already has the same kind of piece (or
      // none) changes nothing worth animating
      if (wasEmpty !== isEmptyCellType(thisCellProps)) {
        changes.push({
          id: thisCellProps.id,
          geometry: selected.object.geometry,
          wasEmpty,
          // the piece that appeared, or the one that just went away
          color: wasEmpty ? thisCellProps.color : previousColor,
          previousColor,
          height: thisCellProps.height,
        });
      }
    }
  });
  if (changes.length && onCellsEdited) onCellsEdited(changes);
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

// converts a cell's raw `height` value into world elevation
export const GRID_ELEVATION_SCALE = 5;

export default function GridLayer({
  data,
  editOn,
  state: {
    selectedType,
    keyDownState,
    selectedCellsState,
    pickingRadius,
    opacity,
    pendingCells,
  },
  updaters: {
    setSelectedCellsState,
    setDraggingWhileEditing,
    setHoveredObj,
    onCellsEdited,
  },
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
    elevationScale: GRID_ELEVATION_SCALE,
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
    // `pendingCells` (cell id -> color it had) are cells whose piece was just
    // placed but is held back for a moment, so the blocks dropping onto it
    // (see CellChangeParticles) start before the piece itself appears
    getElevation: (d) =>
      pendingCells?.has(d.properties.id) ? 0 : d.properties.height[1],
    getFillColor: (d) => {
      const held = pendingCells?.get(d.properties.id);
      const [r, g, b] = Array.isArray(held) ? held : d.properties.color;
      return [r * TONE, g * TONE, b * TONE, fillAlpha];
    },

    onClick: (event) => {
      if (selectedType && editOn && keyDownState !== "Shift")
        handleGridCellEditing(
          event,
          selectedType,
          setSelectedCellsState,
          pickingRadius,
          deckGLRef,
          data,
          onCellsEdited
        );
    },

    onDrag: (event) => {
      if (selectedType && editOn && keyDownState !== "Shift")
        handleGridCellEditing(
          event,
          selectedType,
          setSelectedCellsState,
          pickingRadius,
          deckGLRef,
          data,
          onCellsEdited
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
      getFillColor: [selectedCellsState, fillAlpha, pendingCells],
      getElevation: [selectedCellsState, pendingCells],
    },
    transitions: {
      // quick fade to the new type's color
      getFillColor: 260,
      // slower grow/sink with a slight overshoot, so placing or removing a
      // piece reads as the cell settling into place rather than snapping
      getElevation: { duration: 550, easing: easeOutBack },
    },
  });
}
