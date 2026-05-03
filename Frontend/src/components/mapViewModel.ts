/**
 * Map model adapter for the Raven Gap operational picture.
 *
 * The backend owns the raw `map_state` contract. This module normalizes that
 * JSON into stable marker, line, polygon, bounds, and readout data for
 * `MapView`, while retaining a legacy fallback model when contract coordinates
 * are unavailable.
 */
export type LngLat = [number, number];
export type LatLon = { lat: number; lon: number };
export type LineShape = { id: string; label: string; points: LatLon[] };
export type PolygonShape = { id: string; label: string; points: LatLon[] };
export type TacticalMarker = {
  id: string;
  kind: "friendly" | "contact" | "checkpoint" | "nai" | "anchor" | "fallback";
  icon: string;
  label: string;
  point: LatLon;
};
export type TacticalModel = {
  center: LngLat;
  bounds: LatLon[];
  riskLevel: string;
  mgrsLabel: string;
  phaseLines: LineShape[];
  routes: LineShape[];
  nais: PolygonShape[];
  riskZones: PolygonShape[];
  markers: TacticalMarker[];
  summary: { checkpoints: number; contacts: number; nais: number; routes: number };
};

type MapShapes = {
  phaseLines: LineShape[];
  routes: LineShape[];
  nais: PolygonShape[];
  riskZones: PolygonShape[];
};

const RAVEN_SCENARIO_ID = "raven_gap";
const RAVEN_CONTRACT_FIELDS = [
  "mgrs_grid_anchor",
  "phase_line",
  "checkpoints",
  "nais",
  "friendly_markers",
  "contact_markers",
  "risk_zones",
  "routes",
];

const RAVEN_BASELINE = {
  mgrs_grid_anchor: { easting: 42820, northing: 49210, zone: "11S LV", lat: 37.4755, lon: -118.6818 },
  phase_line: [{ id: "pl_raven", label: "PL Raven", points: [{ lat: 37.4662, lon: -118.6788 }, { lat: 37.4825, lon: -118.6762 }] }],
  checkpoints: [
    { id: "cp1", label: "CP1", lat: 37.4718, lon: -118.6821 },
    { id: "cp2", label: "CP2", lat: 37.4685, lon: -118.6886 },
    { id: "cp3", label: "CP3", lat: 37.4815, lon: -118.6698 },
  ],
  nais: [
    { id: "nai_1", label: "NAI-1 North Draw", polygon: squarePolygon({ lat: 37.482, lon: -118.684 }, 0.002) },
    { id: "nai_2", label: "NAI-2 East Ridge", polygon: squarePolygon({ lat: 37.4792, lon: -118.6738 }, 0.002) },
    { id: "nai_3", label: "NAI-3 South Spur", polygon: squarePolygon({ lat: 37.4669, lon: -118.6775 }, 0.002) },
  ],
  friendly_markers: [
    { id: "plt-raven", label: "PL Raven", lat: 37.4755, lon: -118.6818 },
    { id: "sqd-1", label: "1st", lat: 37.4718, lon: -118.6821 },
    { id: "sqd-2", label: "2nd", lat: 37.4787, lon: -118.6749 },
    { id: "sqd-3", label: "3rd", lat: 37.4669, lon: -118.6775 },
  ],
  contact_markers: [],
  risk_zones: [{ id: "rz_nai_2", lat: 37.4792, lon: -118.6738, radius_m: 520 }],
  routes: [
    { id: "route-finch", label: "Route Finch", points: [{ lat: 37.4685, lon: -118.6886 }, { lat: 37.4718, lon: -118.6821 }, { lat: 37.4768, lon: -118.6808 }, { lat: 37.4815, lon: -118.6698 }] },
  ],
};

