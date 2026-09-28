from pathlib import Path

import pytest
from alembic.config import Config
from sqlalchemy import Engine, inspect
from sqlmodel import Session, select

from alembic import command
from app import db
from app.models import Answer


@pytest.mark.parametrize("working_directory", [".", "backend"])
def test_relative_sqlite_path_is_repo_relative(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, working_directory: str
) -> None:
    repo = tmp_path / "repo"
    (repo / "backend").mkdir(parents=True)
    monkeypatch.setattr(db, "REPO_ROOT", repo)
    monkeypatch.chdir(repo / working_directory)
    url = db.resolve_database_url("sqlite:///data/app.db?timeout=15")
    assert url.database == str(repo / "data" / "app.db")
    assert url.query["timeout"] == "15"
    assert not (repo / "data").exists()
    engine = db.create_db_engine("sqlite:///data/app.db")
    try:
        with engine.connect():
            assert (repo / "data" / "app.db").is_file()
        assert not (repo / "backend" / "data").exists()
    finally:
        engine.dispose()


def test_absolute_sqlite_path_is_preserved(tmp_path: Path) -> None:
    path = tmp_path / "absolute.db"
    assert db.resolve_database_url(f"sqlite:///{path}").database == str(path)


@pytest.mark.parametrize("database_url", ["sqlite://", "sqlite:///:memory:"])
def test_memory_sqlite_urls_are_preserved(database_url: str) -> None:
    assert str(db.resolve_database_url(database_url)) == database_url


def test_non_sqlite_url_is_preserved() -> None:
    database_url = "postgresql://example:fake@localhost/example"
    assert (
        db.resolve_database_url(database_url).render_as_string(hide_password=False) == database_url
    )


def test_session_dependency_cleans_up_pending_transaction(
    engine: Engine, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(db, "get_engine", lambda: engine)
    dependency = db.get_session()
    session = next(dependency)
    session.add(Answer(question_key="example", text="Uncommitted answer."))
    session.flush()
    dependency.close()
    with Session(engine) as fresh:
        assert fresh.exec(select(Answer)).all() == []


def test_migration_matches_metadata_and_downgrades(
    engine: Engine, migration_config: Config
) -> None:
    assert set(inspect(engine).get_table_names()) == {
        "alembic_version",
        "profile",
        "experience",
        "bullet",
        "skill",
        "bulletskill",
        "answer",
        "document",
        "job",
        "application",
        "statusevent",
    }
    command.check(migration_config)
    command.downgrade(migration_config, "base")
    assert inspect(engine).get_table_names() == ["alembic_version"]
    command.upgrade(migration_config, "head")
    command.check(migration_config)


def test_migration_constraints_are_named_and_distinct(engine: Engine) -> None:
    inspector = inspect(engine)
    for table in inspector.get_table_names():
        if table == "alembic_version":
            continue
        names = [
            inspector.get_pk_constraint(table)["name"],
            *(constraint["name"] for constraint in inspector.get_foreign_keys(table)),
            *(constraint["name"] for constraint in inspector.get_unique_constraints(table)),
            *(constraint["name"] for constraint in inspector.get_check_constraints(table)),
            *(index["name"] for index in inspector.get_indexes(table)),
        ]
        assert all(names), table
        assert len(names) == len(set(names)), table
    assert {
        constraint["name"] for constraint in inspector.get_check_constraints("statusevent")
    } == {
        "ck_statusevent_from_status_applicationstatus",
        "ck_statusevent_to_status_applicationstatus",
    }


def test_migration_uses_settings_url_and_creates_parent_directory(
    migration_config: Config, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    path = tmp_path / "data" / "app.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{path}")
    # A legacy ini setting must never override the resolved app settings.
    migration_config.set_main_option("sqlalchemy.url", "sqlite:////unusable/ignored.db")
    command.upgrade(migration_config, "head")
    assert path.is_file()
    engine = db.create_db_engine(f"sqlite:///{path}")
    try:
        assert "profile" in inspect(engine).get_table_names()
    finally:
        engine.dispose()
