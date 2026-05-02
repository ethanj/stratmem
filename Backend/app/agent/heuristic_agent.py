#app/agent/heuristic_agent.py
from __future__ import annotations

from typing import Any

from app.agent.base import AgentProvider
from app.agent.schemas import AgentOutput


class HeuristicAgent(AgentProvider):
    """
    Always-available local analyst.

    This is not a weak fallback. It is the deterministic mission-safe path.
    The demo should never fail because an LLM is unavailable.
    """

    @property
    def name(self) -> str:
        return "heuristic"

    def available(self) -> bool:
        return True

    def analyze(self, context: dict[str, Any]) -> AgentOutput:
        severity = str(context.get("severity") or "low").lower()
        confidence = float(context.get("confidence") or 0)
        signals = context.get("signals", [])
        explanation = context.get("explanation", [])
        recommended_actions = context.get("recommended_actions", [])

        signal_kinds = [
            str(signal.get("kind", signal))
            for signal in signals
        ]

        has_cyber = any(
            kind.startswith("auth.")
            or kind.startswith("network.")
            or kind.startswith("identity.")
            for kind in signal_kinds
        )
        has_physical = any(kind.startswith("physical.") for kind in signal_kinds)
        has_osint = any(kind.startswith("osint.") for kind in signal_kinds)

        priority = self._priority_from_severity_and_confidence(severity, confidence)

        threat_summary = self._build_threat_summary(
            signal_kinds=signal_kinds,
            has_cyber=has_cyber,
            has_physical=has_physical,
            has_osint=has_osint,
        )

        next_steps = recommended_actions or self._default_actions(signal_kinds, priority)

        return {
            "assessment": self._assessment(priority, confidence),
            "priority": priority,
            "threat_summary": threat_summary,
            "why_it_matters": self._why_it_matters(
                has_cyber=has_cyber,
                has_physical=has_physical,
                has_osint=has_osint,
                confidence=confidence,
            ),
            "next_steps": next_steps,
            "operator_note": self._operator_note(priority, has_physical, has_osint),
            "confidence_rationale": self._confidence_rationale(
                confidence=confidence,
                explanation=explanation,
                signal_count=len(signal_kinds),
            ),
            "decision_window": "immediate" if priority in {"critical", "high"} else "monitor",
            "provider": self.name,
        }

    def _priority_from_severity_and_confidence(self, severity: str, confidence: float):
        if severity == "critical" or confidence >= 0.8:
            return "critical"
        if severity == "high" or confidence >= 0.6:
            return "high"
        if severity == "medium" or confidence >= 0.4:
            return "medium"
        return "low"

    def _build_threat_summary(
        self,
        *,
        signal_kinds: list[str],
        has_cyber: bool,
        has_physical: bool,
        has_osint: bool,
    ) -> str:
        domains = []
        if has_cyber:
            domains.append("cyber")
        if has_physical:
            domains.append("physical")
        if has_osint:
            domains.append("OSINT")

        domain_text = ", ".join(domains) if domains else "monitored"

        if "network.data_exfiltration" in signal_kinds:
            return (
                f"Sentinel Forge detected a {domain_text} threat pattern involving "
                "intrusion activity and possible outbound data exfiltration."
            )

        if "physical.drone_recon" in signal_kinds and "network.lateral_movement" in signal_kinds:
            return (
                f"Sentinel Forge detected a coordinated {domain_text} intrusion pattern: "
                "cyber compromise indicators are aligning with perimeter drone activity."
            )

        if "network.lateral_movement" in signal_kinds:
            return (
                "Sentinel Forge detected an escalating cyber intrusion pattern with "
                "rapid internal node access consistent with lateral movement."
            )

        if "auth.anomalous_login" in signal_kinds:
            return (
                "Sentinel Forge detected suspicious authentication behavior after failed access attempts."
            )

        return "Sentinel Forge detected anomalous activity requiring operator review."

    def _why_it_matters(
        self,
        *,
        has_cyber: bool,
        has_physical: bool,
        has_osint: bool,
        confidence: float,
    ) -> str:
        if has_cyber and has_physical and has_osint:
            return (
                "The incident spans cyber, physical, and intelligence domains. "
                "That makes it more likely to represent coordinated adversary activity rather than isolated noise."
            )

        if has_cyber and has_physical:
            return (
                "Cyber compromise indicators are occurring alongside physical perimeter activity, "
                "which increases operational risk and requires immediate containment."
            )

        if has_cyber and has_osint:
            return (
                "Cyber indicators are aligning with external intelligence signals, increasing confidence "
                "that this is not a single-system anomaly."
            )

        if confidence >= 0.7:
            return (
                "The confidence score is high enough that delaying response increases risk of spread, "
                "data loss, or physical exposure."
            )

        return "The event pattern is still developing, but early review can prevent escalation."

    def _default_actions(self, signal_kinds: list[str], priority: str) -> list[str]:
        actions = []

        if any(kind.startswith("auth.") for kind in signal_kinds):
            actions.append("Review authentication source and lock affected accounts if unauthorized")

        if "network.lateral_movement" in signal_kinds:
            actions.append("Isolate affected internal nodes")

        if "identity.privilege_escalation" in signal_kinds:
            actions.append("Revoke suspicious elevated privileges")

        if "network.data_exfiltration" in signal_kinds:
            actions.append("Block suspicious outbound transfer")

        if "physical.drone_recon" in signal_kinds:
            actions.append("Dispatch patrol to Sector B")

        if "osint.ais_anomaly" in signal_kinds:
            actions.append("Review AIS/vessel intelligence feed")

        if priority in {"critical", "high"}:
            actions.append("Escalate to incident commander")

        return actions or ["Continue monitoring and collect additional evidence"]

    def _assessment(self, priority: str, confidence: float) -> str:
        if priority == "critical":
            return f"Critical coordinated threat pattern detected with {confidence:.0%} confidence."
        if priority == "high":
            return f"High-risk intrusion pattern detected with {confidence:.0%} confidence."
        if priority == "medium":
            return f"Suspicious activity detected with {confidence:.0%} confidence."
        return f"Low-confidence anomaly detected with {confidence:.0%} confidence."

    def _operator_note(self, priority: str, has_physical: bool, has_osint: bool) -> str:
        if priority == "critical" and has_physical:
            return (
                "Treat this as an active cyber-physical incident. Coordinate SOC containment "
                "with physical security response."
            )

        if priority == "critical":
            return "Treat this as an active intrusion. Begin containment before further triage."

        if has_osint:
            return "External intelligence context is present. Validate whether the OSINT signal is related."

        return "Continue evidence collection and watch for escalation across domains."

    def _confidence_rationale(
        self,
        *,
        confidence: float,
        explanation: list[str],
        signal_count: int,
    ) -> str:
        if explanation:
            return " ".join(str(item) for item in explanation[:3])

        return (
            f"Confidence is based on {signal_count} active signal category/categories "
            f"and the current fused score of {confidence:.0%}."
        )