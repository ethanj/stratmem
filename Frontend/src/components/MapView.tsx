/**
 * @file MapView — Raven Gap tactical command picture.
 *
 * Renders the geographic command picture from `state.map_state` per
 * docs/THEPLAN.md: NAIs (polygons), phase line, checkpoints, friendly
 * markers, contact markers (with confidence shading), risk zones (radius
 * circles), routes, and an optional MGRS grid label. Backend contract fields
 * drive rendering; an empty Raven contract gets the documented static Raven
 * baseline so the COP is visible before source reports roll.
 *
 * Two render modes:
 * - Default: dark CARTO raster tiles + maplibre-gl pitched view.
 * - Static fallback: vector-only (no tiles, dark-fill background) for the
 *   network-disabled demo. Toggled by clicking the [vector] button or
 *   automatically if the raster tiles fail to load.
 *
 * Click anywhere on the panel to expand to a full-window modal.
 */

import { useEffect, useMemo, useRef, useState } from "react";
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
} from "../types/ravenGap";

const DEFAULT_CENTER: [number, number] = [-118.6818, 37.4755];
const DEFAULT_ZOOM = 13.4;
const EXPANDED_ZOOM = 14.0;
const MARKER_EXIT_MS = 220;
const RAVEN_BASELINE_MAP: MapState = {
  mgrs_grid_anchor: { easting: 42820, northing: 49210, zone: "11S LV" },
  phase_line: [
    {
      id: "pl_raven",
      label: "PL Raven",
      points: [
        { lat: 37.4662, lon: -118.6788 },
        { lat: 37.4825, lon: -118.6762 },
      ],
    },
  ],
  checkpoints: [
    { id: "cp1", label: "CP1", lat: 37.4718, lon: -118.6821 },
    { id: "cp2", label: "CP2", lat: 37.4685, lon: -118.6886 },
    { id: "cp3", label: "CP3", lat: 37.4815, lon: -118.6698 },
  ],
  nais: [
    squareArea("nai_1", "NAI-1 North Draw", 37.482, -118.684),
    squareArea("nai_2", "NAI-2 East Ridge", 37.4792, -118.6738),
    squareArea("nai_3", "NAI-3 South Spur", 37.4669, -118.6775),
  ],
  friendly_markers: [
    { id: "plt-raven", label: "PL Raven", lat: 37.4755, lon: -118.6818, kind: "command" },
    { id: "sqd-1", label: "1st", lat: 37.4718, lon: -118.6821, kind: "infantry" },
    { id: "sqd-2", label: "2nd", lat: 37.4787, lon: -118.6749, kind: "infantry" },
    { id: "sqd-3", label: "3rd", lat: 37.4669, lon: -118.6775, kind: "infantry" },
    { id: "wpn", label: "WPN", lat: 37.4762, lon: -118.6858, kind: "weapons" },
    { id: "jltv-1", label: "JLTV", lat: 37.4685, lon: -118.6886, kind: "vehicle" },
    { id: "uas-2", label: "Raven-2", lat: 37.4729, lon: -118.6798, kind: "uas_team" },
    { id: "sens-1", label: "OP/LP", lat: 37.4796, lon: -118.6715, kind: "sensor" },
  ],
  contact_markers: [],
  risk_zones: [
    { id: "rz_nai_2", label: "NAI-2 contact risk", lat: 37.4792, lon: -118.6738, radius_m: 520 },
    { id: "rz_cp2_delay", label: "CP2 mobility constraint", lat: 37.4685, lon: -118.6886, radius_m: 260 },
  ],
  routes: [
    {
      id: "route-finch",
      name: "Route Finch",
      status: "amber",
      points: [
        { lat: 37.4685, lon: -118.6886 },
        { lat: 37.4718, lon: -118.6821 },
        { lat: 37.4768, lon: -118.6808 },
        { lat: 37.4815, lon: -118.6698 },
      ],
    },
    {
      id: "route-support",
      name: "Support Route",
      status: "delayed",
      points: [
        { lat: 37.4669, lon: -118.6775 },
        { lat: 37.4685, lon: -118.6886 },
        { lat: 37.4762, lon: -118.6858 },
      ],
    },
  ],
};

