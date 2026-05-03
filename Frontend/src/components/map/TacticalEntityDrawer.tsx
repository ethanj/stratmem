/**
 * Click-through detail drawer for S2 map entities.
 *
 * The drawer keeps the map uncluttered by showing expanded personnel, asset,
 * readiness, nationality, and report history only after an operator selects an
 * entity symbol.
 */
import type { TacticalEntity } from "../../types/ravenGap";

type Props = {
  entity?: TacticalEntity;
  onClose: () => void;
  onExpandParent: (entity: TacticalEntity) => void;
};

const STATUS_FIELDS = ["health", "readiness", "ammo", "comms", "mobility", "battery", "fuel"];

export default function TacticalEntityDrawer({ entity, onClose, onExpandParent }: Props) {
  if (!entity) return null;

  const canExpand = entity.entity_type === "squad" || entity.entity_type === "platoon";

  return (
    <aside className="entity-drawer" aria-label="Selected tactical entity">
      <div className="entity-drawer-header">
        <div>
          <span className={`entity-affiliation ${entity.affiliation}`}>{entity.affiliation}</span>
          <h3>{entity.label}</h3>
        </div>
        <button type="button" onClick={onClose}>CLOSE</button>
      </div>

      <div className="entity-drawer-grid">
        <Fact label="CALLSIGN" value={entity.callsign} />
        <Fact label="TYPE" value={entity.entity_type} />
        <Fact label="NATION" value={entity.nationality} />
        <Fact label="ECHELON" value={entity.echelon || "equipment"} />
        <Fact label="MGRS" value={entity.mgrs || "11S LV"} />
        <Fact label="SIDC" value={entity.sidc} />
      </div>

      {"personnel_total" in entity && (
        <div className="entity-readiness-bar">
          <span>PERSONNEL</span>
          <strong>{entity.personnel_available}/{entity.personnel_total} AVAILABLE</strong>
        </div>
      )}

      <div className="entity-status-grid">
        {STATUS_FIELDS.map((field) => (
          <div key={field} className={`entity-status ${statusValue(entity, field)}`}>
            <span>{field.toUpperCase()}</span>
            <strong>{statusValue(entity, field).toUpperCase()}</strong>
          </div>
        ))}
      </div>

      {canExpand && (
        <button type="button" className="entity-expand-btn" onClick={() => onExpandParent(entity)}>
          EXPAND PERSONNEL ON MAP
        </button>
      )}

      <div className="entity-history">
        <h4>RECENT REPORTS</h4>
        {(entity.history || []).map((item, index) => (
          <div key={`${item.event_id || "event"}-${index}`} className="entity-history-item">
            <span>{item.event_id || "STATUS"}</span>
            <p>{item.message}</p>
          </div>
        ))}
      </div>
    </aside>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="entity-fact">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function statusValue(entity: TacticalEntity, field: string) {
  return entity.status?.[field] || "n/a";
}
