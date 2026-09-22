import { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import PaintBrush from "../../../Components/PaintBrush";
import { LayerHoveredTooltip } from "../../../Components/LayerHoveredTooltip";
import DeckglBase from "./DeckglBase";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  AccessLayer,
  AggregatedTripsLayer,
  ABMLayer,
  GridLayer,
  CellChangeLayer,
  TextualLayer,
  GeojsonLayer,
  TileMapLayer,
  TrafficLayer,
  ArcBaseLayer,
  ColumnBaseLayer,
  ContourBaseLayer,
  GeoJsonBaseLayer,
  GridBaseLayer,
  GridCellBaseLayer,
  HeatmapBaseLayer,
  HexagonBaseLayer,
  IconBaseLayer,
  LineBaseLayer,
  PathBaseLayer,
  ScatterplotBaseLayer,
  ScenegraphBaseLayer,
  SimpleMeshBaseLayer,
  TextBaseLayer,
  H3ClusterBaseLayer,
  H3HexagonBaseLayer,
} from "./deckglLayers";
import { processGridData, GRID_ELEVATION_SCALE } from "./deckglLayers/GridLayer";
import { RING_DURATION_MS } from "./deckglLayers/CellChangeLayer";
import useWebSocket from "react-use-websocket";
import { cityIOSettings } from "../../../settings/settings";
import { isEmptyCellType } from "../../../utils/utils";

// treat a GEOGRIDDATA update as a bulk change (loading a table, restoring a
// scenario...) rather than individual placed/removed pieces once more than
// this many cells flip empty<->filled in the same update
const BULK_CHANGE_RATIO = 0.3;

// the ring's "tall" end overshoots the piece's own height by this much, so
// it's never perfectly co-located with the (opaque) piece it's tracing -
// otherwise the solid building hides the ring inside itself the whole time
const RING_OVERSHOOT_RATIO = 0.4;
const RING_MIN_OVERSHOOT = 18; // world units, for flat/short pieces
// once the ring's own rise/sink transition finishes, it holds still at its
// overshoot peak for this long before being removed - long enough to
// actually register as "the ring poked out", not just a same-frame blip
const RING_HOLD_MS = 650;

// same accessor GridLayer uses for a cell's height, with a safe fallback so
// a malformed/number-only height never turns into a NaN ring position
const getPieceHeight = (cellProps) => {
  const h = Array.isArray(cellProps?.height) ? cellProps.height[1] : 0;
  return typeof h === "number" && !Number.isNaN(h) ? h : 0;
};

// world-space height the ring reaches: the piece's own height, plus a
// margin so the ring's tall end always pokes out past the solid piece
const ringPeakZ = (rawHeight) => {
  const pieceZ = rawHeight * GRID_ELEVATION_SCALE;
  return pieceZ + Math.max(pieceZ * RING_OVERSHOOT_RATIO, RING_MIN_OVERSHOOT);
};

