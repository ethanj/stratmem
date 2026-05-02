// components/MapView.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import type { FeatureCollection, LineString, Polygon } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import "../styles/map.css";

const GATEWAY: [number, number] = [-122.4108, 37.7794];
const HQ_NODE: [number, number] = [-122.3694, 37.7936];

/**
 * Sector B is the protected perimeter / defended zone.
 * Threat contacts should appear around it, not directly on top of it.
 */
const SECTOR_B: [number, number] = [-122.3134, 37.8258];

const UAS_START: [number, number] = [-122.3625, 37.7082];
const UAS_MID: [number, number] = [-122.3382, 37.7654];

const UAS_CONTACTS: Array<{
  id: string;
  label: string;
  icon: string;
  position: [number, number];
}> = [
  {
    id: "uas-01",
    label: "UAS-01",
    icon: "◉",
    position: [-122.3218, 37.8138],
  },
  {
    id: "uas-02",
    label: "UAS-02",
    icon: "◌",
    position: [-122.3028, 37.8335],
  },
  {
    id: "uas-03",
    label: "UAS-03",
    icon: "◍",
    position: [-122.3308, 37.8425],
  },
];

const UAS_APPROACH_POINT: [number, number] = UAS_CONTACTS[0].position;

const VESSEL_START: [number, number] = [-122.5102, 37.8382];
const VESSEL_MID: [number, number] = [-122.432, 37.832];
const VESSEL_CURRENT: [number, number] = [-122.3364, 37.824];

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

type MapViewProps = {
  map: any;
};

type MapCanvasProps = {
  hasDrone: boolean;
  hasVessel: boolean;
  isElevated: boolean;
  expanded?: boolean;
};

