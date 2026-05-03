"""State-contract map shape helpers for the Raven Gap COP.

The core map builder keeps legacy Sentinel Forge map keys alive. These helpers
derive the flat Team A v2 contract fields from the same Raven Gap coordinates so
frontend and integration consumers do not hardcode their own coordinate source.
"""

from __future__ import annotations

from typing import Any


def build_mgrs_grid_anchor(anchor: dict[str, float]) -> dict[str, Any]:
    """Return the flat MGRS anchor required by the state contract."""
    return {
        "easting": 42820,
        "northing": 49210,
        "zone": "11S LV",
        **anchor,
    }


def build_contract_checkpoints(
    checkpoints: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Return flat checkpoint markers for the state contract."""
    return [
        {
            "id": checkpoint["id"].replace("-", ""),
            "label": checkpoint["name"],
            **checkpoint["location"],
        }
        for checkpoint in checkpoints
    ]


def build_contract_nais(nais: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Return NAI polygons for the state contract."""
    return [
        {
            "id": nai["id"].replace("-", "_"),
            "label": nai["name"],
            "polygon": square_polygon(nai["center"], 0.002),
        }
        for nai in nais
    ]


def build_contract_friendly_markers(
    markers: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Return flat friendly markers for the state contract."""
    return [
        {
            "id": marker["id"],
            "label": marker["label"],
            "kind": marker.get("kind"),
            "unit": marker.get("unit"),
            "status": marker.get("status"),
            **marker["location"],
        }
        for marker in markers
    ]


def build_contract_contact_markers(
    markers: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Return flat contact markers for the state contract."""
    return [
        {
            "id": marker["id"].replace("contact-", "ctc_"),
            "label": marker["label"] if marker["severity"] == "low" else "?",
            **marker["location"],
            "kind": marker.get("kind"),
            "severity": marker.get("severity"),
            "source_event_id": marker.get("source_event_id"),
            "message": marker.get("message"),
            "confidence": confidence_label(marker["severity"]),
        }
        for marker in markers
    ]


def build_contract_risk_zones(
    risk_zones: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Return flat risk zones for the state contract."""
    return [
        {
            "id": risk_zone["id"].replace("risk-", "rz_").replace("-", "_"),
            **risk_zone["center"],
            "radius_m": risk_zone["radius_m"],
        }
        for risk_zone in risk_zones
    ]


def square_polygon(
    center: dict[str, float],
    delta: float,
) -> list[dict[str, float]]:
    """Build a small display polygon around a center point."""
    lat = center["lat"]
    lon = center["lon"]
    return [
        {"lat": lat - delta, "lon": lon - delta},
        {"lat": lat - delta, "lon": lon + delta},
        {"lat": lat + delta, "lon": lon + delta},
        {"lat": lat + delta, "lon": lon - delta},
    ]


def confidence_label(severity: str) -> str:
    """Map source severity to contact confidence labels."""
    if severity == "high":
        return "confirmed"

    if severity == "medium":
        return "suspected"

    return "possible"