const LEGACY_GATEWAY: LatLon = { lon: -122.4108, lat: 37.7794 };
const LEGACY_HQ: LatLon = { lon: -122.3694, lat: 37.7936 };
const LEGACY_SECTOR: LatLon = { lon: -122.3134, lat: 37.8258 };
const LEGACY_UAS: LatLon[] = [
  { lon: -122.3625, lat: 37.7082 },
  { lon: -122.3382, lat: 37.7654 },
  { lon: -122.3218, lat: 37.8138 },
];
const LEGACY_VESSEL: LatLon[] = [
  { lon: -122.5102, lat: 37.8382 },
  { lon: -122.432, lat: 37.832 },
  { lon: -122.3364, lat: 37.824 },
];

export function buildMapModel(map: any, scenarioId?: string): TacticalModel {
  if (shouldRenderRavenGap(map, scenarioId)) {
    return buildContractModel(map);
  }

  return buildLegacyModel(map);
}

export function toLngLat(point: LatLon): LngLat {
  return [point.lon, point.lat];
}

function buildContractModel(map: any): TacticalModel {
  const contractMap = withRavenBaseline(map);
  const shapes = contractShapes(contractMap);
  const markers = contractMarkers(contractMap, shapes.nais);
  const bounds = collectBounds(markers, shapes);

  return {
    center: toLngLat(centerPoint(bounds)),
    bounds,
    riskLevel: normalizeRisk(contractMap?.risk_level || contractMap?.risk, markers),
    mgrsLabel: formatMgrs(contractMap),
    ...shapes,
    markers,
    summary: contractSummary(contractMap, shapes),
  };
}

function shouldRenderRavenGap(map: any, scenarioId?: string) {
  if (!map || typeof map !== "object") return false;
  return scenarioId === RAVEN_SCENARIO_ID || hasRavenContractFields(map);
}

function hasRavenContractFields(map: any) {
  return RAVEN_CONTRACT_FIELDS.some((field) => Object.hasOwn(map, field));
}

function withRavenBaseline(map: any) {
  return {
    ...map,
    mgrs_grid_anchor: hasValue(map?.mgrs_grid_anchor) ? map.mgrs_grid_anchor : RAVEN_BASELINE.mgrs_grid_anchor,
    phase_line: hasValue(map?.phase_line) ? map.phase_line : RAVEN_BASELINE.phase_line,
    checkpoints: hasValue(map?.checkpoints) ? map.checkpoints : RAVEN_BASELINE.checkpoints,
    nais: hasValue(map?.nais) ? map.nais : RAVEN_BASELINE.nais,
    friendly_markers: hasValue(map?.friendly_markers) ? map.friendly_markers : RAVEN_BASELINE.friendly_markers,
    contact_markers: hasValue(map?.contact_markers) ? map.contact_markers : RAVEN_BASELINE.contact_markers,
    risk_zones: hasValue(map?.risk_zones) ? map.risk_zones : RAVEN_BASELINE.risk_zones,
    routes: hasValue(map?.routes) ? map.routes : RAVEN_BASELINE.routes,
  };
}

function contractShapes(map: any): MapShapes {
  return {
    phaseLines: lineShapes(map?.phase_line, "phase"),
    routes: lineShapes(map?.routes, "route"),
    nais: polygonShapes(map?.nais, "nai"),
    riskZones: riskZoneShapes(map?.risk_zones),
  };
}

function contractMarkers(map: any, nais: PolygonShape[]) {
  const naiMarkers = nais.map((nai) => ({
    id: `${nai.id}-label`,
    kind: "nai" as const,
    icon: "",
    label: nai.label,
    point: centerPoint(nai.points),
  }));

  return [
    ...flatMarkers(map?.friendly_markers, "friendly", "◇"),
    ...flatMarkers(map?.contact_markers, "contact", "!"),
    ...flatMarkers(map?.checkpoints, "checkpoint", "◆"),
    ...anchorMarkers(map),
    ...naiMarkers,
  ];
}

function contractSummary(map: any, shapes: MapShapes) {
  return {
    checkpoints: asArray(map?.checkpoints).length,
    contacts: asArray(map?.contact_markers).length,
    nais: shapes.nais.length,
    routes: shapes.routes.length,
  };
}

