import { useState, useEffect, useRef, useMemo } from "react";
import { useSelector } from "react-redux";
import DeckGL from "@deck.gl/react";
import {
  LightingEffect,
  AmbientLight,
  DirectionalLight,
  WebMercatorViewport,
  LinearInterpolator,
} from "deck.gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { computeMidGridCell } from "../../../utils/utils";
import { Map as MapGL } from "react-map-gl";
import { useMapStyle } from "../../../Components/MapStyleContext";
import CellChangeParticles from "../../../Components/CellChangeParticles";
import { DEMO_TRANSITION_MS } from "../DemoMode/layout";

// eases like the demo layout's own CSS transition (DEMO_EASING there is
// "cubic-bezier(0.2, 0.8, 0.2, 1)"), so the camera and the surrounding
// panels appear to move together. Deck.gl's transitionEasing takes a plain
// (t) => t function, not a CSS easing string, and a cubic-bezier has no
// closed form: this cubic ease-out is visually very close and cheap per frame
const easeDemoTransition = (t) => 1 - Math.pow(1 - t, 3);
const demoTransition = new LinearInterpolator(["longitude", "latitude", "zoom"]);

// direction of a light that travels from the left of the screen to its right,
// as seen by a camera looking towards `bearing`, dropping `drop` units
// towards the ground for each unit of horizontal travel
const leftToRight = (bearing, drop) => {
  const rad = ((bearing + 90) * Math.PI) / 180;
  return [Math.sin(rad), Math.cos(rad), -drop];
};

// soft studio-like lighting: gives volume to the extruded cells
// without washing out or darkening the colors coming from cityIO.
// `bearing` is the heading of the initial camera
const createLightingEffect = (bearing) =>
  new LightingEffect({
    // total light stays close to 1 so the top faces are not overexposed
    // (overexposure is what washes the colors out towards pastel)
    ambient: new AmbientLight({ color: [255, 255, 255], intensity: 0.65 }),
    // main light: from the left of the screen to the right
    key: new DirectionalLight({
      color: [255, 255, 255],
      intensity: 0.8,
      direction: leftToRight(bearing, 1),
    }),
    // almost vertical: lights the tops of the cells only. The key light was
    // lowered from 1.0 so that the tops do not end up overexposed
    top: new DirectionalLight({
      color: [255, 255, 255],
      intensity: 0.4,
      direction: [0.15, 0.25, -3],
    }),
    fill: new DirectionalLight({
      color: [200, 210, 255],
      intensity: 0.3,
      direction: [2, 1, -1.5],
    }),
  });

// hides all text/icon labels (streets, places, POIs...) on "classic" Mapbox
// styles (a style URL or a plain style object with a `layers` array). The
// "standard" style (Night 3D) is handled separately, through its own config
// (see MapStyleContext.js): its road/basemap layers live inside a style
// "import" and are not reachable through getStyle().layers, and this
// listener never even fires for it (Mapbox GL JS does not emit "styledata"
// for that style definition)
const hideMapLabels = (e) => {
  const map = e.target;
  let style;
  try {
    style = map.getStyle();
  } catch {
    // style not loaded yet: a later styledata event will retry
    return;
  }
  (style?.layers || []).forEach((layer) => {
    if (layer.type !== "symbol" || layer.layout?.visibility === "none") return;
    try {
      map.setLayoutProperty(layer.id, "visibility", "none");
    } catch {
      // layer not ready yet: a later styledata event will retry
    }
  });
};

// initial camera: a close, tilted view of the grid, seen from its left side.
// The bearing is relative to the grid axes (360 - header.rotation); +90
// orbits the camera a quarter turn to the left of that view
const INITIAL_PITCH = 40;
const INITIAL_ZOOM = 16.5;
const INITIAL_BEARING_OFFSET = 90;
// grid width (meters) that INITIAL_ZOOM was tuned for (a 4x4 grid of 63 m cells);
// bigger or smaller grids are zoomed out / in so they keep the same framing
const REFERENCE_EXTENT = 252;
// the view center sits this fraction of the grid width ahead of the grid
// (along the camera heading), so the grid lands a bit below the screen center
const INITIAL_CENTER_SHIFT = 0.15;
// the view center also sits this fraction of the grid width to the right of the
// camera, so the grid lands to the left of the screen center (0 = centered,
// negative = grid to the right)
const INITIAL_SIDE_SHIFT = 0.1;
// demo view only: extra zoom on top of the automatic framing of its smaller
// map box. 1 = same framing as the full window scaled down; 2 = grid twice as
// big (each doubling is one zoom level); 0.8 = smaller
const DEMO_ZOOM_BOOST = 1.3;
// demo view only, same meaning as INITIAL_CENTER_SHIFT / INITIAL_SIDE_SHIFT but
// for its own map box. Vertical: positive moves the grid down the screen,
// negative up, 0 = centered. Horizontal: positive moves the grid to the left,
// negative to the right, 0 = centered. The distance on screen grows with zoom
const DEMO_CENTER_SHIFT = 0.25;
const DEMO_SIDE_SHIFT = 0;
const METERS_PER_DEGREE = 111320;

