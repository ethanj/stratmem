/**
 * @file MapView — S2/MI common operating picture.
 *
 * Renders a clean, map-first tactical view. Default view shows aggregate
 * platoon/squad/asset symbols; soldiers stay hidden until zoom or squad
 * expansion. Selecting any symbol opens a detail drawer with status and history.
 */
import { type MutableRefObject, useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import type { Feature, FeatureCollection, LineString, Polygon } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import "./MapView.css";
import type {
  LatLon,
  MapState,
  NamedAreaOfInterest,
  PhaseLine,
  RiskZone,
  Route,
  TacticalEntity,
} from "../types/ravenGap";
import TacticalEntityDrawer from "./map/TacticalEntityDrawer";
import { markerStatus, markerTone, symbolSvgForEntity } from "./map/militarySymbols";

const DEFAULT_ZOOM = 13.4;
const SOLDIER_ZOOM = 14.6;
const STATIC_VECTOR_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: "background", type: "background", paint: { "background-color": "#07100b" } }],
};

const DARK_RASTER_STYLE: maplibregl.StyleSpecification = {
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

type MapViewProps = { map?: MapState | null; };
type LayerKey = "units" | "personnel" | "assets" | "contacts" | "controls";

const BASELINE_ENTITIES: TacticalEntity[] = [
  entity("plt-raven", "PL RAVEN", "PL", "platoon", "SFG-UCI----D", 37.4755, -118.6818),
  entity("1st_squad", "1ST SQUAD", "1", "squad", "SFG-UCI----C", 37.4718, -118.6821),
  entity("2nd_squad", "2ND SQUAD", "2", "squad", "SFG-UCI----C", 37.4787, -118.6749),
  entity("3rd_squad", "3RD SQUAD", "3", "squad", "SFG-UCI----C", 37.4669, -118.6775),
  entity("weapons_squad", "WEAPONS SQD", "WPN", "squad", "SFG-UCWM---C", 37.4762, -118.6858),
  entity("jltv_v1", "JLTV-1", "V1", "vehicle", "SFG-EVA----", 37.4685, -118.6886),
  entity("rq_11", "RQ-11 RAVEN", "RQ-11", "drone", "SFG-UCVU---", 37.4729, -118.6798),
  entity("sensor_s7", "OP/LP SENSOR 7", "S7", "sensor", "SFG-UCR----", 37.4796, -118.6715),
];

export default function MapView({ map }: MapViewProps) {
  const [staticMode, setStaticMode] = useState(false);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    units: true,
    personnel: true,
    assets: true,
    contacts: true,
    controls: true,
  });

  const displayMap = useMemo(() => normalizeMap(map), [map]);
  const entities = useMemo(() => displayMap.entities || BASELINE_ENTITIES, [displayMap]);
  const visibleEntities = useMemo(
    () => filterEntities(entities, layers, expandedIds, zoom),
    [entities, layers, expandedIds, zoom],
  );
  const selected = entities.find((item) => item.id === selectedId);

  return (
    <div className={`panel map-panel risk-${String(displayMap.risk_level || "normal")}`}>
      <div className="panel-header">
        <h2>S2 COMMON OPERATING PICTURE</h2>
        <div className="map-header-controls">
          <span className="map-mgrs-pill">{displayMap.mgrs_grid_anchor?.zone || "MGRS 11S LV"}</span>
          <button type="button" className="map-mode-btn" onClick={() => setStaticMode((value) => !value)}>
            {staticMode ? "TILES" : "VECTOR"}
          </button>
        </div>
      </div>

      <div className={`real-map-shell${staticMode ? "" : " topo-dark"}`}>
        <MapCanvas
          map={displayMap}
          entities={visibleEntities}
          controlsVisible={layers.controls}
          staticMode={staticMode}
          onSelect={setSelectedId}
          onZoom={setZoom}
          onTilesFailed={() => setStaticMode(true)}
        />
        <MapChrome entities={entities} visibleEntities={visibleEntities} layers={layers} onToggle={setLayers} />
        <TacticalEntityDrawer
          entity={selected}
          onClose={() => setSelectedId(null)}
          onExpandParent={(entity) => setExpandedIds((current) => new Set([...current, entity.id]))}
        />
      </div>
    </div>
  );
}

type CanvasProps = {
  map: MapState;
  entities: TacticalEntity[];
  controlsVisible: boolean;
  staticMode: boolean;
  onSelect: (id: string) => void;
  onZoom: (zoom: number) => void;
  onTilesFailed: () => void;
};

