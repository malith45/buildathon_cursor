"""Pytest setup: never call the live Gemini API."""

import os
from unittest.mock import patch

# Loaded before test modules; keeps pydantic from needing a real key for imports.
os.environ["GEMINI_PROBE_ON_STARTUP"] = "false"
os.environ.setdefault("AUTH_SECRET", "test-secret")
os.environ["GEMINI_API_KEY"] = "test-key-no-live-api"

_MOCK_PROBE = {
    "configured": True,
    "working": True,
    "message": "Mocked for tests (no API call)",
    "model": "test-mock",
    "sample": "OK",
}


def _forbid_live_gemini(*_args, **_kwargs):
    raise AssertionError(
        "Live Gemini API must not be called during tests. "
        "Use @patch on generate_json or probe_gemini."
    )


_probe_patch = patch(
    "app.services.gemini_service.probe_gemini",
    return_value=_MOCK_PROBE.copy(),
)
_client_patch = patch(
    "app.services.gemini_service.genai.Client",
    side_effect=_forbid_live_gemini,
)
_probe_patch.start()
_client_patch.start()


def pytest_sessionfinish(session, exitstatus):  # noqa: ARG001
    _probe_patch.stop()
    _client_patch.stop()