const computeInitialBearing = (header) =>
  (360 - header.rotation + INITIAL_BEARING_OFFSET) % 360;

const gridExtent = (header) =>
  Math.max(header.nrows, header.ncols) * header.cellSize;

// `sizeFactor` is how much smaller than the window the map is (1 = as big):
// the zoom drops by log2 of it so the grid keeps its place inside the box
const computeInitialZoom = (header, sizeFactor = 1) => {
  const extent = gridExtent(header);
  if (!extent) return INITIAL_ZOOM;
  const zoom =
    INITIAL_ZOOM - Math.log2(extent / REFERENCE_EXTENT) + Math.log2(sizeFactor);
  return Math.min(Math.max(zoom, 12), 19);
};

// moves a [lon, lat] point `meters` towards `bearing` (degrees from north)
const shiftPoint = ([lon, lat], meters, bearing) => {
  const rad = (bearing * Math.PI) / 180;
  return [
    lon +
      (meters * Math.sin(rad)) /
        (METERS_PER_DEGREE * Math.cos((lat * Math.PI) / 180)),
    lat + (meters * Math.cos(rad)) / METERS_PER_DEGREE,
  ];
};

export default function DeckglBase({
  layers,
  draggingWhileEditing,
  setDeckGLRef,
  particleBursts,
  demoMode = false,
  mapSize,
}) {
  const cityIOdata = useSelector((state) => state.cityIOdataState.cityIOdata);
  const menuState = useSelector((state) => state.menuState);
  // in the demo view the map is a box smaller than the window, without side
  // panels: frame the grid for that box, and center it instead of leaving
  // room for the panels
  const sizeFactor =
    demoMode && mapSize
      ? DEMO_ZOOM_BOOST *
        (Math.round(
          Math.min(
            mapSize.width / window.innerWidth,
            mapSize.height / window.innerHeight
          ) * 100
        ) /
          100)
      : 1;
  const [viewState, setViewState] = useState();
  const ref = useRef(null);
  // particleBursts, with each one's screen position added once (bursts are
  // short-lived, so no need to keep re-projecting on every camera move)
  const [projectedBursts, setProjectedBursts] = useState([]);

  const { mapStyle } = useMapStyle();

  // the light is defined relative to the initial camera heading
  const initialBearing = computeInitialBearing(
    cityIOdata.GEOGRID.properties.header
  );
  const lightingEffect = useMemo(
    () => createLightingEffect(initialBearing),
    [initialBearing]
  );

  // when ref is set, set the deckGLRef
  useEffect(() => {
    ref.current && setDeckGLRef(ref);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref]);

  const viewControlButton =
    menuState?.viewSettingsMenuState?.VIEW_CONTROL_BUTTONS;

  // **
  //  * resets the camera viewport
  //  * to cityIO header data
  //  * https://github.com/uber/deck.gl/blob/master/test/apps/viewport-transitions-flyTo/src/app.js
  //  *
  const setViewStateToTableHeader = () => {
    const header = cityIOdata.GEOGRID.properties.header;
    const bearing = computeInitialBearing(header);
    const extent = gridExtent(header) || 0;
    const ahead = shiftPoint(
      computeMidGridCell(cityIOdata),
      (demoMode ? DEMO_CENTER_SHIFT : INITIAL_CENTER_SHIFT) * extent,
      bearing
    );
    const [longitude, latitude] = shiftPoint(
      ahead,
      (demoMode ? DEMO_SIDE_SHIFT : INITIAL_SIDE_SHIFT) * extent,
      bearing + 90
    );
    return {
      ...viewState,
      longitude,
      latitude,
      zoom: computeInitialZoom(header, sizeFactor),
      pitch: INITIAL_PITCH,
      bearing,
      orthographic: false,
    };
  };

  // re-frames the grid, gliding the camera there instead of snapping, so it
  // tracks the demo layout's own CSS transition (see DemoMode/layout.js) as
  // the map box resizes between the regular and the demo view. Also fires
  // once more once the demo box's real size arrives (its target size is only
  // known - and used - right when the view switches, ahead of the CSS/layout
  // actually catching up), but skips the very first run: on mount there is
  // nothing to glide from yet, and setViewStateToTableHeader() below already
  // frames the initial view
  const hasFramedRef = useRef(false);
  useEffect(() => {
    if (!hasFramedRef.current) {
      hasFramedRef.current = true;
      return;
    }
    setViewState({
      ...setViewStateToTableHeader(),
      transitionDuration: DEMO_TRANSITION_MS,
      transitionInterpolator: demoTransition,
      transitionEasing: easeDemoTransition,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoMode, sizeFactor]);

  // gives each new burst its screen position. Where the camera is, in order
  // of preference: deck.gl's own live viewport (getViewports() throws while it
  // is initializing, and is empty if the canvas has no size yet), the last
  // `viewState` (only set after the first camera move), and finally the
  // initial view, which is what deck.gl shows until someone moves the camera
  useEffect(() => {
    let deckViewport;
    try {
      deckViewport = ref.current?.deck?.getViewports?.()[0];
    } catch {
      deckViewport = undefined;
    }
    const viewport =
      deckViewport ||
      new WebMercatorViewport({
        ...(viewState || setViewStateToTableHeader()),
        width: mapSize?.width || window.innerWidth,
        height: mapSize?.height || window.innerHeight,
      });
    setProjectedBursts((prev) => {
      const prevByKey = new Map(prev.map((b) => [b.key, b]));
      return (particleBursts || []).map((b) => {
        const existing = prevByKey.get(b.key);
        if (existing) return existing;
        // screen position of the cell's base, and how many pixels above it
        // the finished piece's top lands (placed blocks rise that far)
        const [x, y] = viewport.project([b.lng, b.lat, 0]);
        const riseY = b.elevation
          ? Math.max(0, y - viewport.project([b.lng, b.lat, b.elevation])[1])
          : 0;
        return { ...b, x, y, riseY };
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [particleBursts, viewState]);

  useEffect(() => {
    const header = cityIOdata.GEOGRID.properties.header;
    const midGrid = computeMidGridCell(cityIOdata);

    switch (viewControlButton) {
      case "RESET_VIEW_BUTTON":
        setViewState((prevViewState) => ({
          ...prevViewState,
          longitude: midGrid[0],
          latitude: midGrid[1],
          pitch: 0,
          bearing: 0,
          orthographic: false,
        }));
        break;

      case "NORTH_VIEW_BUTTON":
        setViewState((prevViewState) => ({
          ...prevViewState,
          bearing: 360 - header.rotation,
        }));
        break;

      case "ORTHO_VIEW_BUTTON":
        setViewState((prevViewState) => ({
          ...prevViewState,
          orthographic: prevViewState.orthographic
            ? !prevViewState.orthographic
            : true,
        }));

        break;
      default:
        break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewControlButton]);

  // fix deck view rotate
  useEffect(() => {
    document
      // ! a more aggressive method which prevents all right click context menu [ OLD: .getElementById("deckgl-wrapper")]
      .addEventListener("contextmenu", (evt) => evt.preventDefault());
    // zoom map on CS table location
    setViewStateToTableHeader();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onViewStateChange = ({ viewState }) => {
    viewState.orthographic =
      viewControlButton === "ORTHO_VIEW_BUTTON" ? true : false;
    setViewState(viewState);
  };

  return (
    <DeckGL
      ref={ref}
      viewState={viewState}
      initialViewState={setViewStateToTableHeader()}
      onViewStateChange={onViewStateChange}
      layers={layers}
      effects={[lightingEffect]}
      controller={{
        touchZoom: true,
        touchRotate: true,
        dragPan: !draggingWhileEditing,
        dragRotate: !draggingWhileEditing,
        keyboard: false,
      }}
    >
      <MapGL
        mapStyle={mapStyle.style}
        mapboxAccessToken={process.env.REACT_APP_MAPBOX_TOKEN}
        onStyleData={hideMapLabels}
      />
      <CellChangeParticles bursts={projectedBursts} />
    </DeckGL>
  );
}
/*
 sat: "mapbox://styles/relnox/cjs9rb33k2pix1fo833uweyjd?fresh=true",
      dark: "mapbox://styles/relnox/ck0h5xn701bpr1dqs3he2lecq?fresh=true",
      blue: "mapbox://styles/relnox/ck0h5xn701bpr1dqs3he2lecq?fresh=true",
      normal: "mapbox://styles/relnox/cl8dv36nv000t14qik9yg4ys6?fresh=true",
*/