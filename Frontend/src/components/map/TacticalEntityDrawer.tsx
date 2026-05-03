/**
 * Click-through detail drawer for S2 map entities.
 *
 * The drawer keeps the map uncluttered by showing expanded personnel, asset,
 * readiness, nationality, and report history only after an operator selects an
 * entity symbol.
 */
import type { TacticalEntity } from "../../types/ravenGap";
import "./TacticalEntityDrawer.css";

type Props = {
  entity?: TacticalEntity | null;
  roster?: TacticalEntity[];
  rosterExpanded?: boolean;
  parentLabel?: string;
  onBack?: () => void;
  onClose: () => void;
  onExpandParent: (entity: TacticalEntity) => void;
  onSelectEntity?: (id: string) => void;
};

const STATUS_FIELDS = ["health", "readiness", "ammo", "comms", "mobility", "battery", "fuel"];

export default function TacticalEntityDrawer({
  entity,
  roster = [],
  rosterExpanded = false,
  parentLabel,
  onBack,
  onClose,
  onExpandParent,
  onSelectEntity,
}: Props) {
  if (!entity) return null;

  const canExpand = entity.entity_type === "squad" || entity.entity_type === "platoon";
  const isLocked = Boolean(entity.detail_locked);

  return (
    <aside className="entity-drawer" aria-label="Selected tactical entity">
      <div className="entity-drawer-header">
        <div>
          <span className={`entity-affiliation ${entity.affiliation}`}>{entity.affiliation}</span>
          <h3>{entity.label}</h3>
        </div>
        <div className="entity-header-actions">
          {onBack && (
            <button type="button" onClick={onBack}>
              BACK{parentLabel ? ` TO ${parentLabel}` : ""}
            </button>
          )}
          <button type="button" onClick={onClose}>CLEAR</button>
        </div>
      </div>

      {isLocked && (
        <div className="entity-locked">
          SYMBOL ONLY. Adjacent unit context; no roster is loaded for this demo.
        </div>
      )}

      <div className="entity-drawer-grid">
        <Fact label="CALLSIGN" value={entity.callsign} />
        <Fact label="TYPE" value={entity.entity_type} />
        <Fact label="NATION" value={entity.nationality} />
        <Fact label="ECHELON" value={entity.echelon || "equipment"} />
        <Fact label="MGRS" value={entity.mgrs || "11S LV"} />
        <Fact label="SIDC" value={entity.sidc} />
      </div>

      {(entity.activity || entity.report_status) && (
        <div className="entity-drawer-grid">
          {entity.activity && <Fact label="ACTIVITY" value={entity.activity} />}
          {entity.report_status && <Fact label="REPORT" value={entity.report_status} />}
        </div>
      )}

      {"personnel_total" in entity && (
        <button
          type="button"
          className="entity-readiness-bar"
          onClick={() => canExpand && onExpandParent(entity)}
          disabled={!canExpand || isLocked}
        >
          <span>PERSONNEL</span>
          <strong>
            {entity.personnel_available}/{entity.personnel_total} AVAILABLE
            {canExpand && !isLocked ? " - VIEW SOLDIERS" : ""}
          </strong>
        </button>
      )}

      <div className="entity-status-grid">
        {STATUS_FIELDS.map((field) => (
          <div key={field} className={`entity-status ${statusValue(entity, field)}`}>
            <span>{field.toUpperCase()}</span>
            <strong>{statusValue(entity, field).toUpperCase()}</strong>
          </div>
        ))}
      </div>

      {canExpand && rosterExpanded && roster.length > 0 && (
        <RosterList roster={roster} onSelectEntity={onSelectEntity} />
      )}

      {entity.transmissions && entity.transmissions.length > 0 && (
        <TransmissionList transmissions={entity.transmissions} />
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

function TransmissionList({
  transmissions,
}: {
  transmissions: NonNullable<TacticalEntity["transmissions"]>;
}) {
  return (
    <div className="entity-transmissions">
      <h4>LIVE TRANSMISSION</h4>
      {transmissions.map((row, index) => (
        <div key={`${row.time}-${row.channel}-${index}`} className="entity-transmission-row">
          <span>{row.time}</span>
          <strong>{row.channel}</strong>
          <em>{row.status}</em>
          <p>{row.message}</p>
        </div>
      ))}
    </div>
  );
}

function RosterList({
  roster,
  onSelectEntity,
}: {
  roster: TacticalEntity[];
  onSelectEntity?: (id: string) => void;
}) {
  return (
    <div className="entity-roster">
      <h4>INDIVIDUAL READINESS</h4>
      {roster.map((child) => (
        <button
          type="button"
          key={child.id}
          className={`entity-roster-row ${statusValue(child, "readiness")}`}
          onClick={() => onSelectEntity?.(child.id)}
        >
          <span>{child.callsign}</span>
          <strong>{statusValue(child, "readiness").toUpperCase()}</strong>
          <em>{child.activity || child.role || "assigned"}</em>
        </button>
      ))}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string | number }) {
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
