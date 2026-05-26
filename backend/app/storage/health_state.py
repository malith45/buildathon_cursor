"""Cached storage connectivity from startup (avoids blocking health probes)."""

_storage_connected: bool | None = None
_storage_message: str | None = None


def set_storage_startup_result(connected: bool, message: str | None = None) -> None:
    global _storage_connected, _storage_message
    _storage_connected = connected
    _storage_message = message


def storage_startup_status() -> tuple[bool | None, str | None]:
    return _storage_connected, _storage_message
