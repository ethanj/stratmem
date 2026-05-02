# app/fusion/interpreter.py
"""
Legacy compatibility module.

The active incident interpreter lives in:
app/core/interpreter.py

Do not use this module for the current demo pipeline.
"""


def interpret(*args, **kwargs):
    raise RuntimeError(
        "app.fusion.interpreter is deprecated. Use app.core.interpreter instead."
    )