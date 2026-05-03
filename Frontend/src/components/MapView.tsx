/**
 * @file MapView — S2/MI common operating picture.
 *
 * Renders a clean, map-first tactical view. Default view shows aggregate
 * platoon/squad/asset symbols; soldiers stay hidden until zoom or squad
 * expansion. Selecting a symbol notifies the dashboard readiness rail.
 */
import { type MutableRefObject, useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "./MapView.css";
import type { MapState, TacticalEntity } from "../types/ravenGap";
import {
  BASELINE_ENTITIES,
  DARK_RASTER_STYLE,
  STATIC_VECTOR_STYLE,
  computeCenter,
  ensureLayer,
  ensureLine,
  handleMapError,
  lineCollection,
  naiCollection,
  normalizeMap,
  riskCollection,
  routeCollection,
  setSourceData,
} from "./map/mapGeometry";
import { markerStatus, markerTone, symbolSvgForEntity } from "./map/militarySymbols";

const DEFAULT_ZOOM = 13.4;
const SQUAD_ZOOM = 13.85;
const SOLDIER_ZOOM = 15.8;

type MapViewProps = {
  map?: MapState | null;
  selectedEntityId?: string | null;
  expandedEntityIds?: string[];
  onSelectEntity?: (id: string) => void;
};
type LayerKey = "units" | "personnel" | "assets" | "contacts" | "controls";
type CameraState = {
  center: [number, number];
  zoom: number;
};

export default function MapView({
  map,
  selectedEntityId = null,
  expandedEntityIds = [],
  onSelectEntity,
}: MapViewProps) {
  const [staticMode, setStaticMode] = useState(false);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [layerTrayOpen, setLayerTrayOpen] = useState(false);
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    units: true,
    personnel: true,
    assets: true,
    contacts: true,
    controls: true,
  });

  const displayMap = useMemo(() => normalizeMap(map), [map]);
  const entities = useMemo(() => displayMap.entities || BASELINE_ENTITIES, [displayMap]);
  const expandedIds = useMemo(() => new Set(expandedEntityIds), [expandedEntityIds]);
  const visibleEntities = useMemo(
    () => filterEntities(entities, layers, expandedIds, zoom, selectedEntityId),
    [entities, layers, expandedIds, zoom, selectedEntityId],
  );
  const handleSelect = onSelectEntity || (() => undefined);

  return (
    <div className={`panel map-panel risk-${String(displayMap.risk_level || "normal")}`}>
      <div className="panel-header">
        <h2>S2 COMMON OPERATING PICTURE</h2>
        <div className="map-header-controls">
          <span className="map-mgrs-pill">{displayMap.mgrs_grid_anchor?.zone || "MGRS 11S LV"}</span>
          <button
            type="button"
            className="map-mode-btn"
            title={staticMode ? "Switch to online terrain tiles" : "Switch to local vector fallback"}
            onClick={() => setStaticMode((value) => !value)}
          >
            {staticMode ? "LOCAL GRID" : "TERRAIN"}
          </button>
        </div>
      </div>

      <div className={`real-map-shell${staticMode ? "" : " topo-dark"}`}>
        <MapCanvas
          map={displayMap}
          entities={visibleEntities}
          selectedEntityId={selectedEntityId}
          controlsVisible={layers.controls}
          staticMode={staticMode}
          onSelect={handleSelect}
          onZoom={setZoom}
          onTilesFailed={() => setStaticMode(true)}
        />
        <MapChrome
          entities={entities}
          visibleEntities={visibleEntities}
          layers={layers}
          trayOpen={layerTrayOpen}
          onToggle={setLayers}
          onTrayToggle={() => setLayerTrayOpen((value) => !value)}
        />
      </div>
    </div>
  );
}

type CanvasProps = {
  map: MapState;
  entities: TacticalEntity[];
  selectedEntityId?: string | null;
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
  const cameraRef = useRef<CameraState | null>(null);

  useEffect(() => { propsRef.current = props; }, [props]);
  useEffect(() => initMap(containerRef, mapRef, markerRefs, propsRef, cameraRef), [props.staticMode]);
  useEffect(() => updateMap(mapRef.current, markerRefs.current, props), [props]);

  return <div ref={containerRef} className="real-map" />;
}

function initMap(
  containerRef: MutableRefObject<HTMLDivElement | null>,
  mapRef: MutableRefObject<maplibregl.Map | null>,
  markerRefs: MutableRefObject<Map<string, maplibregl.Marker>>,
  propsRef: MutableRefObject<CanvasProps>,
  cameraRef: MutableRefObject<CameraState | null>,
) {
  if (!containerRef.current || mapRef.current) return undefined;
  const camera = cameraRef.current;
  const instance = new maplibregl.Map({
    container: containerRef.current,
    style: propsRef.current.staticMode ? STATIC_VECTOR_STYLE : DARK_RASTER_STYLE,
    center: camera?.center ?? computeCenter(propsRef.current.map),
    zoom: camera?.zoom ?? DEFAULT_ZOOM,
    pitch: 0,
    bearing: 0,
    attributionControl: false,
  });

  instance.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), "top-right");
  instance.on("zoom", () => propsRef.current.onZoom(instance.getZoom()));
  instance.on("error", (event) => handleMapError(event, propsRef.current.onTilesFailed));
  instance.on("load", () => {
    propsRef.current.onZoom(instance.getZoom());
    updateMap(instance, markerRefs.current, propsRef.current);
  });
  mapRef.current = instance;

  return () => {
    const center = instance.getCenter();
    cameraRef.current = { center: [center.lng, center.lat], zoom: instance.getZoom() };
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
  syncMarkers(instance, markerRefs, props.entities, props.selectedEntityId, props.onSelect);
}

