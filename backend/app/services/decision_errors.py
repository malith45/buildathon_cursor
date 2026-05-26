"""Errors surfaced to clients for triage failures."""


class DecisionInfraError(RuntimeError):
    """OpenAI auth, timeout, connectivity, or quota — not a safe triage fallback."""