export default function MapView({ map }: MapViewProps) {
  const [expanded, setExpanded] = useState(false);

  const tracks = map?.tracks || [];
  const threatPaths = map?.threat_paths || [];
  const riskLevel = map?.risk_level || map?.risk || "normal";

  const hasDrone = useMemo(() => {
    return (
      tracks.some((track: any) => track.kind === "physical.drone") ||
      tracks.some((track: any) => String(track.kind || "").includes("drone")) ||
      threatPaths.some((path: any) => path.kind === "physical_path")
    );
  }, [tracks, threatPaths]);

  const hasVessel = useMemo(() => {
    return (
      tracks.some((track: any) => track.kind === "osint.ais_anomaly") ||
      tracks.some((track: any) => String(track.kind || "").includes("ais")) ||
      tracks.some((track: any) => String(track.kind || "").includes("vessel")) ||
      threatPaths.some((path: any) => path.kind === "osint_path")
    );
  }, [tracks, threatPaths]);

  const isElevated = ["medium", "high", "critical"].includes(riskLevel);

  return (
    <>
      <div
        className={`panel map-panel risk-${riskLevel} map-panel-clickable`}
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
          <h2>OPERATIONAL VIEW</h2>
          <span className={`map-risk-badge ${riskLevel}`}>
            RISK: {String(riskLevel).toUpperCase()}
          </span>
        </div>

        <div className="real-map-shell">
          <MapCanvas
            hasDrone={hasDrone}
            hasVessel={hasVessel}
            isElevated={isElevated}
          />

          <MapOverlays />
          <div className="map-expand-hint">CLICK TO EXPAND</div>
        </div>
      </div>

      {expanded && (
        <div className="map-modal-backdrop" onClick={() => setExpanded(false)}>
          <div className="map-modal" onClick={(event) => event.stopPropagation()}>
            <div className="map-modal-header">
              <div>
                <h2>EXPANDED OPERATIONAL VIEW</h2>
                <span>Live cyber / physical / OSINT mission picture</span>
              </div>

              <div className="map-modal-header-right">
                <span className={`map-risk-badge ${riskLevel}`}>
                  RISK: {String(riskLevel).toUpperCase()}
                </span>

                <button
                  type="button"
                  className="map-modal-close"
                  onClick={() => setExpanded(false)}
                  aria-label="Close expanded operational view"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="map-modal-body">
              <div className="real-map-shell expanded">
                <MapCanvas
                  hasDrone={hasDrone}
                  hasVessel={hasVessel}
                  isElevated={isElevated}
                  expanded
                />

                <MapOverlays />

                <div className="map-layer-readout">
                  <span className="active">CYBER</span>
                  <span className={hasDrone ? "active warning" : ""}>UAS</span>
                  <span className={hasVessel ? "active cyan" : ""}>AIS</span>
                  <span className={isElevated ? "active danger" : ""}>FUSION</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MapCanvas({
  hasDrone,
  hasVessel,
  isElevated,
  expanded = false,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRefs = useRef<maplibregl.Marker[]>([]);
  const mapLoadedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const instance = new maplibregl.Map({
      container: containerRef.current,
      style: DARK_RASTER_STYLE,
      center: expanded ? [-122.38, 37.795] : [-122.39, 37.79],
      zoom: expanded ? 11.15 : 10.4,
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

    instance.addControl(
      new maplibregl.NavigationControl({
        visualizePitch: true,
      }),
      "top-right"
    );

    instance.addControl(
      new maplibregl.AttributionControl({
        compact: true,
      }),
      "bottom-right"
    );

    instance.on("load", () => {
      mapLoadedRef.current = true;

      addSourcesAndLayers(instance);

      updateMapData(instance, {
        hasDrone,
        hasVessel,
        isElevated,
      });

      markerRefs.current.forEach((marker) => marker.remove());
      markerRefs.current = buildMarkers({
        instance,
        hasDrone,
        hasVessel,
        isElevated,
      });

      window.setTimeout(() => {
        instance.resize();
      }, 50);
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

    if (!instance || !mapLoadedRef.current || !instance.isStyleLoaded()) {
      return;
    }

    updateMapData(instance, {
      hasDrone,
      hasVessel,
      isElevated,
    });

    markerRefs.current.forEach((marker) => marker.remove());
    markerRefs.current = buildMarkers({
      instance,
      hasDrone,
      hasVessel,
      isElevated,
    });
  }, [hasDrone, hasVessel, isElevated]);

  return <div ref={containerRef} className="real-map" />;
}

function MapOverlays() {
  return (
    <>
      <div className="map-vignette" />
      <div className="map-scan-overlay" />

      <div className="map-legend real">
        <span>
          <b className="blue" /> FRIENDLY ASSET
        </span>
        <span>
          <b className="red" /> THREAT
        </span>
        <span>
          <b className="gray" /> NEUTRAL
        </span>
        <span>
          <b className="orange-line" /> UAS TRACK
        </span>
        <span>
          <b className="cyan-line" /> VESSEL TRACK
        </span>
      </div>
    </>
  );
}

function addSourcesAndLayers(instance: maplibregl.Map) {
  if (instance.getSource("uas-track")) return;

  instance.addSource("uas-track", {
    type: "geojson",
    data: lineFeature([UAS_START, UAS_MID, UAS_APPROACH_POINT]),
  });

  instance.addSource("vessel-track", {
    type: "geojson",
    data: lineFeature([VESSEL_START, VESSEL_MID, VESSEL_CURRENT]),
  });

  instance.addSource("sector-b", {
    type: "geojson",
    data: sectorPolygon(SECTOR_B, 0.018),
  });

  instance.addLayer({
    id: "sector-b-fill",
    type: "fill",
    source: "sector-b",
    paint: {
      "fill-color": "#ff4040",
      "fill-opacity": 0.06,
    },
  });

  instance.addLayer({
    id: "sector-b-line",
    type: "line",
    source: "sector-b",
    paint: {
      "line-color": "#ff4040",
      "line-width": 2,
      "line-opacity": 0.28,
    },
  });

  instance.addLayer({
    id: "uas-track-line",
    type: "line",
    source: "uas-track",
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      "line-color": "#fb923c",
      "line-width": 3,
      "line-dasharray": [2, 2],
      "line-opacity": 0,
    },
  });

  instance.addLayer({
    id: "vessel-track-line",
    type: "line",
    source: "vessel-track",
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      "line-color": "#22d3ee",
      "line-width": 3,
      "line-dasharray": [2, 2],
      "line-opacity": 0,
    },
  });
}

function updateMapData(
  instance: maplibregl.Map,
  args: {
    hasDrone: boolean;
    hasVessel: boolean;
    isElevated: boolean;
  }
) {
  const uasSource = instance.getSource("uas-track") as maplibregl.GeoJSONSource;
  const vesselSource = instance.getSource(
    "vessel-track"
  ) as maplibregl.GeoJSONSource;
  const sectorSource = instance.getSource("sector-b") as maplibregl.GeoJSONSource;

  if (uasSource) {
    uasSource.setData(lineFeature([UAS_START, UAS_MID, UAS_APPROACH_POINT]));
  }

  if (vesselSource) {
    vesselSource.setData(lineFeature([VESSEL_START, VESSEL_MID, VESSEL_CURRENT]));
  }

  if (sectorSource) {
    sectorSource.setData(sectorPolygon(SECTOR_B, 0.018));
  }

  if (instance.getLayer("uas-track-line")) {
    instance.setPaintProperty(
      "uas-track-line",
      "line-opacity",
      args.hasDrone ? 0.92 : 0
    );
  }

  if (instance.getLayer("vessel-track-line")) {
    instance.setPaintProperty(
      "vessel-track-line",
      "line-opacity",
      args.hasVessel ? 0.86 : 0
    );
  }

  if (instance.getLayer("sector-b-fill")) {
    instance.setPaintProperty(
      "sector-b-fill",
      "fill-opacity",
      args.isElevated ? 0.2 : 0.06
    );
  }

  if (instance.getLayer("sector-b-line")) {
    instance.setPaintProperty(
      "sector-b-line",
      "line-opacity",
      args.isElevated ? 0.86 : 0.28
    );
  }
}

function buildMarkers(args: {
  instance: maplibregl.Map;
  hasDrone: boolean;
  hasVessel: boolean;
  isElevated: boolean;
}) {
  const { instance, hasDrone, hasVessel, isElevated } = args;

  const markers: maplibregl.Marker[] = [];

  markers.push(
    makeMarker("friendly", "◇", "GATEWAY-01").setLngLat(GATEWAY).addTo(instance)
  );

  markers.push(
    makeMarker("friendly", "⬢", "HQ NODE").setLngLat(HQ_NODE).addTo(instance)
  );

  markers.push(
    makeMarker(
      isElevated ? "sector active" : "sector",
      "",
      "PROTECTED ZONE B"
    )
      .setLngLat(SECTOR_B)
      .addTo(instance)
  );

  if (hasDrone) {
    UAS_CONTACTS.forEach((contact, index) => {
      markers.push(
        makeMarker(
          index === 0
            ? "threat active primary-uas"
            : "threat active secondary-uas",
          contact.icon,
          contact.label
        )
          .setLngLat(contact.position)
          .addTo(instance)
      );
    });
  }

  if (hasVessel) {
    markers.push(
      makeMarker("vessel active", "▲", "UNKNOWN VESSEL")
        .setLngLat(VESSEL_CURRENT)
        .addTo(instance)
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

  return new maplibregl.Marker({
    element,
    anchor: "center",
  });
}

function lineFeature(coords: [number, number][]): FeatureCollection<LineString> {
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: coords,
        },
      },
    ],
  };
}

function sectorPolygon(
  center: [number, number],
  radius: number
): FeatureCollection<Polygon> {
  const [lng, lat] = center;
  const points: [number, number][] = [];

  for (let i = 0; i <= 72; i++) {
    const angle = (i / 72) * Math.PI * 2;

    points.push([
      lng + Math.cos(angle) * radius,
      lat + Math.sin(angle) * radius * 0.72,
    ]);
  }

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [points],
        },
      },
    ],
  };
}