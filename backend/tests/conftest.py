from collections.abc import Iterator
from pathlib import Path

import pytest
from alembic.config import Config
from sqlalchemy import Engine
from sqlmodel import Session

from alembic import command
from app.config import get_settings
from app.db import create_db_engine


@pytest.fixture
def migration_config(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Iterator[Config]:
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{tmp_path / 'test.db'}")
    get_settings.cache_clear()
    yield Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    get_settings.cache_clear()


@pytest.fixture
def engine(migration_config: Config) -> Iterator[Engine]:
    """Use the real migrations on a fresh temporary SQLite file for every test."""
    command.upgrade(migration_config, "head")
    engine = create_db_engine(get_settings().database_url)
    yield engine
    engine.dispose()


@pytest.fixture
def session(engine: Engine) -> Iterator[Session]:
    with Session(engine) as session:
        yield session
