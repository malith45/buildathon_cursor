"""Pytest setup: never call the live OpenAI API or real GCS bucket."""

import os
from unittest.mock import patch

# Loaded before test modules; keeps pydantic from needing a real key for imports.
os.environ["OPENAI_API_KEY"] = "test-key-no-live-api"
os.environ["OPENAI_PROBE_ON_STARTUP"] = "false"
os.environ.setdefault("AUTH_SECRET", "test-secret")
os.environ["APP_ENV"] = "test"
os.environ["ALLOW_TEST_DATA_RESET"] = "true"
# Disable storage in tests by default; specific tests can patch the stores.
os.environ["STORAGE_ENABLED"] = "false"
os.environ["GCS_BUCKET"] = ""

_MOCK_PROBE = {
    "configured": True,
    "working": True,
    "message": "Mocked for tests (no API call)",
    "model": "test-mock",
    "sample": "OK",
}


def _forbid_live_openai(*_args, **_kwargs):
    raise AssertionError(
        "Live OpenAI API must not be called during tests. "
        "Use @patch on generate_json or probe_openai."
    )


_probe_patch = patch(
    "app.services.openai_service.probe_openai",
    return_value=_MOCK_PROBE.copy(),
)
_client_patch = patch(
    "app.services.openai_service.OpenAI",
    side_effect=_forbid_live_openai,
)
_probe_patch.start()
_client_patch.start()


def pytest_sessionfinish(session, exitstatus):  # noqa: ARG001
    _probe_patch.stop()
    _client_patch.stop()
