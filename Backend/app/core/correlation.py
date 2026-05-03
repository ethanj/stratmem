# app/core/correlation.py

from app.fusion.correlator import correlate_signals


def correlate(signals, previous_history=None):
    """
    Compatibility wrapper.

    The real fusion logic lives in app.fusion.correlator.
    core.pipeline still imports from app.core.correlation to avoid a broad refactor.
    """

    return correlate_signals(signals, previous_history=previous_history)