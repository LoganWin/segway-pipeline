from alembic import context
from app import models
from app.config import get_settings
from app.db import create_db_engine, resolve_database_url

# Importing app.models registers every table in the shared SQLModel metadata.
target_metadata = models.Profile.metadata
database_url = resolve_database_url(get_settings().database_url)


def run_migrations_offline() -> None:
    context.configure(
        url=database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=database_url.get_backend_name() == "sqlite",
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    engine = create_db_engine(database_url)
    try:
        with engine.connect() as connection:
            context.configure(
                connection=connection,
                target_metadata=target_metadata,
                render_as_batch=database_url.get_backend_name() == "sqlite",
            )
            with context.begin_transaction():
                context.run_migrations()
    finally:
        engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