function buildLegacyModel(map: any): TacticalModel {
  const hasDrone = legacyHas(map, "drone", "physical_path");
  const hasVessel = legacyHas(map, "vessel", "osint_path") || legacyHas(map, "ais", "osint_path");
  const markers = legacyMarkers(hasDrone, hasVessel);
  const phaseLines = hasDrone ? [{ id: "legacy-uas", label: "UAS Track", points: LEGACY_UAS }] : [];
  const routes = hasVessel ? [{ id: "legacy-vessel", label: "Vessel Track", points: LEGACY_VESSEL }] : [];
  const riskZones = [{ id: "legacy-sector", label: "Protected Zone B", points: circlePolygon(LEGACY_SECTOR, 1500) }];
  const bounds = collectBounds(markers, { phaseLines, routes, nais: [], riskZones });

  return {
    center: [-122.39, 37.79],
    bounds,
    riskLevel: hasDrone || hasVessel ? "high" : "normal",
    mgrsLabel: "LEGACY FALLBACK",
    phaseLines,
    routes,
    nais: [],
    riskZones,
    markers,
    summary: { checkpoints: 0, contacts: hasDrone ? 3 : 0, nais: 0, routes: routes.length },
  };
}

function legacyMarkers(hasDrone: boolean, hasVessel: boolean): TacticalMarker[] {
  const markers: TacticalMarker[] = [
    { id: "legacy-gateway", kind: "friendly", icon: "◇", label: "GATEWAY-01", point: LEGACY_GATEWAY },
    { id: "legacy-hq", kind: "friendly", icon: "⬢", label: "HQ NODE", point: LEGACY_HQ },
    { id: "legacy-sector", kind: "fallback", icon: "", label: "PROTECTED ZONE B", point: LEGACY_SECTOR },
  ];

  if (hasDrone) {
    LEGACY_UAS.forEach((point, index) => {
      markers.push({ id: `legacy-uas-${index}`, kind: "contact", icon: "◉", label: `UAS-0${index + 1}`, point });
    });
  }

  if (hasVessel) {
    markers.push({ id: "legacy-vessel", kind: "contact", icon: "▲", label: "UNKNOWN VESSEL", point: LEGACY_VESSEL[2] });
  }

  return markers;
}

function lineShapes(value: any, prefix: string): LineShape[] {
  return shapeArray(value).map((item: any, index: number) => ({
    id: String(item?.id || `${prefix}-${index}`),
    label: String(item?.label || item?.name || `${prefix} ${index + 1}`),
    points: pointsFrom(item?.points),
  })).filter((shape) => shape.points.length > 1);
}

function polygonShapes(value: any, prefix: string): PolygonShape[] {
  return shapeArray(value).map((item: any, index: number) => ({
    id: String(item?.id || `${prefix}-${index}`),
    label: String(item?.label || item?.name || `${prefix} ${index + 1}`),
    points: pointsFrom(item?.polygon || item?.points),
  })).filter((shape) => shape.points.length > 2);
}

function riskZoneShapes(value: any): PolygonShape[] {
  return asArray(value).map((item: any, index: number) => {
    const point = pointFromAny(item);
    if (!point) return null;

    return {
      id: String(item?.id || `risk-${index}`),
      label: String(item?.label || item?.name || "Risk Zone"),
      points: circlePolygon(point, Number(item?.radius_m || 300)),
    };
  }).filter(isPolygonShape);
}

function flatMarkers(value: any, kind: TacticalMarker["kind"], icon: string) {
  return asArray(value).map((item: any, index: number) => {
    const point = pointFromAny(item);
    if (!point) return null;

    return {
      id: String(item?.id || `${kind}-${index}`),
      kind,
      icon,
      label: markerLabel(item, kind),
      point,
    };
  }).filter(isMarker);
}

function markerLabel(item: any, kind: TacticalMarker["kind"]) {
  const base = String(item?.label || item?.name || item?.id || kind);
  if (kind !== "contact") return base;
  const eventId = String(item?.id || "contact");

  return base === "?" ? eventId : `${base} ${eventId}`;
}