function MapCanvas(props: CanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRefs = useRef<Map<string, maplibregl.Marker>>(new Map());
  const propsRef = useRef(props);

  useEffect(() => { propsRef.current = props; }, [props]);
  useEffect(() => initMap(containerRef, mapRef, markerRefs, propsRef), [props.staticMode]);
  useEffect(() => updateMap(mapRef.current, markerRefs.current, props), [props]);

  return <div ref={containerRef} className="real-map" />;
}

function initMap(
  containerRef: MutableRefObject<HTMLDivElement | null>,
  mapRef: MutableRefObject<maplibregl.Map | null>,
  markerRefs: MutableRefObject<Map<string, maplibregl.Marker>>,
  propsRef: MutableRefObject<CanvasProps>,
) {
  if (!containerRef.current || mapRef.current) return undefined;
  const instance = new maplibregl.Map({
    container: containerRef.current,
    style: propsRef.current.staticMode ? STATIC_VECTOR_STYLE : DARK_RASTER_STYLE,
    center: computeCenter(propsRef.current.map),
    zoom: DEFAULT_ZOOM,
    pitch: 24,
    bearing: -8,
    attributionControl: false,
  });

  instance.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
  instance.on("zoom", () => propsRef.current.onZoom(instance.getZoom()));
  instance.on("error", (event) => handleMapError(event, propsRef.current.onTilesFailed));
  instance.on("load", () => updateMap(instance, markerRefs.current, propsRef.current));
  mapRef.current = instance;

  return () => {
    markerRefs.current.forEach((marker) => marker.remove()); markerRefs.current.clear();
    instance.remove();
    mapRef.current = null;
  };
}

function updateMap(
  instance: maplibregl.Map | null,
  markerRefs: Map<string, maplibregl.Marker>,
  props: CanvasProps,
) {
  if (!instance || !instance.isStyleLoaded()) return;
  updateControlLayers(instance, props.map, props.controlsVisible);
  syncMarkers(instance, markerRefs, props.entities, props.onSelect);
}

function updateControlLayers(instance: maplibregl.Map, map: MapState, visible: boolean) {
  setSourceData(instance, "nai-polygons", naiCollection(visible ? map.nais : []), "fill");
  setSourceData(instance, "phase-lines", lineCollection(visible ? map.phase_line : []), "line");
  setSourceData(instance, "routes", routeCollection(visible ? map.routes : []), "line");
  setSourceData(instance, "risk-zones", riskCollection(map.risk_zones), "fill");
  ensureLayer(instance, "nai-fill", "nai-polygons", "fill", "#1f9d7a", 0.09);
  ensureLine(instance, "nai-line", "nai-polygons", "#4ade80", 1.2, [2, 2]);
  ensureLine(instance, "phase-line", "phase-lines", "#fbbf24", 2, [3, 2]);
  ensureLine(instance, "route-line", "routes", "#38bdf8", 2, [4, 2]);
  ensureLayer(instance, "risk-fill", "risk-zones", "fill", "#ef4444", 0.13);
}

function syncMarkers(
  instance: maplibregl.Map,
  markerRefs: Map<string, maplibregl.Marker>,
  entities: TacticalEntity[],
  onSelect: (id: string) => void,
) {
  const nextIds = new Set(entities.map((item) => item.id));
  markerRefs.forEach((marker, id) => {
    if (!nextIds.has(id)) {
      marker.remove();
      markerRefs.delete(id);
    }
  });
  entities.forEach((entity) => upsertMarker(instance, markerRefs, entity, onSelect));
}

function upsertMarker(
  instance: maplibregl.Map,
  markerRefs: Map<string, maplibregl.Marker>,
  entity: TacticalEntity,
  onSelect: (id: string) => void,
) {
  const current = markerRefs.get(entity.id);
  if (current) {
    updateMarkerElement(current.getElement(), entity, onSelect);
    current.setLngLat([entity.lon, entity.lat]);
    return;
  }
  const element = document.createElement("button");
  updateMarkerElement(element, entity, onSelect);
  markerRefs.set(entity.id, new maplibregl.Marker({ element, anchor: "center" }).setLngLat([entity.lon, entity.lat]).addTo(instance));
}