export default function DeckGLMap() {
  // get cityio data from redux store
  const cityIOdata = useSelector((state) => state.cityIOdataState.cityIOdata);
  // get menu state from redux store
  const menuState = useSelector((state) => state.menuState);
  const [draggingWhileEditing, setDraggingWhileEditing] = useState(false);
  const [selectedCellsState, setSelectedCellsState] = useState();
  const [deckGLRef, setDeckGLRef] = useState(null);
  const [keyDownState, setKeyDownState] = useState();
  const [mousePos, setMousePos] = useState();
  const [mouseDown, setMouseDown] = useState();
  const [hoveredObj, setHoveredObj] = useState();
  const [GEOGRIDDATA, setGEOGRIDDATA] = useState();
  // short-lived flashes for cells that were just placed/removed on the table
  const [flashEvents, setFlashEvents] = useState([]);
  // previous raw GEOGRIDDATA, to diff against the incoming update
  const prevGeogriddataRef = useRef(null);
  // pending removal timers for flashEvents, keyed by event key
  const flashTimersRef = useRef(new Map());

  // sets data from all hovered objected currently in the viewport
  const [layerHoveredData, setLayerHoveredData] = useState();

  const pickingRadius = 40;
  const editModeToggle = menuState.editMenuState.EDIT_BUTTON;
  const selectedType = menuState.typesMenuState.SELECTED_TYPE;
  const layersMenu = menuState.layersMenuState;

  const toggleRotateCamera = menuState?.viewSettingsMenuState?.ROTATE_CHECKBOX;

  const { sendJsonMessage } = useWebSocket(cityIOSettings.cityIO.websocketURL, {
    share: true,
    shouldReconnect: () => true,
  });

  // Send changes to cityIO
  useEffect(() => {
    if (!editModeToggle && GEOGRIDDATA) {
      let dataProps = [];
      for (let i = 0; i < GEOGRIDDATA.features.length; i++) {
        dataProps[i] = GEOGRIDDATA.features[i].properties;
      }
      sendJsonMessage({
        type: "UPDATE_GRID",
        content: {
          geogriddata: dataProps,
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editModeToggle]);

  // schedules a batch of new ring events: they render at their starting
  // height, then their target height is set as a microtask (runs before
  // the browser's next paint, unlike requestAnimationFrame - so the ring
  // never gets painted a frame behind GridLayer's own elevation change),
  // which the layer's own `transitions` animate smoothly; each is removed
  // once its trip up or down completes
  const addFlashEvents = (events) => {
    if (!events.length) return;
    setFlashEvents((prev) => [...prev, ...events]);
    queueMicrotask(() => {
      setFlashEvents((prev) =>
        prev.map((e) =>
          events.some((added) => added.key === e.key)
            ? { ...e, phase: "out" }
            : e
        )
      );
    });
    events.forEach((e) => {
      const timer = setTimeout(() => {
        setFlashEvents((prev) => prev.filter((x) => x.key !== e.key));
        flashTimersRef.current.delete(e.key);
        // the transition itself finishes at RING_DURATION_MS; RING_HOLD_MS
        // keeps the ring visible at its overshoot peak a moment longer
      }, RING_DURATION_MS + RING_HOLD_MS + 50);
      flashTimersRef.current.set(e.key, timer);
    });
  };

  // clear any pending ring-removal timers on unmount
  useEffect(() => {
    const timers = flashTimersRef.current;
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  // update the grid layer with every change to GEOGRIDDATA, and ring any
  // cell that just got a piece placed on it or removed from it
  useEffect(() => {
    const newGrid = processGridData(cityIOdata);
    setGEOGRIDDATA(newGrid);

    const prevData = prevGeogriddataRef.current;
    const newData = cityIOdata.GEOGRIDDATA;
    if (
      prevData &&
      newData &&
      prevData.length === newData.length &&
      newGrid?.features
    ) {
      const changed = [];
      for (let i = 0; i < newData.length; i++) {
        const wasEmpty = isEmptyCellType(prevData[i]);
        const isEmpty = isEmptyCellType(newData[i]);
        if (wasEmpty !== isEmpty) changed.push(i);
      }
      // a lot of cells changing at once means a table load or a scenario
      // restore, not someone placing/removing pieces: skip the rings
      if (
        changed.length &&
        changed.length <= newData.length * BULK_CHANGE_RATIO
      ) {
        const now = Date.now();
        const events = changed
          .map((i) => {
            const wasEmpty = isEmptyCellType(prevData[i]);
            const geometry = newGrid.features[i]?.geometry;
            if (!geometry) return null;
            const sourceCell = wasEmpty ? newData[i] : prevData[i];
            // placed: rises from the ground to just past the piece's
            // height. removed: starts just past the piece's last height
            // and sinks down
            const startZ = wasEmpty
              ? 0
              : ringPeakZ(getPieceHeight(prevData[i]));
            const endZ = wasEmpty
              ? ringPeakZ(getPieceHeight(newData[i]))
              : 0;
            return {
              key: `${i}-${now}`,
              geometry,
              color: sourceCell?.color,
              startZ,
              endZ,
              phase: "in",
            };
          })
          .filter(Boolean);
        addFlashEvents(events);
      }
    }
    prevGeogriddataRef.current = newData;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityIOdata.GEOGRIDDATA]);

  const layersKey = {
    TILE_MAP: TileMapLayer(),

    ABM: ABMLayer({
      data: cityIOdata,
      selected:
        layersMenu &&
        layersMenu.ABM_LAYER_CHECKBOX &&
        layersMenu.ABM_LAYER_CHECKBOX.selected,

      opacity:
        layersMenu &&
        layersMenu.ABM_LAYER_CHECKBOX &&
        layersMenu.ABM_LAYER_CHECKBOX.slider,
    }),

    AGGREGATED_TRIPS: AggregatedTripsLayer({
      data: cityIOdata,
      selected:
        layersMenu &&
        layersMenu.ABM_LAYER_CHECKBOX &&
        layersMenu.ABM_LAYER_CHECKBOX.selected,
      opacity:
        layersMenu &&
        layersMenu.AGGREGATED_TRIPS_LAYER_CHECKBOX &&
        layersMenu.AGGREGATED_TRIPS_LAYER_CHECKBOX.slider * 0.01,
    }),

    GRID: GridLayer({
      data: GEOGRIDDATA,
      editOn: editModeToggle,
      state: {
        selectedType,
        keyDownState,
        selectedCellsState,
        pickingRadius,
        opacity:
          layersMenu &&
          layersMenu.GRID_LAYER_CHECKBOX &&
          layersMenu.GRID_LAYER_CHECKBOX.slider * 0.01,
      },
      updaters: {
        setSelectedCellsState,
        setDraggingWhileEditing,
        setHoveredObj,
      },
      deckGLRef: deckGLRef,
    }),

    GRID_CHANGE_RING: CellChangeLayer({ events: flashEvents }),

    ACCESS: AccessLayer({
      setLayerHoveredData,
      data: cityIOdata,
      selected:
        layersMenu &&
        layersMenu.ACCESS_LAYER_CHECKBOX &&
        layersMenu.ACCESS_LAYER_CHECKBOX.selected,
      intensity:
        layersMenu &&
        layersMenu.ACCESS_LAYER_CHECKBOX &&
        layersMenu.ACCESS_LAYER_CHECKBOX.slider,
    }),

    TEXTUAL: TextualLayer({
      data: cityIOdata,
      coordinates: GEOGRIDDATA && GEOGRIDDATA,
      opacity:
        layersMenu &&
        layersMenu.TEXTUAL_LAYER_CHECKBOX &&
        layersMenu.TEXTUAL_LAYER_CHECKBOX.slider * 0.01,
    }),

    GEOJSON: GeojsonLayer({
      data: cityIOdata,
      opacity:
        layersMenu &&
        layersMenu.GEOJSON_LAYER_CHECKBOX &&
        layersMenu.GEOJSON_LAYER_CHECKBOX.slider * 0.01,
    }),

    TRAFFIC: TrafficLayer({
      setLayerHoveredData,
      data: cityIOdata,
      opacity:
        layersMenu &&
        layersMenu.TRAFFIC_LAYER_CHECKBOX &&
        layersMenu.TRAFFIC_LAYER_CHECKBOX.slider * 0.01,
    }),
  };

  function getLayerByType(type, content) {
    if (type === "text") {
      return TextBaseLayer({
        data: content,
        opacity:
          layersMenu &&
          layersMenu[content.id] &&
          layersMenu[content.id].slider * 0.01,
      });
    } else if (type === "arc") {
      return ArcBaseLayer({
        data: content,
        opacity:
          layersMenu &&
          layersMenu[content.id] &&
          layersMenu[content.id].slider * 0.01,
      });
    } else if (type === "heatmap") {
      return HeatmapBaseLayer({
        data: content,
        opacity:
          layersMenu &&
          layersMenu[content.id] &&
          layersMenu[content.id].slider * 0.01,
      });
    } else if (type === "column") {
      return ColumnBaseLayer({
        data: content,
        opacity:
          layersMenu &&
          layersMenu[content.id] &&
          layersMenu[content.id].slider * 0.01,
      });
    } else if (type === "contour") {
      return ContourBaseLayer({
        data: content,
        opacity:
          layersMenu &&
          layersMenu[content.id] &&
          layersMenu[content.id].slider * 0.01,
      });
    } else if (type === "geojsonbase") {
      return GeoJsonBaseLayer({
        data: content,
        opacity:
          layersMenu &&
          layersMenu[content.id] &&
          layersMenu[content.id].slider * 0.01,
      });
    } else if (type === "grid") {
      return GridBaseLayer({
        data: content,
        opacity:
          layersMenu &&
          layersMenu[content.id] &&
          layersMenu[content.id].slider * 0.01,
      });
    } else if (type === "gridCell") {
      return GridCellBaseLayer({
        data: content,
        opacity:
          layersMenu &&
          layersMenu[content.id] &&
          layersMenu[content.id].slider * 0.01,
      });
    } else if (type === "hexagon") {
      return HexagonBaseLayer({
        data: content,
        opacity:
          layersMenu &&
          layersMenu[content.id] &&
          layersMenu[content.id].slider * 0.01,
      });
    } else if (type === "icon") {
      return IconBaseLayer({
        data: content,
        opacity:
          layersMenu &&
          layersMenu[content.id] &&
          layersMenu[content.id].slider * 0.01,
      });
    } else if (type === "line") {
      return LineBaseLayer({
        data: content,
        opacity:
          layersMenu &&
          layersMenu[content.id] &&
          layersMenu[content.id].slider * 0.01,
      });
    } else if (type === "path") {
      return PathBaseLayer({
        data: content,
        opacity:
          layersMenu &&
          layersMenu[content.id] &&
          layersMenu[content.id].slider * 0.01,
      });
    } else if (type === "scatterplot") {
      return ScatterplotBaseLayer({
        data: content,
        opacity:
          layersMenu &&
          layersMenu[content.id] &&
          layersMenu[content.id].slider * 0.01,
      });
    } else if (type === "scenegraph") {
      return ScenegraphBaseLayer({
        data: content,
        opacity:
          layersMenu &&
          layersMenu[content.id] &&
          layersMenu[content.id].slider * 0.01,
      });
    } else if (type === "simpleMesh") {
      return SimpleMeshBaseLayer({
        data: content,
        opacity:
          layersMenu &&
          layersMenu[content.id] &&
          layersMenu[content.id].slider * 0.01,
      });
    } else if (type === "H3Cluster") {
      return H3ClusterBaseLayer({
        data: content,
        opacity:
          layersMenu &&
          layersMenu[content.id] &&
          layersMenu[content.id].slider * 0.01,
      });
    } else if (type === "H3Hexagon") {
      return H3HexagonBaseLayer({
        data: content,
        opacity:
          layersMenu &&
          layersMenu[content.id] &&
          layersMenu[content.id].slider * 0.01,
      });
    }
  }

  const layerOrder = [
    "TEXT",
    "ICON",
    "MESH",
    "SCENEGRAPH",
    "SCATTERPLOT",
    "PATH",
    "LINE",
    "GRID_CELL",
    "GRID_BASE",
    "GEOJSON_BASE",
    "CONTOUR",
    "COLUMN",
    "ARC",
    "ABM",
    "AGGREGATED_TRIPS",
    "TILE_MAP",
    "GRID",
    "TEXTUAL",
    "GEOJSON",
    "ACCESS",
    "TRAFFIC",
    "HEATMAP",
    "HEXAGON",
  ];

  const renderDeckLayers = () => {
    let layers = [];
    // ! [TEST] we stop loading the tile map layer as the base layer and instead use mapbox-gl
    // layers.push(layersKey["TILE_MAP"]);
    for (var layerNameString of layerOrder) {
      // toggle layers on and off
      if (
        layersMenu &&
        layersMenu[layerNameString + "_LAYER_CHECKBOX"] &&
        layersMenu[layerNameString + "_LAYER_CHECKBOX"].isOn
      ) {
        layers.push(layersKey[layerNameString]);
        // flashes trace the same cells as the grid: only show them together
        if (layerNameString === "GRID")
          layers.push(layersKey["GRID_CHANGE_RING"]);
      }
    }
    if (cityIOdata.layers)
      for (let i = 0; i < cityIOdata.layers.length; i++) {
        const moduleName = cityIOdata.layers[i].id;
        const moduleType = cityIOdata.layers[i].type;

        if (
          layersMenu &&
          layersMenu[moduleName] &&
          layersMenu[moduleName].isOn
        ) {
          layers.push(getLayerByType(moduleType, cityIOdata.layers[i]));
        }
      }

    return layers;
  };

  return (
    <>
      <div
        onKeyDown={(e) => {
          setKeyDownState(e.nativeEvent.key);
        }}
        onKeyUp={() => setKeyDownState(null)}
        onMouseMove={(e) => setMousePos(e.nativeEvent)}
        onMouseUp={() => setMouseDown(false)}
        onMouseDown={() => setMouseDown(true)}
      >
        {layerHoveredData && (
          <LayerHoveredTooltip
            layerHoveredData={layerHoveredData}
            mousePos={mousePos}
          />
        )}
        {/* only show if grid layer is on */}
        {layersMenu.GRID_LAYER_CHECKBOX &&
          layersMenu.GRID_LAYER_CHECKBOX.isOn && (
            <PaintBrush
              editOn={editModeToggle}
              mousePos={mousePos}
              selectedType={selectedType}
              pickingRadius={pickingRadius}
              mouseDown={mouseDown}
              hoveredObj={hoveredObj}
            />
          )}
        <DeckglBase
          setDeckGLRef={setDeckGLRef}
          layers={renderDeckLayers()}
          draggingWhileEditing={draggingWhileEditing}
          toggleRotateCamera={toggleRotateCamera}
        />
      </div>
    </>
  );
}
