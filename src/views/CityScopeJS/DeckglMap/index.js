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
import {
  processGridData,
  GRID_ELEVATION_SCALE,
} from "./deckglLayers/GridLayer";
import useWebSocket from "react-use-websocket";
import { cityIOSettings } from "../../../settings/settings";
import {
  isEmptyCellType,
  computeFeatureCentroid,
  hexToRgb,
} from "../../../utils/utils";

// treat a GEOGRIDDATA update as a bulk change (loading a table, restoring a
// scenario...) rather than individual placed/removed pieces once more than
// this many cells flip empty<->filled in the same update
const BULK_CHANGE_RATIO = 0.3;

// how long a particle burst's data is kept around. Longer than the CSS
// animation itself (see CellChangeParticles.js) so the last particles get
// to finish their own animation/delay before being unmounted
const BURST_LIFETIME_MS = 900;

// cells animated while editing stay marked this long after leaving edit mode,
// so the update cityIO sends back with those same changes doesn't animate them
// a second time
const EDIT_ECHO_WINDOW_MS = 5000;

// a newly placed piece stays flat (looking like the empty cell it was) for this
// long, so the blocks dropping onto it start before the piece itself grows
const PLACE_LEAD_MS = 220;

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
  // short-lived particle bursts for cells that were just placed/removed
  // on the table (confetti popping up / dust drifting away)
  const [particleBursts, setParticleBursts] = useState([]);
  // previous raw GEOGRIDDATA, to diff against the incoming update
  const prevGeogriddataRef = useRef(null);
  // pending cleanup timers for particleBursts, keyed by burst key
  const burstTimersRef = useRef(new Map());
  // cells already animated while editing: cell id -> whether it ended up empty
  const editAnimatedRef = useRef(new Map());
  // just-placed cells held back for PLACE_LEAD_MS: cell id -> color it had.
  // A new Map on every change, since GridLayer reads it as an update trigger
  const [pendingCells, setPendingCells] = useState(() => new Map());
  // release timers for pendingCells, keyed by cell id
  const pendingTimersRef = useRef(new Map());

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

  // schedules a batch of new particle bursts, each auto-removed after
  // BURST_LIFETIME_MS (their own CSS animation runs its course by then)
  const addParticleBursts = (bursts) => {
    if (!bursts.length) return;
    setParticleBursts((prev) => [...prev, ...bursts]);
    bursts.forEach((b) => {
      const timer = setTimeout(() => {
        burstTimersRef.current.delete(b.key);
        setParticleBursts((prev) => prev.filter((e) => e.key !== b.key));
      }, BURST_LIFETIME_MS);
      burstTimersRef.current.set(b.key, timer);
    });
  };

  // holds just-placed cells flat for PLACE_LEAD_MS, then lets them grow
  const holdPlacedCells = (cells) => {
    if (!cells.length) return;
    setPendingCells((prev) => {
      const next = new Map(prev);
      cells.forEach(({ id, color }) => next.set(id, color));
      return next;
    });
    cells.forEach(({ id }) => {
      clearTimeout(pendingTimersRef.current.get(id));
      pendingTimersRef.current.set(
        id,
        setTimeout(() => {
          pendingTimersRef.current.delete(id);
          setPendingCells((prev) => {
            const next = new Map(prev);
            next.delete(id);
            return next;
          });
        }, PLACE_LEAD_MS)
      );
    });
  };

  // clear any pending timers (burst cleanup, held cells) on unmount
  useEffect(() => {
    const timers = [burstTimersRef.current, pendingTimersRef.current];
    return () => {
      timers.forEach((map) => map.forEach((t) => clearTimeout(t)));
    };
  }, []);

  // starting an edit session begins with a clean slate; after it ends, the
  // marks are kept just long enough for cityIO's echo of the edits to arrive
  useEffect(() => {
    const animated = editAnimatedRef.current;
    if (editModeToggle) {
      animated.clear();
      return;
    }
    const timer = setTimeout(() => animated.clear(), EDIT_ECHO_WINDOW_MS);
    return () => clearTimeout(timer);
  }, [editModeToggle]);

  // one burst for a cell that went empty -> filled ("placed") or filled ->
  // empty ("removed"). `color` is the piece's color, `height` its raw height
  const buildBurst = (index, geometry, wasEmpty, color, height) => {
    const centroid = geometry && computeFeatureCentroid(geometry);
    if (!centroid) return null;
    // same accessor GridLayer uses for a cell's height; placed blocks land
    // at the top of the finished piece
    const rawHeight = Array.isArray(height) ? height[1] : 0;
    return {
      key: `${index}-${Date.now()}`,
      lng: centroid[0],
      lat: centroid[1],
      elevation: wasEmpty
        ? (Number(rawHeight) || 0) * GRID_ELEVATION_SCALE
        : 0,
      color: typeof color === "string" ? hexToRgb(color) : color,
      kind: wasEmpty ? "placed" : "removed",
    };
  };

  // GridLayer reports the cells whose piece was just placed/removed by
  // painting in edit mode: animate them right away, and remember them so the
  // update cityIO sends back later doesn't animate the same change again
  const handleCellsEdited = (changes) => {
    const bursts = changes
      .map(({ id, geometry, wasEmpty, color, height }) => {
        editAnimatedRef.current.set(id, !wasEmpty);
        return buildBurst(id, geometry, wasEmpty, color, height);
      })
      .filter(Boolean);
    addParticleBursts(bursts);
    holdPlacedCells(
      changes
        .filter((c) => c.wasEmpty)
        .map(({ id, previousColor }) => ({ id, color: previousColor }))
    );
  };

  // update the grid layer with every change to GEOGRIDDATA, and burst
  // particles at any cell that just got a piece placed on it or removed
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
      // restore, not someone placing/removing pieces: skip the bursts
      if (
        changed.length &&
        changed.length <= newData.length * BULK_CHANGE_RATIO
      ) {
        const held = [];
        const bursts = changed
          .map((i) => {
            const wasEmpty = isEmptyCellType(prevData[i]);
            // already animated while editing: this is just cityIO echoing it
            const editedToEmpty = editAnimatedRef.current.get(i);
            if (editedToEmpty !== undefined) {
              editAnimatedRef.current.delete(i);
              if (editedToEmpty === !wasEmpty) return null;
            }
            if (wasEmpty) held.push({ id: i, color: prevData[i]?.color });
            const sourceCell = wasEmpty ? newData[i] : prevData[i];
            return buildBurst(
              i,
              newGrid.features[i]?.geometry,
              wasEmpty,
              sourceCell?.color,
              newData[i]?.height
            );
          })
          .filter(Boolean);
        addParticleBursts(bursts);
        holdPlacedCells(held);
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
        pendingCells,
        opacity:
          layersMenu &&
          layersMenu.GRID_LAYER_CHECKBOX &&
          layersMenu.GRID_LAYER_CHECKBOX.slider * 0.01,
      },
      updaters: {
        setSelectedCellsState,
        setDraggingWhileEditing,
        setHoveredObj,
        onCellsEdited: handleCellsEdited,
      },
      deckGLRef: deckGLRef,
    }),

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
          particleBursts={particleBursts}
        />
      </div>
    </>
  );
}
