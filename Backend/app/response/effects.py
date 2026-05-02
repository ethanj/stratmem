from __future__ import annotations

from typing import Optional

ACTION_EFFECTS: dict[str, dict[str, object]] = {
    "Lock affected accounts": {
        "mitigates": ["auth.failed_burst", "auth.anomalous_login"],
        "effect": "identity_contained",
    },
    "Isolate compromised node": {
        "mitigates": ["network.lateral_movement", "network.data_exfiltration"],
        "effect": "network_contained",
    },
    "Revoke elevated privileges": {
        "mitigates": ["identity.privilege_escalation"],
        "effect": "privilege_revoked",
    },
    "Block suspicious outbound transfer": {
        "mitigates": ["network.data_exfiltration"],
        "effect": "exfil_blocked",
    },
    "Dispatch patrol to Sector B": {
        "mitigates": ["physical.drone_recon"],
        "effect": "physical_response_active",
    },
    "Review AIS/vessel intelligence feed": {
        "mitigates": ["osint.ais_anomaly"],
        "effect": "osint_reviewed",
    },
}

MITIGATED_WEIGHT_FACTOR = 0.2


def build_mitigation_index(action_status: Optional[dict[str, bool]]) -> dict[str, str]:
    if not action_status:
        return {}

    mitigated: dict[str, str] = {}

    for action, completed in action_status.items():
        if not completed:
            continue

        mapping = ACTION_EFFECTS.get(action)
        if not mapping:
            continue

        for signal_kind in mapping.get("mitigates", []):
            mitigated.setdefault(str(signal_kind), action)

    return mitigated
