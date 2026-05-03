/**
 * Contract-driven operational map for the command dashboard.
 *
 * Raven Gap coordinates come from `state.map_state`, including MGRS anchor,
 * phase lines, checkpoints, NAIs, friendly/contact markers, risk zones, and
 * routes. When that contract is absent or empty, the component preserves the
 * legacy Sentinel Forge fallback picture so the dashboard still renders.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import type { FeatureCollection, Geometry, LineString, Polygon } from "geojson";
import { buildMapModel, toLngLat } from "./mapViewModel";
import type {
  LatLon,
  LngLat,
  PolygonShape,
  TacticalMarker,
  TacticalModel,
  LineShape,
} from "./mapViewModel";
import "maplibre-gl/dist/maplibre-gl.css";
import "../styles/map.css";

type MapViewProps = { map: any; scenarioId?: string };
type MapCanvasProps = { model: TacticalModel; expanded?: boolean };

const DARK_RASTER_STYLE: any = {
  version: 8,
  sources: {
    "carto-dark": {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        "https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      ],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    },
  },
  layers: [
    {
      id: "carto-dark-layer",
      type: "raster",
      source: "carto-dark",
      minzoom: 0,
      maxzoom: 20,
    },
  ],
};

export default function MapView({ map, scenarioId }: MapViewProps) {
  const [expanded, setExpanded] = useState(false);
  const model = useMemo(() => buildMapModel(map, scenarioId), [map, scenarioId]);

  return (
    <>
      <div
        className={`panel map-panel risk-${model.riskLevel} map-panel-clickable`}
        role="button"
        tabIndex={0}
        onClick={() => setExpanded(true)}
        onKeyDown={(event) => handlePanelKey(event, () => setExpanded(true))}
      >
        <MapHeader title="OPERATIONAL VIEW" riskLevel={model.riskLevel} />
        <div className="real-map-shell">
          <MapCanvas model={model} />
          <MapOverlays model={model} />
          <div className="map-expand-hint">CLICK TO EXPAND</div>
        </div>
      </div>

      {expanded && (
        <MapModal model={model} onClose={() => setExpanded(false)} />
      )}
    </>
  );
}

function MapModal({ model, onClose }: { model: TacticalModel; onClose: () => void }) {
  return (
    <div className="map-modal-backdrop" onClick={onClose}>
      <div className="map-modal" onClick={(event) => event.stopPropagation()}>
        <div className="map-modal-header">
          <div>
            <h2>EXPANDED OPERATIONAL VIEW</h2>
            <span>{model.mgrsLabel}</span>
          </div>
          <div className="map-modal-header-right">
            <RiskBadge riskLevel={model.riskLevel} />
            <button type="button" className="map-modal-close" onClick={onClose}>
              ×
            </button>
          </div>
        </div>

        <div className="map-modal-body">
          <div className="real-map-shell expanded">
            <MapCanvas model={model} expanded />
            <MapOverlays model={model} />
            <MapLayerReadout model={model} />
          </div>
        </div>
      </div>
    </div>
  );
}

function MapCanvas({ model, expanded = false }: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRefs = useRef<maplibregl.Marker[]>([]);
  const mapLoadedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const instance = createMap(containerRef.current, model.center, expanded);
    instance.on("load", () => {
      mapLoadedRef.current = true;
      addSourcesAndLayers(instance);
      renderModel(instance, model, markerRefs.current);
      markerRefs.current = buildMarkers(instance, model);
      fitMapToModel(instance, model, expanded);
    });
    mapRef.current = instance;

    return () => {
      markerRefs.current.forEach((marker) => marker.remove());
      markerRefs.current = [];
      mapLoadedRef.current = false;
      instance.remove();
      mapRef.current = null;
    };
  }, [expanded]);

  useEffect(() => {
    const instance = mapRef.current;
    if (!instance || !mapLoadedRef.current || !instance.isStyleLoaded()) return;
    renderModel(instance, model, markerRefs.current);
    markerRefs.current = buildMarkers(instance, model);
    fitMapToModel(instance, model, expanded);
  }, [expanded, model]);

  return <div ref={containerRef} className="real-map" />;
}

function createMap(container: HTMLDivElement, center: LngLat, expanded: boolean) {
  const instance = new maplibregl.Map({
    container,
    style: DARK_RASTER_STYLE,
    center,
    zoom: expanded ? 13 : 12,
    pitch: expanded ? 44 : 38,
    bearing: -18,
    attributionControl: false,
    dragRotate: false,
    scrollZoom: expanded,
    dragPan: expanded,
    keyboard: expanded,
    doubleClickZoom: expanded,
    touchZoomRotate: expanded,
  });
  instance.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
  instance.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
  return instance;
}

function MapHeader({ title, riskLevel }: { title: string; riskLevel: string }) {
  return (
    <div className="panel-header">
      <h2>{title}</h2>
      <RiskBadge riskLevel={riskLevel} />
    </div>
  );
}

function RiskBadge({ riskLevel }: { riskLevel: string }) {
  return (
    <span className={`map-risk-badge ${riskLevel}`}>
      RISK: {riskLevel.toUpperCase()}
    </span>
  );
}

function MapOverlays({ model }: { model: TacticalModel }) {
  return (
    <>
      <div className="map-vignette" />
      <div className="map-scan-overlay" />
      <div className="map-legend real">
        <span><b className="blue" /> FRIENDLY</span>
        <span><b className="red" /> CONTACT</span>
        <span><b className="green" /> CHECKPOINT</span>
        <span><b className="orange-line" /> PHASE LINE</span>
        <span><b className="cyan-line" /> ROUTE</span>
      </div>
      <div className="sector-readout">
        <div className="sector-readout-title">RAVEN GAP COP</div>
        <ReadoutRow label="GRID" value={model.mgrsLabel} kind="cyan" />
        <ReadoutRow label="NAI" value={String(model.summary.nais)} kind="watch" />
        <ReadoutRow label="CONTACTS" value={String(model.summary.contacts)} kind="danger" />
        <ReadoutRow label="ROUTES" value={String(model.summary.routes)} kind="active" />
      </div>
    </>
  );
}

function ReadoutRow(props: { label: string; value: string; kind: string }) {
  return (
    <div className={`sector-readout-row ${props.kind}`}>
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

function MapLayerReadout({ model }: { model: TacticalModel }) {
  return (
    <div className="map-layer-readout">
      <span className="active">MGRS</span>
      <span className={model.summary.nais ? "active warning" : ""}>NAI</span>
      <span className={model.summary.contacts ? "active danger" : ""}>CONTACT</span>
      <span className={model.summary.routes ? "active cyan" : ""}>ROUTE</span>
    </div>
  );
}

function addSourcesAndLayers(instance: maplibregl.Map) {
  addGeoSource(instance, "phase-lines");
  addGeoSource(instance, "routes");
  addGeoSource(instance, "nais");
  addGeoSource(instance, "risk-zones");
  addFillLayer(instance, "risk-zones-fill", "risk-zones", "#ff4040", 0.16);
  addLineLayer(instance, "risk-zones-line", "risk-zones", "#ff4040", 2, [2, 2]);
  addFillLayer(instance, "nais-fill", "nais", "#38bdf8", 0.08);
  addLineLayer(instance, "nais-line", "nais", "#38bdf8", 2, [1.5, 1.5]);
  addLineLayer(instance, "routes-line", "routes", "#22d3ee", 3, [2, 2]);
  addLineLayer(instance, "phase-lines-line", "phase-lines", "#fb923c", 3, [1, 1.5]);
}

function addGeoSource(instance: maplibregl.Map, id: string) {
  if (instance.getSource(id)) return;
  instance.addSource(id, { type: "geojson", data: emptyCollection() });
}

function addFillLayer(
  instance: maplibregl.Map,
  id: string,
  source: string,
  color: string,
  opacity: number
) {
  if (instance.getLayer(id)) return;
  instance.addLayer({ id, type: "fill", source, paint: { "fill-color": color, "fill-opacity": opacity } });
}

function addLineLayer(
  instance: maplibregl.Map,
  id: string,
  source: string,
  color: string,
  width: number,
  dasharray: number[]
) {
  if (instance.getLayer(id)) return;
  instance.addLayer({
    id,
    type: "line",
    source,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": color, "line-width": width, "line-dasharray": dasharray, "line-opacity": 0.9 },
  });
}

function renderModel(
  instance: maplibregl.Map,
  model: TacticalModel,
  currentMarkers: maplibregl.Marker[]
) {
  setSourceData(instance, "phase-lines", lineCollection(model.phaseLines));
  setSourceData(instance, "routes", lineCollection(model.routes));
  setSourceData(instance, "nais", polygonCollection(model.nais));
  setSourceData(instance, "risk-zones", polygonCollection(model.riskZones));
  currentMarkers.forEach((marker) => marker.remove());
}

function setSourceData(
  instance: maplibregl.Map,
  sourceId: string,
  data: FeatureCollection<Geometry>
) {
  const source = instance.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;
  source?.setData(data);
}

function buildMarkers(instance: maplibregl.Map, model: TacticalModel) {
  return model.markers.map((marker) => {
    return makeMarker(marker).setLngLat(toLngLat(marker.point)).addTo(instance);
  });
}

function makeMarker(marker: TacticalMarker) {
  const element = document.createElement("div");
  element.className = `geo-marker ${markerClass(marker)}`;
  if (marker.icon) {
    const iconNode = document.createElement("span");
    iconNode.className = "geo-marker-icon";
    iconNode.textContent = marker.icon;
    element.appendChild(iconNode);
  }
  const labelNode = document.createElement("span");
  labelNode.textContent = marker.label;
  element.appendChild(labelNode);
  return new maplibregl.Marker({ element, anchor: "center" });
}

function markerClass(marker: TacticalMarker) {
  if (marker.kind === "friendly" || marker.kind === "anchor") return "friendly";
  if (marker.kind === "checkpoint") return "cyber-node active";
  if (marker.kind === "nai") return "sector";
  if (marker.kind === "contact") return "threat active primary-uas";
  return "sector active";
}

function fitMapToModel(
  instance: maplibregl.Map,
  model: TacticalModel,
  expanded: boolean
) {
  if (model.bounds.length < 2) {
    instance.easeTo({ center: model.center, zoom: expanded ? 13 : 12, duration: 350 });
    return;
  }
  const bounds = new maplibregl.LngLatBounds();
  model.bounds.forEach((point) => bounds.extend(toLngLat(point)));
  instance.fitBounds(bounds, { padding: expanded ? 92 : 42, maxZoom: expanded ? 14 : 13, duration: 450 });
}

function lineCollection(lines: LineShape[]): FeatureCollection<LineString> {
  return {
    type: "FeatureCollection",
    features: lines.map((line) => ({
      type: "Feature",
      properties: { id: line.id, label: line.label },
      geometry: { type: "LineString", coordinates: line.points.map(toLngLat) },
    })),
  };
}

function polygonCollection(polygons: PolygonShape[]): FeatureCollection<Polygon> {
  return {
    type: "FeatureCollection",
    features: polygons.map((polygon) => ({
      type: "Feature",
      properties: { id: polygon.id, label: polygon.label },
      geometry: { type: "Polygon", coordinates: [closeRing(polygon.points).map(toLngLat)] },
    })),
  };
}

function emptyCollection(): FeatureCollection<Geometry> {
  return { type: "FeatureCollection", features: [] };
}

function closeRing(points: LatLon[]) {
  const [first] = points;
  const last = points[points.length - 1];
  return first && last && first.lat === last.lat && first.lon === last.lon ? points : [...points, first];
}

function handlePanelKey(event: React.KeyboardEvent<HTMLDivElement>, open: () => void) {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  open();
}
