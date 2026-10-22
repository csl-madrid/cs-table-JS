import map from "./map";
import landuse from "./landuse";
import radar from "./radar";
import bar from "./bar";
import abm from "./abm";
import sentiment from "./sentiment";
import abmValues from "./abmValues";
import abmActivities from "./abmActivities";
import abmModes from "./abmModes";
import abmDistance from "./abmDistance";
import abmDuration from "./abmDuration";
import abmModalSplit from "./abmModalSplit";

/**
 * Everything the demo view can show. To add a module: create a file in this
 * folder with a default export shaped like this, and list it below.
 *
 * @typedef {Object} Module
 * @property {string} id           unique; it is what the layout state stores
 * @property {string} title
 * @property {string} subheader
 * @property {JSX.Element} icon
 * @property {React.ComponentType} [component]  rendered inside its box; in the demo
 *   view it gets `fill` and has to take the whole box, whatever its shape
 * @property {string} [toolTipInfo]
 * @property {boolean} [persistent] mounted once and moved over its box instead of
 *   rendered inside it; its component then gets `demoMode` and `mapSize`
 * @property {boolean} [comingSoon] listed, but nothing to show yet
 */
export const MODULES = [
  map,
  landuse,
  radar,
  bar,
  abm,
  sentiment,
  abmValues,
  abmActivities,
  abmModes,
  abmDistance,
  abmDuration,
  abmModalSplit,
];

export const getModule = (id) => MODULES.find((m) => m.id === id);