const RAVEN_CONTRACT_FIELDS = [
  "mgrs_grid_anchor",
  "phase_line",
  "checkpoints",
  "nais",
  "friendly_markers",
  "contact_markers",
  "risk_zones",
  "routes",
] as const;

const DARK_RASTER_STYLE: maplibregl.StyleSpecification = {
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

/** Vector-only style with no external tiles — works fully offline. */
const STATIC_VECTOR_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {},
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": "#0b1624" },
    },
  ],
};

type MapViewProps = {
  map?: MapState | null;
};

export default function MapView({ map }: MapViewProps) {
  const [expanded, setExpanded] = useState(false);
  const [staticMode, setStaticMode] = useState(false);

  const displayMap = useMemo(() => normalizeRavenMap(map), [map]);
  const mgrsZone = displayMap?.mgrs_grid_anchor?.zone;
  const naiCount = displayMap?.nais?.length ?? 0;
  const friendlyCount = displayMap?.friendly_markers?.length ?? 0;
  const contactCount = displayMap?.contact_markers?.length ?? 0;
  const riskLevel = displayMap?.risk_level || (contactCount > 0 ? "elevated" : "normal");

  return (
    <>
      <div
        className={`panel map-panel risk-${String(riskLevel).toLowerCase()} map-panel-clickable`}
        role="button"
        tabIndex={0}
        onClick={() => setExpanded(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setExpanded(true);
          }
        }}
      >
        <div className="panel-header">
          <h2>TACTICAL PICTURE</h2>
          <span className="map-mgrs-pill">
            {mgrsZone ? `MGRS ${mgrsZone}` : "MGRS —"}
          </span>
        </div>

        <div className="real-map-shell">
          <MapCanvas map={displayMap} staticMode={staticMode} onTilesFailed={() => setStaticMode(true)} />
          <MapOverlays
            naiCount={naiCount}
            friendlyCount={friendlyCount}
            contactCount={contactCount}
          />
          <div className="map-expand-hint">CLICK TO EXPAND</div>
        </div>
      </div>

      {expanded && (
        <div className="map-modal-backdrop" onClick={() => setExpanded(false)}>
          <div className="map-modal" onClick={(event) => event.stopPropagation()}>
            <div className="map-modal-header">
              <div>
                <h2>TACTICAL PICTURE — EXPANDED</h2>
                <span>
                  {mgrsZone ? `MGRS ${mgrsZone}` : "MGRS —"} ·{" "}
                  {naiCount} NAI · {friendlyCount} friendly · {contactCount} contact
                </span>
              </div>

              <div className="map-modal-header-right">
                <button
                  type="button"
                  className="map-mode-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setStaticMode((s) => !s);
                  }}
                >
                  {staticMode ? "TILES" : "VECTOR"}
                </button>

                <button
                  type="button"
                  className="map-modal-close"
                  onClick={() => setExpanded(false)}
                  aria-label="Close expanded tactical picture"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="map-modal-body">
              <div className="real-map-shell expanded">
                <MapCanvas
                  map={displayMap}
                  staticMode={staticMode}
                  onTilesFailed={() => setStaticMode(true)}
                  expanded
                />

                <MapOverlays
                  naiCount={naiCount}
                  friendlyCount={friendlyCount}
                  contactCount={contactCount}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

type MapCanvasProps = {
  map?: MapState | null;
  staticMode: boolean;
  onTilesFailed: () => void;
  expanded?: boolean;
};

type MarkerDescriptor = {
  id: string;
  className: string;
  icon: string;
  label: string;
  point: LatLon;
};

type DataOverlaySnapshot = {
  phaseLineIds: Set<string>;
  routeIds: Set<string>;
  riskZoneIds: Set<string>;
};

function MapCanvas({ map, staticMode, onTilesFailed, expanded = false }: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRefs = useRef<Map<string, maplibregl.Marker>>(new Map());
  const seenMarkerIdsRef = useRef<Set<string>>(new Set());
  const dataOverlaySnapshotRef = useRef<DataOverlaySnapshot>(emptyDataOverlaySnapshot());
  const mapDataRef = useRef<MapState | null | undefined>(map);
  const onTilesFailedRef = useRef(onTilesFailed);
  const mapLoadedRef = useRef(false);

  const center = useMemo<[number, number]>(() => {
    return computeCenter(map) ?? DEFAULT_CENTER;
  }, [map]);

  useEffect(() => {
    mapDataRef.current = map;
    onTilesFailedRef.current = onTilesFailed;
  }, [map, onTilesFailed]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const instance = new maplibregl.Map({
      container: containerRef.current,
      style: staticMode ? STATIC_VECTOR_STYLE : DARK_RASTER_STYLE,
      center,
      zoom: expanded ? EXPANDED_ZOOM : DEFAULT_ZOOM,
      pitch: expanded ? 36 : 30,
      bearing: -10,
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

    instance.on("error", (e) => {
      // Tile fetch failures bubble through here; switch to static fallback.
      const err = e?.error as { status?: number; url?: string } | undefined;
      if (err?.url && err.url.includes("basemaps.cartocdn.com")) {
        onTilesFailedRef.current();
      }
    });

    instance.on("load", () => {
      mapLoadedRef.current = true;
      addRavenGapLayers(instance, mapDataRef.current);
      reconcileRavenGapMarkers(instance, mapDataRef.current, markerRefs.current, seenMarkerIdsRef.current, false);
      dataOverlaySnapshotRef.current = dataOverlaySnapshot(mapDataRef.current);
      window.setTimeout(() => instance.resize(), 50);
    });

    mapRef.current = instance;

    return () => {
      markerRefs.current.forEach((marker) => marker.remove());
      markerRefs.current.clear();
      mapLoadedRef.current = false;
      instance.remove();
      mapRef.current = null;
    };
  }, [expanded, staticMode]);

  useEffect(() => {
    const instance = mapRef.current;
    if (!instance || !mapLoadedRef.current || !instance.isStyleLoaded()) return;

    updateRavenGapData(instance, map);
    pulseChangedDataLayers(instance, dataOverlaySnapshotRef.current, map);
    dataOverlaySnapshotRef.current = dataOverlaySnapshot(map);
    reconcileRavenGapMarkers(instance, map, markerRefs.current, seenMarkerIdsRef.current, true);
  }, [map]);

  return <div ref={containerRef} className="real-map" />;
}

type MapOverlaysProps = {
  naiCount: number;
  friendlyCount: number;
  contactCount: number;
};

function MapOverlays({ naiCount, friendlyCount, contactCount }: MapOverlaysProps) {
  return (
    <>
      <div className="map-vignette" />
      <div className="map-scan-overlay" />

      <div className="map-legend real">
        <span><b className="blue" /> FRIENDLY</span>
        <span><b className="red" /> CONTACT</span>
        <span><b className="orange-line" /> PHASE LINE</span>
        <span><b className="cyan-line" /> NAI</span>
        <span><b className="cyan-line" /> ROUTE</span>
        <span><b className="gray" /> CHECKPOINT</span>
      </div>

      <div className="map-legend tactical-counts">
        <span className="map-count">NAI {naiCount}</span>
        <span className="map-count">FRD {friendlyCount}</span>
        <span className="map-count">CTC {contactCount}</span>
      </div>
    </>
  );
}

/**
 * Sources + layers added once on map "load". Updated in place via setData on
 * subsequent renders.
 */
function addRavenGapLayers(instance: maplibregl.Map, map?: MapState | null) {
  // NAI fills + outlines
  if (!instance.getSource("nai-polygons")) {
    instance.addSource("nai-polygons", {
      type: "geojson",
      data: naiCollection(map?.nais ?? []),
    });
    instance.addLayer({
      id: "nai-fill",
      type: "fill",
      source: "nai-polygons",
      paint: { "fill-color": "#22d3ee", "fill-opacity": 0.08 },
    });
    instance.addLayer({
      id: "nai-line",
      type: "line",
      source: "nai-polygons",
      paint: { "line-color": "#22d3ee", "line-width": 1.4, "line-opacity": 0.7 },
    });
  }

  // Phase line
  if (!instance.getSource("phase-lines")) {
    instance.addSource("phase-lines", {
      type: "geojson",
      data: phaseLineCollection(ensureArray(map?.phase_line)),
    });
    instance.addLayer({
      id: "phase-line-stroke",
      type: "line",
      source: "phase-lines",
      paint: {
        "line-color": "#fb923c",
        "line-width": 2.4,
        "line-dasharray": [2, 2],
        "line-opacity": 0.9,
      },
    });
  }

  // Routes
  if (!instance.getSource("routes")) {
    instance.addSource("routes", {
      type: "geojson",
      data: routeCollection(map?.routes ?? []),
    });
    instance.addLayer({
      id: "routes-stroke",
      type: "line",
      source: "routes",
      paint: {
        "line-color": "#22d3ee",
        "line-width": 2,
        "line-dasharray": [3, 2],
        "line-opacity": 0.78,
      },
    });
  }

  // Risk zones (rendered as filled polygons approximating circles)
  if (!instance.getSource("risk-zones")) {
    instance.addSource("risk-zones", {
      type: "geojson",
      data: riskZoneCollection(map?.risk_zones ?? []),
    });
    instance.addLayer({
      id: "risk-zone-fill",
      type: "fill",
      source: "risk-zones",
      paint: { "fill-color": "#ff4040", "fill-opacity": 0.12 },
    });
    instance.addLayer({
      id: "risk-zone-line",
      type: "line",
      source: "risk-zones",
      paint: { "line-color": "#ff4040", "line-width": 1, "line-opacity": 0.55 },
    });
  }
}

function updateRavenGapData(instance: maplibregl.Map, map?: MapState | null) {
  const naiSource = instance.getSource("nai-polygons") as maplibregl.GeoJSONSource | undefined;
  const phaseSource = instance.getSource("phase-lines") as maplibregl.GeoJSONSource | undefined;
  const routeSource = instance.getSource("routes") as maplibregl.GeoJSONSource | undefined;
  const riskSource = instance.getSource("risk-zones") as maplibregl.GeoJSONSource | undefined;

  if (naiSource) naiSource.setData(naiCollection(map?.nais ?? []));
  if (phaseSource) phaseSource.setData(phaseLineCollection(ensureArray(map?.phase_line)));
  if (routeSource) routeSource.setData(routeCollection(map?.routes ?? []));
  if (riskSource) riskSource.setData(riskZoneCollection(map?.risk_zones ?? []));
}

function pulseChangedDataLayers(
  instance: maplibregl.Map,
  previous: DataOverlaySnapshot,
  map?: MapState | null,
) {
  const next = dataOverlaySnapshot(map);

  if (hasNewId(next.phaseLineIds, previous.phaseLineIds)) {
    pulseLineLayer(instance, "phase-line-stroke", 3.4, 2.4);
  }

  if (hasNewId(next.routeIds, previous.routeIds)) {
    pulseLineLayer(instance, "routes-stroke", 3.2, 2);
  }

  if (hasNewId(next.riskZoneIds, previous.riskZoneIds)) {
    pulseRiskLayer(instance);
  }
}

function dataOverlaySnapshot(map?: MapState | null): DataOverlaySnapshot {
  return {
    phaseLineIds: idsFrom(map?.phase_line),
    routeIds: idsFrom(map?.routes),
    riskZoneIds: idsFrom(map?.risk_zones),
  };
}

function emptyDataOverlaySnapshot(): DataOverlaySnapshot {
  return {
    phaseLineIds: new Set(),
    routeIds: new Set(),
    riskZoneIds: new Set(),
  };
}

function idsFrom(items: Array<{ id: string }> | undefined) {
  return new Set((items ?? []).map((item) => item.id));
}

function hasNewId(nextIds: Set<string>, previousIds: Set<string>) {
  for (const id of nextIds) {
    if (!previousIds.has(id)) return true;
  }

  return false;
}

function pulseLineLayer(
  instance: maplibregl.Map,
  layerId: string,
  brightWidth: number,
  normalWidth: number,
) {
  if (!instance.getLayer(layerId)) return;
  instance.setPaintProperty(layerId, "line-width", brightWidth);
  window.setTimeout(() => {
    if (instance.getLayer(layerId)) {
      instance.setPaintProperty(layerId, "line-width", normalWidth);
    }
  }, 520);
}

function pulseRiskLayer(instance: maplibregl.Map) {
  if (!instance.getLayer("risk-zone-fill")) return;
  instance.setPaintProperty("risk-zone-fill", "fill-opacity", 0.2);
  window.setTimeout(() => {
    if (instance.getLayer("risk-zone-fill")) {
      instance.setPaintProperty("risk-zone-fill", "fill-opacity", 0.12);
    }
  }, 720);
}

function reconcileRavenGapMarkers(
  instance: maplibregl.Map,
  map: MapState | null | undefined,
  markerRefs: Map<string, maplibregl.Marker>,
  seenMarkerIds: Set<string>,
  animateNew: boolean,
) {
  const descriptors = ravenGapMarkerDescriptors(map);
  const nextIds = new Set(descriptors.map((descriptor) => descriptor.id));

  markerRefs.forEach((marker, markerId) => {
    if (nextIds.has(markerId)) return;
    removeMarker(marker, markerRefs, markerId);
  });

  for (const descriptor of descriptors) {
    const existingMarker = markerRefs.get(descriptor.id);

    if (existingMarker) {
      updateMarkerElement(existingMarker.getElement(), descriptor, false);
      existingMarker.setLngLat([descriptor.point.lon, descriptor.point.lat]);
      continue;
    }

    const isNewMarker = animateNew && !seenMarkerIds.has(descriptor.id);
    const marker = makeMarker(descriptor, isNewMarker)
      .setLngLat([descriptor.point.lon, descriptor.point.lat])
      .addTo(instance);

    markerRefs.set(descriptor.id, marker);
    seenMarkerIds.add(descriptor.id);
  }
}

function ravenGapMarkerDescriptors(map?: MapState | null): MarkerDescriptor[] {
  const markers: MarkerDescriptor[] = [];

  for (const f of map?.friendly_markers ?? []) {
    markers.push({
      id: `friendly:${f.id}`,
      className: `friendly ${f.kind ?? ""}`.trim(),
      icon: iconForFriendly(f.kind),
      label: f.label,
      point: f,
    });
  }

  for (const cp of map?.checkpoints ?? []) {
    markers.push({
      id: `checkpoint:${cp.id}`,
      className: "checkpoint",
      icon: "◆",
      label: cp.label,
      point: cp,
    });
  }

  for (const c of map?.contact_markers ?? []) {
    markers.push({
      id: `contact:${c.id}`,
      className: `contact ${normalizeConfidence(c.confidence)}`,
      icon: "✕",
      label: contactLabel(c),
      point: c,
    });
  }

  for (const nai of map?.nais ?? []) {
    const centroid = polygonCentroid(nai.polygon);
    if (!centroid) continue;
    markers.push({
      id: `nai:${nai.id}`,
      className: "nai-label",
      icon: "",
      label: nai.label,
      point: centroid,
    });
  }

  return markers;
}

function makeMarker(descriptor: MarkerDescriptor, isNewMarker: boolean) {
  const element = document.createElement("div");
  updateMarkerElement(element, descriptor, isNewMarker);

  return new maplibregl.Marker({ element, anchor: "center" });
}

function updateMarkerElement(
  element: HTMLElement,
  descriptor: MarkerDescriptor,
  isNewMarker: boolean,
) {
  element.className = [
    "geo-marker",
    descriptor.className,
    isNewMarker ? "overlay-new overlay-active" : "",
  ].filter(Boolean).join(" ");
  element.dataset.overlayId = descriptor.id;

  let iconNode = element.querySelector<HTMLSpanElement>(".geo-marker-icon");
  if (descriptor.icon && !iconNode) {
    iconNode = document.createElement("span");
    iconNode.className = "geo-marker-icon";
    element.appendChild(iconNode);
  }

  if (iconNode) {
    iconNode.textContent = descriptor.icon;
    iconNode.hidden = !descriptor.icon;
  }

  let labelNode = element.querySelector<HTMLSpanElement>(".geo-marker-label");
  if (!labelNode) {
    labelNode = document.createElement("span");
    labelNode.className = "geo-marker-label";
    element.appendChild(labelNode);
  }

  labelNode.textContent = descriptor.label;
}

function removeMarker(
  marker: maplibregl.Marker,
  markerRefs: Map<string, maplibregl.Marker>,
  markerId: string,
) {
  const element = marker.getElement();
  element.classList.add("overlay-removing");
  markerRefs.delete(markerId);
  window.setTimeout(() => marker.remove(), MARKER_EXIT_MS);
}

function iconForFriendly(kind?: string): string {
  switch (kind) {
    case "drone":
      return "◉";
    case "vehicle":
      return "▭";
    case "sensor":
      return "◇";
    case "uas_team":
      return "◉";
    case "weapons":
      return "✦";
    default:
      return "◆";
  }
}

function contactLabel(contact: { id: string; label?: string }) {
  const label = String(contact.label || "").trim();

  if (!label || label === "?") {
    return contact.id;
  }

  return `${label} ${contact.id}`;
}

function normalizeConfidence(c: string | undefined): string {
  if (!c) return "suspected";
  const v = c.toLowerCase();
  if (v === "confirmed" || v === "suspected" || v === "lost") return v;
  return "suspected";
}

function normalizeRavenMap(map?: MapState | null): MapState | null {
  if (!map || !hasRavenContractFields(map)) {
    return map ?? null;
  }

  return {
    ...map,
    mgrs_grid_anchor: hasUsableAnchor(map.mgrs_grid_anchor)
      ? map.mgrs_grid_anchor
      : RAVEN_BASELINE_MAP.mgrs_grid_anchor,
    phase_line: arrayOrBaseline(map.phase_line, RAVEN_BASELINE_MAP.phase_line),
    checkpoints: arrayOrBaseline(map.checkpoints, RAVEN_BASELINE_MAP.checkpoints),
    nais: arrayOrBaseline(map.nais, RAVEN_BASELINE_MAP.nais),
    friendly_markers: arrayOrBaseline(
      map.friendly_markers,
      RAVEN_BASELINE_MAP.friendly_markers,
    ),
    contact_markers: Array.isArray(map.contact_markers) ? map.contact_markers : [],
    risk_zones: arrayOrBaseline(map.risk_zones, RAVEN_BASELINE_MAP.risk_zones),
    routes: arrayOrBaseline(map.routes, RAVEN_BASELINE_MAP.routes),
  };
}

function hasRavenContractFields(map: MapState) {
  return RAVEN_CONTRACT_FIELDS.some((field) => field in map);
}

function hasUsableAnchor(anchor: MapState["mgrs_grid_anchor"]) {
  return Boolean(anchor && typeof anchor === "object" && anchor.zone);
}

function arrayOrBaseline<T>(value: T[] | undefined, fallback: T[] | undefined) {
  return Array.isArray(value) && value.length > 0 ? value : fallback ?? [];
}

function squareArea(
  id: string,
  label: string,
  lat: number,
  lon: number,
): NamedAreaOfInterest {
  const delta = 0.002;

  return {
    id,
    label,
    polygon: [
      { lat: lat - delta, lon: lon - delta },
      { lat: lat - delta, lon: lon + delta },
      { lat: lat + delta, lon: lon + delta },
      { lat: lat + delta, lon: lon - delta },
    ],
  };
}

// --- GeoJSON helpers ---------------------------------------------------------

function naiCollection(nais: NamedAreaOfInterest[]): FeatureCollection<Polygon> {
  return {
    type: "FeatureCollection",
    features: nais.map((nai): Feature<Polygon> => ({
      type: "Feature",
      properties: { id: nai.id, label: nai.label },
      geometry: {
        type: "Polygon",
        coordinates: [[...nai.polygon.map((p) => [p.lon, p.lat] as [number, number]), [nai.polygon[0]?.lon, nai.polygon[0]?.lat] as [number, number]]],
      },
    })),
  };
}

/** Ensure a value is always an array — handles null, undefined, or a single object. */
function ensureArray<T>(value: T | T[] | null | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function phaseLineCollection(lines: PhaseLine[]): FeatureCollection<LineString> {
  return {
    type: "FeatureCollection",
    features: lines.map((pl): Feature<LineString> => ({
      type: "Feature",
      properties: { id: pl.id, label: pl.label },
      geometry: {
        type: "LineString",
        coordinates: pl.points.map((p) => [p.lon, p.lat] as [number, number]),
      },
    })),
  };
}

function routeCollection(routes: Route[]): FeatureCollection<LineString> {
  return {
    type: "FeatureCollection",
    features: routes.map((route): Feature<LineString> => ({
      type: "Feature",
      properties: {
        id: route.id,
        label: route.label || route.name,
        status: route.status,
      },
      geometry: {
        type: "LineString",
        coordinates: route.points.map((p) => [p.lon, p.lat] as [number, number]),
      },
    })),
  };
}

function riskZoneCollection(zones: RiskZone[]): FeatureCollection<Polygon> {
  return {
    type: "FeatureCollection",
    features: zones.map((z): Feature<Polygon> => ({
      type: "Feature",
      properties: { id: z.id },
      geometry: {
        type: "Polygon",
        coordinates: [circlePoints(z, 36)],
      },
    })),
  };
}

/** Approximate `radius_m` as a polygon ring around (lat, lon). */
function circlePoints(z: RiskZone, segments: number): [number, number][] {
  const earthMeters = 111_320; // crude meters-per-degree at equator
  const dLat = z.radius_m / earthMeters;
  const dLon = z.radius_m / (earthMeters * Math.cos((z.lat * Math.PI) / 180));
  const ring: [number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    ring.push([z.lon + Math.cos(angle) * dLon, z.lat + Math.sin(angle) * dLat]);
  }
  return ring;
}

function polygonCentroid(points: LatLon[]): LatLon | null {
  if (!points || points.length === 0) return null;
  let lat = 0;
  let lon = 0;
  for (const p of points) {
    lat += p.lat;
    lon += p.lon;
  }
  return { lat: lat / points.length, lon: lon / points.length };
}

function computeCenter(map?: MapState | null): [number, number] | null {
  const friendly = map?.friendly_markers ?? [];
  const contacts = map?.contact_markers ?? [];
  const all: LatLon[] = [...friendly, ...contacts];
  if (all.length === 0) return null;
  let lat = 0;
  let lon = 0;
  for (const p of all) {
    lat += p.lat;
    lon += p.lon;
  }
  return [lon / all.length, lat / all.length];
}