function updateMarkerElement(element: HTMLElement, entity: TacticalEntity, onSelect: (id: string) => void) {
  element.className = `mil-marker ${markerTone(entity)} ${markerStatus(entity)}`;
  element.onclick = (event) => {
    event.stopPropagation();
    onSelect(entity.id);
  };
  let symbol = element.querySelector<HTMLSpanElement>(".mil-marker-symbol");
  let label = element.querySelector<HTMLSpanElement>(".mil-marker-label");
  if (!symbol || !label) {
    symbol = document.createElement("span");
    label = document.createElement("span");
    symbol.className = "mil-marker-symbol";
    label.className = "mil-marker-label";
    element.replaceChildren(symbol, label);
  }
  symbol.innerHTML = symbolSvgForEntity(entity);
  label.textContent = entity.callsign || entity.label;
}

type ChromeProps = {
  entities: TacticalEntity[];
  visibleEntities: TacticalEntity[];
  layers: Record<LayerKey, boolean>;
  onToggle: (layers: Record<LayerKey, boolean>) => void;
};

function MapChrome({ entities, visibleEntities, layers, onToggle }: ChromeProps) {
  return (
    <>
      <div className="map-vignette" />
      <div className="map-layer-bar">
        {(Object.keys(layers) as LayerKey[]).map((key) => (
          <button
            type="button"
            key={key}
            className={layers[key] ? "active" : ""}
            onClick={() => onToggle({ ...layers, [key]: !layers[key] })}
          >
            {key}
          </button>
        ))}
      </div>
      <div className="map-count-strip">
        <span>ALL {entities.length}</span>
        <span>VISIBLE {visibleEntities.length}</span>
        <span>SELECT SYMBOL FOR DETAILS</span>
      </div>
    </>
  );
}

function filterEntities(
  entities: TacticalEntity[],
  layers: Record<LayerKey, boolean>,
  expanded: Set<string>,
  zoom: number,
) {
  return entities.filter((entity) => {
    if (entity.entity_type === "personnel") {
      return layers.personnel && (zoom >= SOLDIER_ZOOM || expanded.has(entity.parent_id || ""));
    }
    if (entity.entity_type === "contact") return layers.contacts;
    if (["vehicle", "drone", "sensor"].includes(entity.entity_type)) return layers.assets;
    return layers.units;
  });
}

function normalizeMap(map?: MapState | null): MapState {
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

function setSourceData(instance: maplibregl.Map, id: string, data: FeatureCollection, kind: "fill" | "line") {
  const source = instance.getSource(id) as maplibregl.GeoJSONSource | undefined;
  if (source) {
    source.setData(data);
    return;
  }
  instance.addSource(id, { type: "geojson", data });
  if (kind === "line") return;
}

function ensureLayer(instance: maplibregl.Map, id: string, source: string, type: "fill", color: string, opacity: number) {
  if (!instance.getLayer(id)) {
    instance.addLayer({ id, type, source, paint: { "fill-color": color, "fill-opacity": opacity } });
  }
}

function ensureLine(instance: maplibregl.Map, id: string, source: string, color: string, width: number, dash: number[]) {
  if (!instance.getLayer(id)) {
    instance.addLayer({ id, type: "line", source, paint: { "line-color": color, "line-width": width, "line-dasharray": dash } });
  }
}

function naiCollection(nais: NamedAreaOfInterest[] = []): FeatureCollection<Polygon> {
  return collection(nais.map((item) => polygonFeature(item.id, item.polygon)));
}

function lineCollection(lines: PhaseLine[] = []): FeatureCollection<LineString> {
  return collection(lines.map((item) => lineFeature(item.id, item.points)));
}

function routeCollection(routes: Route[] = []): FeatureCollection<LineString> {
  return collection(routes.map((item) => lineFeature(item.id, item.points)));
}

function riskCollection(zones: RiskZone[] = []): FeatureCollection<Polygon> {
  return collection(zones.map((item) => polygonFeature(item.id, circle(item))));
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

function computeCenter(map: MapState): [number, number] {
  const first = map.entities?.[0];
  return first ? [first.lon, first.lat] : [-118.6818, 37.4755];
}

function handleMapError(event: maplibregl.ErrorEvent, onTilesFailed: () => void) {
  const error = event.error as { url?: string } | undefined;
  if (error?.url?.includes("tile.opentopomap.org")) onTilesFailed();
}

function withFallback<T>(value: T[] | undefined, fallback: T[]): T[] {
  return Array.isArray(value) && value.length > 0 ? value : fallback;
}

function entity(id: string, label: string, callsign: string, entityType: TacticalEntity["entity_type"], sidc: string, lat: number, lon: number): TacticalEntity {
  return { id, label, callsign, entity_type: entityType, sidc, lat, lon, parent_id: null, affiliation: "friend", nationality: "USA", echelon: entityType, status: { readiness: "green", health: "green", ammo: "green", comms: "green", mobility: "green" }, history: [] };
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
