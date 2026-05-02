# app/detection/engine.py

from app.detection.rules.failed_logins import detect_failed_logins
from app.detection.rules.suspicious_login import detect_suspicious_login
from app.detection.rules.lateral_movement import detect_lateral_movement
from app.detection.rules.drone_activity import detect_drone_activity
from app.detection.rules.privilege_escalation import detect_privilege_escalation
from app.detection.rules.data_exfiltration import detect_data_exfiltration
from app.detection.rules.ais_anomaly import detect_ais_anomaly


RULES = [
    detect_failed_logins,
    detect_suspicious_login,
    detect_lateral_movement,
    detect_privilege_escalation,
    detect_data_exfiltration,
    detect_drone_activity,
    detect_ais_anomaly,
]


def detect(events):
    signals = []

    for rule in RULES:
        signal = rule(events)

        if signal:
            signals.append(signal)

    return signals