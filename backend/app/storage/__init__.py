"""Google Cloud Storage-backed persistence layer.

Layout in the bucket:
    users/{user_id}.json                  full user record
    indexes/users_by_email.json           email -> user_id map
    chats/{user_id}/{chat_id}.json        one file per chat session
    diseases/catalog.json                 seeded once from disease_names.py
"""

from app.storage.client import init_storage, storage_health_hint, storage_ping

__all__ = ["init_storage", "storage_health_hint", "storage_ping"]
