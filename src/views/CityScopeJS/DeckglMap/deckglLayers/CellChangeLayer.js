import { GeoJsonLayer } from "deck.gl";
import { easeOutBack } from "../../../../utils/utils";
import { GRID_ELEVATION_SCALE } from "./GridLayer";

// how long the ring takes to travel from base to top (placed) or top to
// base (removed). Matches GridLayer's own elevation transition so the ring
// rides the edge of the piece rather than moving on its own separate beat
export const RING_DURATION_MS = 550;

/**
 * An unfilled, extruded outline that traces a cell's own footprint (never a
 * neighbour's) while travelling up or down its height, so a change is
 * noticeable even if you weren't looking at that part of the grid:
 * - placed: rises from the ground to the piece's final height
 * - removed: starts at the piece's last height and sinks to the ground
 *
 * Reuses the exact mechanism GridLayer uses for its own height animation
 * (an extruded GeoJsonLayer transitioning a per-feature `getElevation`
 * scalar). deck.gl's `enter` transition option (meant to animate a
 * brand-new feature in from a starting value) does not fire for this kind
 * of layer in this deck.gl version, so instead each ring is inserted at
 * `startZ` and then, one microtask later (done by the caller), updated to
 * `endZ` - a genuine "value changed" transition, which deck.gl does
 * animate reliably.
 *
 * `events`: [{ key, geometry, color: [r,g,b], startZ, endZ, phase: "in" | "out" }]
 */
export default function CellChangeLayer({ events = [] }) {
  const features = events.map((e) => ({
    type: "Feature",
    geometry: e.geometry,
    properties: {
      key: e.key,
      color: e.color?.length >= 3 ? e.color : [255, 255, 255],
      // GeoJsonLayer's own elevationScale multiplies this value, matching
      // how GridLayer converts a cell's raw height into world elevation
      elevation: ((e.phase === "out" ? e.endZ : e.startZ) ?? 0) / GRID_ELEVATION_SCALE,
    },
  }));

  return new GeoJsonLayer({
    id: "GRID_CHANGE_RING",
    data: features,
    pickable: false,
    extruded: true,
    // wireframe-only (filled: false) renders nothing in this deck.gl
    // version, so instead the fill is a faint tint of the piece's own
    // color (a soft "glass" volume) with a fully opaque wireframe edge
    filled: true,
    wireframe: true,
    elevationScale: GRID_ELEVATION_SCALE,
    lineWidthMinPixels: 5,
    getLineWidth: 5,
    getFillColor: (f) => [...f.properties.color.slice(0, 3), 90],
    getLineColor: (f) => [...f.properties.color.slice(0, 3), 255],
    getElevation: (f) => f.properties.elevation,
    // re-run the transition whenever a feature's own target elevation changes
    updateTriggers: {
      getElevation: features.map((f) => f.properties.key + f.properties.elevation),
    },
    transitions: {
      getElevation: { duration: RING_DURATION_MS, easing: easeOutBack },
    },
  });
}
