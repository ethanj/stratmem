/**
 * MIL-style symbol renderer for the tactical map.
 *
 * The app keeps MapLibre for the map engine and uses milsymbol only to produce
 * SVG for entity markers. This keeps the implementation lightweight while
 * matching FM 1-02.2 / MIL-STD-style visual language closely enough for demo.
 */
import ms from "milsymbol";
import type { TacticalEntity } from "../../types/ravenGap";

const DEFAULT_SIZE = 34;

export function symbolSvgForEntity(entity: TacticalEntity, size = DEFAULT_SIZE) {
  try {
    return new ms.Symbol(entity.sidc, {
      size,
      fill: true,
      infoFields: false,
      standard: "2525E",
    }).asSVG();
  } catch {
    return fallbackSymbol(entity);
  }
}

export function markerTone(entity: TacticalEntity) {
  if (entity.affiliation === "hostile") return "hostile";
  if (entity.entity_type === "contact") return "hostile";
  if (entity.entity_type === "drone") return "air";
  if (entity.entity_type === "vehicle") return "asset";
  if (entity.entity_type === "sensor") return "sensor";
  if (entity.entity_type === "personnel") return "personnel";
  return "friendly";
}

export function markerStatus(entity: TacticalEntity) {
  const readiness = entity.status?.readiness || "unknown";
  if (readiness === "red") return "red";
  if (readiness === "amber") return "amber";
  if (readiness === "green") return "green";
  return "unknown";
}

function fallbackSymbol(entity: TacticalEntity) {
  const color = entity.affiliation === "hostile" ? "#ef4444" : "#60a5fa";
  const shape = entity.affiliation === "hostile"
    ? `<polygon points="18,2 34,18 18,34 2,18" fill="none" stroke="${color}" stroke-width="2"/>`
    : `<rect x="3" y="7" width="30" height="22" fill="none" stroke="${color}" stroke-width="2"/>`;
  const label = fallbackLabel(entity.entity_type);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">${shape}<text x="18" y="22" text-anchor="middle" font-size="8" fill="${color}" font-family="monospace">${label}</text></svg>`;
}

function fallbackLabel(entityType: string) {
  if (entityType === "vehicle") return "V";
  if (entityType === "drone") return "U";
  if (entityType === "sensor") return "S";
  if (entityType === "contact") return "?";
  if (entityType === "personnel") return "I";
  return "IN";
}
