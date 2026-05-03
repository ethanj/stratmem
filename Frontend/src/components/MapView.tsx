/**
 * @file MapView — Raven Gap tactical command picture.
 *
 * Renders the geographic command picture from `state.map_state` per
 * docs/THEPLAN.md: NAIs (polygons), phase line, checkpoints, friendly
 * markers, contact markers (with confidence shading), risk zones (radius
 * circles), and an optional MGRS grid label. All coordinates come from
 * `state.map_state`; nothing is hardcoded.
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
import "../styles/map.css";
import type {
  LatLon,
  MapState,
  NamedAreaOfInterest,
  PhaseLine,
  RiskZone,
} from "../types/ravenGap";

const DEFAULT_CENTER: [number, number] = [-115.452, 36.124];
const DEFAULT_ZOOM = 13.4;
const EXPANDED_ZOOM = 14.0;

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

  const mgrsZone = map?.mgrs_grid_anchor?.zone;
  const naiCount = map?.nais?.length ?? 0;
  const friendlyCount = map?.friendly_markers?.length ?? 0;
  const contactCount = map?.contact_markers?.length ?? 0;
  const riskLevel = map?.risk_level || (contactCount > 0 ? "elevated" : "normal");

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
          <MapCanvas map={map} staticMode={staticMode} onTilesFailed={() => setStaticMode(true)} />
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
                  map={map}
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

function MapCanvas({ map, staticMode, onTilesFailed, expanded = false }: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRefs = useRef<maplibregl.Marker[]>([]);
  const mapLoadedRef = useRef(false);

  const center = useMemo<[number, number]>(() => {
    return computeCenter(map) ?? DEFAULT_CENTER;
  }, [map]);

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
        onTilesFailed();
      }
    });

    instance.on("load", () => {
      mapLoadedRef.current = true;
      addRavenGapLayers(instance, map);
      markerRefs.current.forEach((m) => m.remove());
      markerRefs.current = buildRavenGapMarkers(instance, map);
      window.setTimeout(() => instance.resize(), 50);
    });

    mapRef.current = instance;

    return () => {
      markerRefs.current.forEach((m) => m.remove());
      markerRefs.current = [];
      mapLoadedRef.current = false;
      instance.remove();
      mapRef.current = null;
    };
  }, [expanded, staticMode, center, map, onTilesFailed]);

  useEffect(() => {
    const instance = mapRef.current;
    if (!instance || !mapLoadedRef.current || !instance.isStyleLoaded()) return;

    updateRavenGapData(instance, map);
    markerRefs.current.forEach((m) => m.remove());
    markerRefs.current = buildRavenGapMarkers(instance, map);
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
      data: phaseLineCollection(map?.phase_line ?? []),
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
  const riskSource = instance.getSource("risk-zones") as maplibregl.GeoJSONSource | undefined;

  if (naiSource) naiSource.setData(naiCollection(map?.nais ?? []));
  if (phaseSource) phaseSource.setData(phaseLineCollection(map?.phase_line ?? []));
  if (riskSource) riskSource.setData(riskZoneCollection(map?.risk_zones ?? []));
}

function buildRavenGapMarkers(instance: maplibregl.Map, map?: MapState | null): maplibregl.Marker[] {
  const markers: maplibregl.Marker[] = [];

  // Friendly markers
  for (const f of map?.friendly_markers ?? []) {
    markers.push(
      makeMarker(`friendly ${f.kind ?? ""}`.trim(), iconForFriendly(f.kind), f.label)
        .setLngLat([f.lon, f.lat])
        .addTo(instance),
    );
  }

  // Checkpoints
  for (const cp of map?.checkpoints ?? []) {
    markers.push(
      makeMarker("checkpoint", "◆", cp.label)
        .setLngLat([cp.lon, cp.lat])
        .addTo(instance),
    );
  }

  // Contact markers — confidence drives shading
  for (const c of map?.contact_markers ?? []) {
    const confidenceClass = `contact ${normalizeConfidence(c.confidence)}`;
    markers.push(
      makeMarker(confidenceClass, "✕", c.label || "?")
        .setLngLat([c.lon, c.lat])
        .addTo(instance),
    );
  }

  // NAI label markers (anchor on polygon centroid)
  for (const nai of map?.nais ?? []) {
    const c = polygonCentroid(nai.polygon);
    if (!c) continue;
    markers.push(
      makeMarker("nai-label", "", nai.label)
        .setLngLat([c.lon, c.lat])
        .addTo(instance),
    );
  }

  return markers;
}

function makeMarker(kind: string, icon: string, label: string) {
  const element = document.createElement("div");
  element.className = `geo-marker ${kind}`;

  if (icon) {
    const iconNode = document.createElement("span");
    iconNode.className = "geo-marker-icon";
    iconNode.textContent = icon;
    element.appendChild(iconNode);
  }

  const labelNode = document.createElement("span");
  labelNode.textContent = label;
  element.appendChild(labelNode);

  return new maplibregl.Marker({ element, anchor: "center" });
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

function normalizeConfidence(c: string | undefined): string {
  if (!c) return "suspected";
  const v = c.toLowerCase();
  if (v === "confirmed" || v === "suspected" || v === "lost") return v;
  return "suspected";
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

