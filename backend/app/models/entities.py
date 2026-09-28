"""Phase 1 persistence models. Timestamps use timezone-aware UTC."""

from datetime import UTC, date, datetime
from enum import StrEnum

from sqlalchemy import JSON, CheckConstraint, Column, Enum, column
from sqlmodel import Field, Relationship, SQLModel

from app.models.types import UTCDateTime

SQLModel.metadata.naming_convention = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(column_0_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


def utc_now() -> datetime:
    return datetime.now(UTC)


class ExperienceKind(StrEnum):
    JOB = "job"
    PROJECT = "project"
    EDUCATION = "education"


class DocumentKind(StrEnum):
    RESUME = "resume"
    COVER = "cover"
    OTHER = "other"


class ApplicationStatus(StrEnum):
    SAVED = "saved"
    PREPARING = "preparing"
    READY_FOR_REVIEW = "ready_for_review"
    APPLIED = "applied"
    INTERVIEWING = "interviewing"
    OFFER = "offer"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"


def enum_values(enum: type[StrEnum]) -> list[str]:
    return [member.value for member in enum]


def enum_type(enum: type[StrEnum]) -> Enum:
    return Enum(
        enum,
        values_callable=enum_values,
        native_enum=False,
        create_constraint=True,
        validate_strings=True,
    )


class Timestamped(SQLModel):
    created_at: datetime = Field(default_factory=utc_now, sa_type=UTCDateTime)
    updated_at: datetime = Field(
        default_factory=utc_now, sa_type=UTCDateTime, sa_column_kwargs={"onupdate": utc_now}
    )


class Profile(Timestamped, table=True):
    __table_args__ = (CheckConstraint(column("id") == 1, name="singleton"),)

    id: int = Field(default=1, primary_key=True)
    name: str
    email: str
    phone: str | None = None
    location: str | None = None
    links: list[str] = Field(default_factory=list, sa_column=Column(JSON, nullable=False))
    work_authorization: str | None = None


class BulletSkill(SQLModel, table=True):
    bullet_id: int = Field(primary_key=True, foreign_key="bullet.id", ondelete="CASCADE")
    skill_id: int = Field(primary_key=True, foreign_key="skill.id", ondelete="CASCADE")


class Experience(Timestamped, table=True):
    id: int | None = Field(default=None, primary_key=True)
    kind: ExperienceKind = Field(sa_column=Column(enum_type(ExperienceKind), nullable=False))
    org: str
    title: str
    start_date: date | None = None
    end_date: date | None = None
    location: str | None = None

    bullets: list["Bullet"] = Relationship(back_populates="experience", passive_deletes="all")


class Bullet(Timestamped, table=True):
    id: int | None = Field(default=None, primary_key=True)
    experience_id: int | None = Field(
        default=None, foreign_key="experience.id", ondelete="CASCADE", nullable=False, index=True
    )
    text: str
    metrics: str | None = None
    verified: bool = False

    experience: Experience = Relationship(back_populates="bullets")
    skills: list["Skill"] = Relationship(
        back_populates="bullets", link_model=BulletSkill, passive_deletes="all"
    )


class Skill(Timestamped, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(unique=True)
    category: str | None = None
    proficiency: str | None = None

    bullets: list[Bullet] = Relationship(
        back_populates="skills", link_model=BulletSkill, passive_deletes="all"
    )


class Answer(Timestamped, table=True):
    id: int | None = Field(default=None, primary_key=True)
    question_key: str = Field(unique=True)
    text: str


class Document(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    kind: DocumentKind = Field(sa_column=Column(enum_type(DocumentKind), nullable=False))
    path: str  # Relative to data/; document contents are never stored here.
    created_at: datetime = Field(default_factory=utc_now, sa_type=UTCDateTime)

    applications: list["Application"] = Relationship(
        back_populates="resume_document", passive_deletes="all"
    )


class Application(Timestamped, table=True):
    id: int | None = Field(default=None, primary_key=True)
    job_id: int | None = Field(
        default=None, foreign_key="job.id", ondelete="CASCADE", nullable=False, unique=True
    )
    status: ApplicationStatus = Field(
        default=ApplicationStatus.SAVED,
        sa_column=Column(enum_type(ApplicationStatus), nullable=False),
    )
    resume_document_id: int | None = Field(
        default=None, foreign_key="document.id", ondelete="SET NULL", index=True
    )
    notes: str | None = None

    job: "Job" = Relationship(back_populates="application")
    resume_document: Document | None = Relationship(back_populates="applications")
    status_events: list["StatusEvent"] = Relationship(
        back_populates="application",
        passive_deletes="all",
        sa_relationship_kwargs={"order_by": "(StatusEvent.at, StatusEvent.id)"},
    )


class Job(Timestamped, table=True):
    id: int | None = Field(default=None, primary_key=True)
    company: str = ""
    title: str
    url: str
    source: str | None = None
    location: str | None = None
    description: str = ""
    ats_type: str | None = None

    application: Application | None = Relationship(back_populates="job", passive_deletes="all")


class StatusEvent(SQLModel, table=True):
    """History entries are appended by the status transition service (T-005)."""

    id: int | None = Field(default=None, primary_key=True)
    application_id: int | None = Field(
        default=None, foreign_key="application.id", ondelete="CASCADE", nullable=False, index=True
    )
    from_status: ApplicationStatus | None = Field(
        default=None, sa_column=Column(enum_type(ApplicationStatus), nullable=True)
    )
    to_status: ApplicationStatus = Field(
        sa_column=Column(enum_type(ApplicationStatus), nullable=False)
    )
    at: datetime = Field(default_factory=utc_now, sa_type=UTCDateTime)
    note: str | None = None

    application: Application = Relationship(back_populates="status_events")
