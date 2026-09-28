"""Import every table so Alembic and SQLModel see the complete metadata."""

from app.models.entities import (
    Answer,
    Application,
    ApplicationStatus,
    Bullet,
    BulletSkill,
    Document,
    DocumentKind,
    Experience,
    ExperienceKind,
    Job,
    Profile,
    Skill,
    StatusEvent,
)

__all__ = [
    "Answer",
    "Application",
    "ApplicationStatus",
    "Bullet",
    "BulletSkill",
    "Document",
    "DocumentKind",
    "Experience",
    "ExperienceKind",
    "Job",
    "Profile",
    "Skill",
    "StatusEvent",
]
