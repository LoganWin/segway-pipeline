"""Request/response models for the profile API, kept separate from the table models.

Requests are full replacements: the same model is used for create (POST) and update (PUT).
Timestamps in responses serialize as UTC ISO-8601 (``...Z``).
"""

from datetime import UTC, date, datetime
from typing import Annotated, Self

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    field_serializer,
    model_validator,
)

from app.models import ExperienceKind

NonEmptyStr = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class TimestampedResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    created_at: datetime
    updated_at: datetime

    @field_serializer("created_at", "updated_at")
    def serialize_utc(self, value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=UTC)
        return value.astimezone(UTC)


class ProfileRequest(BaseModel):
    name: NonEmptyStr
    email: NonEmptyStr
    phone: str | None = None
    location: str | None = None
    links: list[str] = Field(default_factory=list[str])
    work_authorization: str | None = None


class ProfileResponse(TimestampedResponse):
    name: str
    email: str
    phone: str | None
    location: str | None
    links: list[str]
    work_authorization: str | None


class ExperienceRequest(BaseModel):
    kind: ExperienceKind
    org: NonEmptyStr
    title: NonEmptyStr
    start_date: date | None = None
    end_date: date | None = None
    location: str | None = None

    @model_validator(mode="after")
    def end_not_before_start(self) -> Self:
        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValueError("end_date must not be before start_date")
        return self


class ExperienceResponse(TimestampedResponse):
    id: int
    kind: ExperienceKind
    org: str
    title: str
    start_date: date | None
    end_date: date | None
    location: str | None


class BulletRequest(BaseModel):
    """The owning experience comes from the path (`/experiences/{experience_id}/bullets`)."""

    text: NonEmptyStr
    metrics: str | None = None
    verified: bool = False
    skill_ids: list[int] = Field(
        default_factory=list[int], description="Replaces the bullet's linked skills."
    )


class BulletResponse(TimestampedResponse):
    id: int
    experience_id: int
    text: str
    metrics: str | None
    verified: bool
    skill_ids: list[int]


class SkillRequest(BaseModel):
    name: NonEmptyStr
    category: str | None = None
    proficiency: str | None = None


class SkillResponse(TimestampedResponse):
    id: int
    name: str
    category: str | None
    proficiency: str | None


class AnswerRequest(BaseModel):
    question_key: NonEmptyStr
    text: NonEmptyStr


class AnswerResponse(TimestampedResponse):
    id: int
    question_key: str
    text: str
