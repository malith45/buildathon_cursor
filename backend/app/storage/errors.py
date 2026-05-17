"""Error helpers for the GCS storage layer."""

from google.api_core import exceptions as gapi_exceptions
from google.auth import exceptions as auth_exceptions


_UNAVAILABLE_TYPES: tuple[type[BaseException], ...] = (
    gapi_exceptions.ServiceUnavailable,
    gapi_exceptions.DeadlineExceeded,
    gapi_exceptions.GatewayTimeout,
    gapi_exceptions.RetryError,
    gapi_exceptions.TooManyRequests,
    gapi_exceptions.Forbidden,
    gapi_exceptions.Unauthenticated,
    gapi_exceptions.NotFound,
    auth_exceptions.GoogleAuthError,
    auth_exceptions.DefaultCredentialsError,
)


def is_storage_unavailable(exc: BaseException) -> bool:
    if isinstance(exc, _UNAVAILABLE_TYPES):
        return True
    # ConnectionError from the transport layer
    if isinstance(exc, (ConnectionError, TimeoutError)):
        return True
    return False


class StorageConflict(RuntimeError):
    """Raised when an optimistic-concurrency precondition fails."""