function anchorMarkers(map: any): TacticalMarker[] {
  const point = pointFromAny(map?.mgrs_grid_anchor || map?.mgrs_grid?.anchor);
  if (!point) return [];

  return [{ id: "mgrs-anchor", kind: "anchor", icon: "⌖", label: "MGRS ANCHOR", point }];
}

function collectBounds(markers: TacticalMarker[], shapes: MapShapes): LatLon[] {
  return [
    ...markers.map((marker) => marker.point),
    ...shapes.phaseLines.flatMap((shape) => shape.points),
    ...shapes.routes.flatMap((shape) => shape.points),
    ...shapes.nais.flatMap((shape) => shape.points),
    ...shapes.riskZones.flatMap((shape) => shape.points),
  ];
}

function squarePolygon(center: LatLon, delta: number) {
  return [
    { lat: center.lat - delta, lon: center.lon - delta },
    { lat: center.lat - delta, lon: center.lon + delta },
    { lat: center.lat + delta, lon: center.lon + delta },
    { lat: center.lat + delta, lon: center.lon - delta },
  ];
}

function circlePolygon(center: LatLon, radiusMeters: number) {
  const points: LatLon[] = [];
  const latDelta = radiusMeters / 111_320;
  const lonDelta = radiusMeters / (111_320 * Math.max(Math.cos(center.lat * Math.PI / 180), 0.2));

  for (let index = 0; index < 48; index += 1) {
    const angle = (index / 48) * Math.PI * 2;
    points.push({
      lat: center.lat + Math.sin(angle) * latDelta,
      lon: center.lon + Math.cos(angle) * lonDelta,
    });
  }

  return points;
}

function pointFromAny(value: any): LatLon | null {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value.coordinates)) return pointFromCoords(value.coordinates);
  const source = value.location || value.center || value.geospatial || value;
  const lat = Number(source.lat ?? source.latitude);
  const lon = Number(source.lon ?? source.lng ?? source.longitude);

  return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
}

function pointFromCoords(coords: any[]): LatLon | null {
  const lon = Number(coords[0]);
  const lat = Number(coords[1]);

  return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
}

function pointsFrom(value: any) {
  return asArray(value).map(pointFromAny).filter(isPoint);
}

function centerPoint(points: LatLon[]): LatLon {
  const totals = points.reduce(sumPoint, { lat: 0, lon: 0 });
  return { lat: totals.lat / points.length, lon: totals.lon / points.length };
}

function sumPoint(acc: LatLon, point: LatLon): LatLon {
  return { lat: acc.lat + point.lat, lon: acc.lon + point.lon };
}

function asArray(value: any) {
  return Array.isArray(value) ? value : [];
}

function shapeArray(value: any) {
  if (Array.isArray(value)) return value;
  return value && typeof value === "object" && Object.keys(value).length ? [value] : [];
}

function hasValue(value: any) {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === "object") return Object.keys(value).length > 0;

  return Boolean(value);
}

function normalizeRisk(value: any, markers: TacticalMarker[]) {
  const risk = String(value || "").toLowerCase();
  if (risk) return risk;

  return markers.some((marker) => marker.kind === "contact") ? "high" : "normal";
}

function formatMgrs(map: any) {
  const anchor = map?.mgrs_grid_anchor || map?.mgrs_grid?.anchor;
  if (anchor?.mgrs) return String(anchor.mgrs);

  if (anchor?.zone && anchor?.easting && anchor?.northing) {
    return `${anchor.zone} ${anchor.easting} ${anchor.northing}`;
  }

  return "MGRS PENDING";
}

function legacyHas(map: any, trackNeedle: string, pathKind: string) {
  const tracks = asArray(map?.tracks);
  const paths = asArray(map?.threat_paths);

  return tracks.some((track) => String(track?.kind || "").includes(trackNeedle)) ||
    paths.some((path) => path?.kind === pathKind);
}

function isPoint(point: LatLon | null): point is LatLon {
  return Boolean(point);
}

function isMarker(marker: TacticalMarker | null): marker is TacticalMarker {
  return Boolean(marker);
}

function isPolygonShape(shape: PolygonShape | null): shape is PolygonShape {
  return Boolean(shape);
}
