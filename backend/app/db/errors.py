import psycopg2


def is_database_unavailable(exc: BaseException) -> bool:
    return isinstance(exc, (psycopg2.OperationalError, psycopg2.InterfaceError))
