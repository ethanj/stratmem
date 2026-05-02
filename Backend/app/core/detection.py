# app/core/detection.py

from app.detection.engine import detect


def serialize_signal(signal):
    if hasattr(signal, "to_dict"):
        data = signal.to_dict()
        data["status"] = signal.metadata.get("status", "active" if signal.active else "inactive")
        data["mitigated_by"] = signal.metadata.get("mitigated_by")
        return data

    return {
        "id": signal.id,
        "kind": signal.kind,
        "domain": signal.domain,
        "weight": signal.weight,
        "evidence": signal.evidence,
        "label": signal.label,
    }