function updateControlLayers(instance: maplibregl.Map, map: MapState, visible: boolean) {
  setSourceData(instance, "nai-polygons", naiCollection(visible ? map.nais : []));
  setSourceData(instance, "phase-lines", lineCollection(visible ? map.phase_line : []));
  setSourceData(instance, "routes", routeCollection(visible ? map.routes : []));
  setSourceData(instance, "risk-zones", riskCollection(map.risk_zones));
  ensureLayer(instance, "nai-fill", "nai-polygons", "#1f9d7a", 0.09);
  ensureLine(instance, "nai-line", "nai-polygons", "#4ade80", 1.2, [2, 2]);
  ensureLine(instance, "phase-line", "phase-lines", "#fbbf24", 2, [3, 2]);
  ensureLine(instance, "route-line", "routes", "#38bdf8", 2, [4, 2]);
  ensureLayer(instance, "risk-fill", "risk-zones", "#ef4444", 0.13);
}

function syncMarkers(
  instance: maplibregl.Map,
  markerRefs: Map<string, maplibregl.Marker>,
  entities: TacticalEntity[],
  selectedId: string | null | undefined,
  onSelect: (id: string) => void,
) {
  const nextIds = new Set(entities.map((item) => item.id));
  markerRefs.forEach((marker, id) => {
    if (!nextIds.has(id)) {
      marker.remove();
      markerRefs.delete(id);
    }
  });
  entities.forEach((entity) => upsertMarker(instance, markerRefs, entity, selectedId, onSelect));
}

function upsertMarker(
  instance: maplibregl.Map,
  markerRefs: Map<string, maplibregl.Marker>,
  entity: TacticalEntity,
  selectedId: string | null | undefined,
  onSelect: (id: string) => void,
) {
  const current = markerRefs.get(entity.id);
  if (current) {
    updateMarkerElement(current.getElement(), entity, selectedId, onSelect);
    current.setLngLat([entity.lon, entity.lat]);
    return;
  }
  const element = document.createElement("button");
  updateMarkerElement(element, entity, selectedId, onSelect);
  markerRefs.set(entity.id, new maplibregl.Marker({ element, anchor: "center" }).setLngLat([entity.lon, entity.lat]).addTo(instance));
}

function updateMarkerElement(
  element: HTMLElement,
  entity: TacticalEntity,
  selectedId: string | null | undefined,
  onSelect: (id: string) => void,
) {
  const selected = selectedId === entity.id ? " selected" : "";
  element.className = `mil-marker ${markerTone(entity)} ${markerStatus(entity)}${selected}`;
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
  trayOpen: boolean;
  onToggle: (layers: Record<LayerKey, boolean>) => void;
  onTrayToggle: () => void;
};

function MapChrome({ entities, visibleEntities, layers, trayOpen, onToggle, onTrayToggle }: ChromeProps) {
  return (
    <>
      <div className="map-vignette" />
      <div className="map-layer-control">
        <button type="button" className="map-layer-tab" onClick={onTrayToggle} aria-expanded={trayOpen}>
          LAYERS
        </button>
        {trayOpen && (
          <div className="map-layer-tray">
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
        )}
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
  selectedId: string | null,
) {
  const visibleParents = visiblePersonnelParents(entities, expanded, zoom, selectedId);

  return entities.filter((entity) => {
    if (entity.entity_type === "personnel") {
      return layers.personnel && shouldShowPersonnel(entity, expanded, zoom, selectedId);
    }
    if (entity.entity_type === "contact") return layers.contacts;
    if (["vehicle", "drone", "sensor"].includes(entity.entity_type)) return layers.assets;
    if (entity.entity_type === "platoon") return layers.units && shouldShowPlatoon(entity, zoom, selectedId);
    if (entity.entity_type === "squad" && visibleParents.has(entity.id)) return false;
    if (entity.entity_type === "squad") return layers.units && shouldShowSquad(entity, expanded, zoom, selectedId);
    return layers.units;
  });
}

function visiblePersonnelParents(
  entities: TacticalEntity[],
  expanded: Set<string>,
  zoom: number,
  selectedId: string | null,
) {
  return new Set(
    entities
      .filter((entity) => entity.entity_type === "personnel")
      .filter((entity) => shouldShowPersonnel(entity, expanded, zoom, selectedId))
      .map((entity) => entity.parent_id || ""),
  );
}

function shouldShowPersonnel(
  entity: TacticalEntity,
  expanded: Set<string>,
  zoom: number,
  selectedId: string | null,
) {
  const parentId = entity.parent_id || "";
  return (
    (zoom >= SOLDIER_ZOOM && isMainPlatoonChild(parentId))
    || expanded.has(parentId)
    || selectedId === parentId
    || selectedId === entity.id
  );
}

function shouldShowPlatoon(
  entity: TacticalEntity,
  zoom: number,
  selectedId: string | null,
) {
  if (entity.id !== "plt-raven") return true;
  return zoom < SQUAD_ZOOM || selectedId === entity.id;
}

function shouldShowSquad(
  entity: TacticalEntity,
  expanded: Set<string>,
  zoom: number,
  selectedId: string | null,
) {
  if (entity.parent_id !== "plt-raven") return true;
  return zoom >= SQUAD_ZOOM || expanded.has(entity.id) || selectedId === entity.id;
}

function isMainPlatoonChild(parentId: string) {
  return ["1st_squad", "2nd_squad", "3rd_squad", "weapons_squad"].includes(parentId);
}
