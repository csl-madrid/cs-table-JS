import { createContext, useCallback, useContext, useMemo, useState } from "react";

const STORAGE_KEY = "cityscope.mapStyle";

// Mapbox "standard" is configured (light preset, labels...) by importing it
// from a minimal style that carries the options
const standardStyle = (config) => ({
  version: 8,
  imports: [{ id: "basemap", url: "mapbox://styles/mapbox/standard", config }],
  sources: {},
  layers: [],
});

/**
 * Base map styles the user can switch between.
 * - style: Mapbox style URL, or a style object. Defined once at module level
 *   so its identity is stable and the map does not reload it on every render
 * - preview: CSS background used as the thumbnail in the menu
 */
export const MAP_STYLES = [
  {
    id: "current",
    name: "CityScope",
    description: "Original dark 3D map",
    style: "mapbox://styles/relnox/ck0h5xn701bpr1dqs3he2lecq?fresh=true",
    preview: "linear-gradient(135deg, #0d0d0d 0%, #9a9a9a 100%)",
  },
 
  {
    id: "night",
    name: "Night 3D",
    description: "Lit 3D city at night",
    style: standardStyle({
      lightPreset: "night",
      showPointOfInterestLabels: false,
      showRoadLabels: false,
      showPlaceLabels: false,
      showTransitLabels: false,
    }),
    preview: "linear-gradient(135deg, #0a1428 0%, #3d4f80 100%)",
  },
   {
    id: "day",
    name: "Day 3D",
    description: "Lit 3D city during the day",
    style: standardStyle({
      lightPreset: "day",
      showPointOfInterestLabels: false,
      showRoadLabels: false,
      showPlaceLabels: false,
      showTransitLabels: false,
    }),
    preview: "linear-gradient(135deg, #f4f4f4 0%, #c9ced6 100%)",
  },
   {
    id: "dusk",
    name: "Dusk 3D",
    description: "Lit 3D city at dusk",
    style: standardStyle({
      lightPreset: "dusk",
      showPointOfInterestLabels: false,
      showRoadLabels: false,
      showPlaceLabels: false,
      showTransitLabels: false,
    }),
    preview: "linear-gradient(135deg, #0a1428 0%, #922700 100%)",
  },
   {
    id: "dark",
    name: "Dark",
    description: "Minimal, monochrome",
    style: "mapbox://styles/mapbox/dark-v11",
    preview: "linear-gradient(135deg, #0b0b0b 0%, #2c2c2c 100%)",
  },
  {
    id: "light",
    name: "Light",
    description: "Clean, for bright slides",
    style: "mapbox://styles/mapbox/light-v11",
    preview: "linear-gradient(135deg, #f4f4f4 0%, #c9ced6 100%)",
  },
  {
    id: "satellite",
    name: "Satellite",
    description: "Aerial imagery",
    style: "mapbox://styles/mapbox/satellite-streets-v12",
    preview: "linear-gradient(135deg, #1f3a2a 0%, #7a8a52 100%)",
  },
];

// style used until the user picks another one
const DEFAULT_ID = "night";
const DEFAULT_STYLE = MAP_STYLES.find((s) => s.id === DEFAULT_ID);

// the stored choice is a convenience: any storage failure falls back to the default
const readStoredId = () => {
  try {
    const id = window.localStorage.getItem(STORAGE_KEY);
    return MAP_STYLES.some((s) => s.id === id) ? id : DEFAULT_ID;
  } catch {
    return DEFAULT_ID;
  }
};

const MapStyleContext = createContext({
  mapStyle: DEFAULT_STYLE,
  setMapStyleId: () => {},
});

export function MapStyleProvider({ children }) {
  const [id, setId] = useState(readStoredId);

  const setMapStyleId = useCallback((newId) => {
    setId(newId);
    try {
      window.localStorage.setItem(STORAGE_KEY, newId);
    } catch {
      // storage unavailable (private window, blocked site data...): not critical
    }
  }, []);

  const value = useMemo(
    () => ({
      mapStyle: MAP_STYLES.find((s) => s.id === id) || DEFAULT_STYLE,
      setMapStyleId,
    }),
    [id, setMapStyleId]
  );

  return (
    <MapStyleContext.Provider value={value}>
      {children}
    </MapStyleContext.Provider>
  );
}

export const useMapStyle = () => useContext(MapStyleContext);
