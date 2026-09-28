"""Shared URL resolution, SQLite configuration, and request-scoped sessions."""

from collections.abc import Generator
from functools import lru_cache
from pathlib import Path
from sqlite3 import Connection as SQLiteConnection

from sqlalchemy import URL, Engine, event, make_url
from sqlalchemy.pool import ConnectionPoolEntry
from sqlmodel import Session, create_engine

from app.config import REPO_ROOT, get_settings


def resolve_database_url(database_url: str | URL) -> URL:
    """Resolve SQLite files against the repo, preserving memory DBs and URL options."""
    url = make_url(database_url)
    if url.get_backend_name() == "sqlite" and url.database not in (None, "", ":memory:"):
        path = Path(url.database)
        if not path.is_absolute():
            path = REPO_ROOT / path
        url = url.set(database=str(path.resolve()))
    return url


def enable_sqlite_foreign_keys(connection: object, _record: ConnectionPoolEntry) -> None:
    if isinstance(connection, SQLiteConnection):
        cursor = connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


def create_db_engine(database_url: str | URL) -> Engine:
    url = resolve_database_url(database_url)
    if url.get_backend_name() == "sqlite":
        if url.database not in (None, "", ":memory:"):
            Path(url.database).parent.mkdir(parents=True, exist_ok=True)
        engine = create_engine(url, connect_args={"check_same_thread": False})
        event.listen(engine, "connect", enable_sqlite_foreign_keys)
        return engine
    return create_engine(url)


@lru_cache
def get_engine() -> Engine:
    return create_db_engine(get_settings().database_url)


def get_session() -> Generator[Session]:
    with Session(get_engine()) as session:
        yield session
