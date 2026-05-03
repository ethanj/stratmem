/**
 * @file Map geometry helpers for the Raven Gap MapLibre view.
 *
 * This module keeps fallback data, style objects, and GeoJSON conversion logic
 * out of the React component so MapView stays focused on rendering behavior.
 */
import maplibregl from "maplibre-gl";
import type { Feature, FeatureCollection, LineString, Polygon } from "geojson";
import type {
  LatLon,
  MapState,
  NamedAreaOfInterest,
  PhaseLine,
  RiskZone,
  Route,
  TacticalEntity,
} from "../../types/ravenGap";

export const STATIC_VECTOR_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: "background", type: "background", paint: { "background-color": "#07100b" } }],
};

export const DARK_RASTER_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    topo: {
      type: "raster",
      tiles: [
        "https://a.tile.opentopomap.org/{z}/{x}/{y}.png",
        "https://b.tile.opentopomap.org/{z}/{x}/{y}.png",
        "https://c.tile.opentopomap.org/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "&copy; OpenTopoMap",
    },
  },
  layers: [{ id: "topo-layer", type: "raster", source: "topo", minzoom: 0, maxzoom: 17 }],
};

export const BASELINE_ENTITIES: TacticalEntity[] = [
  entity("plt-raven", "PL RAVEN", "PL", "platoon", "SFG-UCI----D", 37.4755, -118.6818),
  entity("1st_squad", "1ST SQUAD", "1", "squad", "SFG-UCI----C", 37.4718, -118.6821),
  entity("2nd_squad", "2ND SQUAD", "2", "squad", "SFG-UCI----C", 37.4787, -118.6749),
  entity("3rd_squad", "3RD SQUAD", "3", "squad", "SFG-UCI----C", 37.4669, -118.6775),
  entity("weapons_squad", "WEAPONS SQD", "WPN", "squad", "SFG-UCWM---C", 37.4762, -118.6858),
  entity("jltv_v1", "JLTV-1", "V1", "vehicle", "SFG-EVA----", 37.4685, -118.6886),
  entity("rq_11", "RQ-11 RAVEN", "RQ-11", "drone", "SFG-UCVU---", 37.4729, -118.6798),
  entity("sensor_s7", "OP/LP SENSOR 7", "S7", "sensor", "SFG-UCR----", 37.4796, -118.6715),
];

export function normalizeMap(map?: MapState | null): MapState {
  return {
    ...(map || {}),
    mgrs_grid_anchor: map?.mgrs_grid_anchor || { easting: 42820, northing: 49210, zone: "11S LV" },
    phase_line: withFallback(map?.phase_line, baselinePhaseLine()),
    checkpoints: map?.checkpoints || [],
    nais: withFallback(map?.nais, baselineNais()),
    risk_zones: withFallback(map?.risk_zones, baselineRiskZones()),
    routes: withFallback(map?.routes, baselineRoutes()),
    entities: withFallback(map?.entities, BASELINE_ENTITIES),
  };
}

export function setSourceData(
  instance: maplibregl.Map,
  id: string,
  data: FeatureCollection,
): void {
  const source = instance.getSource(id) as maplibregl.GeoJSONSource | undefined;
  if (source) {
    source.setData(data);
    return;
  }
  instance.addSource(id, { type: "geojson", data });
}

export function ensureLayer(
  instance: maplibregl.Map,
  id: string,
  source: string,
  color: string,
  opacity: number,
): void {
  if (!instance.getLayer(id)) {
    instance.addLayer({ id, type: "fill", source, paint: { "fill-color": color, "fill-opacity": opacity } });
  }
}

export function ensureLine(
  instance: maplibregl.Map,
  id: string,
  source: string,
  color: string,
  width: number,
  dash: number[],
): void {
  if (!instance.getLayer(id)) {
    instance.addLayer({ id, type: "line", source, paint: { "line-color": color, "line-width": width, "line-dasharray": dash } });
  }
}

export function naiCollection(nais: NamedAreaOfInterest[] = []): FeatureCollection<Polygon> {
  return collection(nais.map((item) => polygonFeature(item.id, item.polygon)));
}

export function lineCollection(lines: PhaseLine[] = []): FeatureCollection<LineString> {
  return collection(lines.map((item) => lineFeature(item.id, item.points)));
}

export function routeCollection(routes: Route[] = []): FeatureCollection<LineString> {
  return collection(routes.map((item) => lineFeature(item.id, item.points)));
}

export function riskCollection(zones: RiskZone[] = []): FeatureCollection<Polygon> {
  return collection(zones.map((item) => polygonFeature(item.id, circle(item))));
}

export function computeCenter(map: MapState): [number, number] {
  const first = map.entities?.[0];
  return first ? [first.lon, first.lat] : [-118.6818, 37.4755];
}

export function handleMapError(event: maplibregl.ErrorEvent, onTilesFailed: () => void): void {
  const error = event.error as { url?: string } | undefined;
  if (error?.url?.includes("tile.opentopomap.org")) onTilesFailed();
}

function collection<T extends Polygon | LineString>(features: Feature<T>[]): FeatureCollection<T> {
  return { type: "FeatureCollection", features };
}

function polygonFeature(id: string, points: LatLon[]): Feature<Polygon> {
  return { type: "Feature", id, properties: {}, geometry: { type: "Polygon", coordinates: [[...points.map(lngLat), lngLat(points[0])]] } };
}

function lineFeature(id: string, points: LatLon[]): Feature<LineString> {
  return { type: "Feature", id, properties: {}, geometry: { type: "LineString", coordinates: points.map(lngLat) } };
}

function circle(zone: RiskZone): LatLon[] {
  return Array.from({ length: 32 }, (_, index) => {
    const angle = (index / 32) * Math.PI * 2;
    return { lat: zone.lat + Math.sin(angle) * 0.004, lon: zone.lon + Math.cos(angle) * 0.004 };
  });
}

function lngLat(point: LatLon): [number, number] {
  return [point.lon, point.lat];
}

function entity(id: string, label: string, callsign: string, entityType: TacticalEntity["entity_type"], sidc: string, lat: number, lon: number): TacticalEntity {
  return { id, label, callsign, entity_type: entityType, sidc, lat, lon, parent_id: null, affiliation: "friend", nationality: "USA", echelon: entityType, status: { readiness: "green", health: "green", ammo: "green", comms: "green", mobility: "green" }, history: [] };
}

function withFallback<T>(value: T[] | undefined, fallback: T[]): T[] {
  return Array.isArray(value) && value.length > 0 ? value : fallback;
}

function baselinePhaseLine(): PhaseLine[] {
  return [{ id: "pl_raven", label: "PL Raven", points: [{ lat: 37.4662, lon: -118.6788 }, { lat: 37.4825, lon: -118.6762 }] }];
}

function baselineNais(): NamedAreaOfInterest[] {
  return [{ id: "nai_2", label: "NAI-2 East Ridge", polygon: [{ lat: 37.4772, lon: -118.6758 }, { lat: 37.4772, lon: -118.6718 }, { lat: 37.4812, lon: -118.6718 }, { lat: 37.4812, lon: -118.6758 }] }];
}

function baselineRiskZones(): RiskZone[] {
  return [{ id: "rz_nai_2", label: "NAI-2 contact risk", lat: 37.4792, lon: -118.6738, radius_m: 520 }];
}

function baselineRoutes(): Route[] {
  return [{ id: "route-finch", name: "Route Finch", status: "amber", points: [{ lat: 37.4685, lon: -118.6886 }, { lat: 37.4718, lon: -118.6821 }, { lat: 37.4815, lon: -118.6698 }] }];
}
