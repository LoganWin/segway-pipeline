"""Application API contracts, separate from persistence models."""

from pydantic import AwareDatetime, BaseModel, ConfigDict, computed_field

from app.models import ApplicationStatus
from app.services.applications import ALLOWED_TRANSITIONS


class TransitionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    to_status: ApplicationStatus
    note: str | None = None


class ApplicationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    job_id: int
    status: ApplicationStatus
    resume_document_id: int | None
    notes: str | None
    created_at: AwareDatetime
    updated_at: AwareDatetime

    @computed_field
    @property
    def allowed_transitions(self) -> list[ApplicationStatus]:
        return sorted(ALLOWED_TRANSITIONS[self.status])


class StatusEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    application_id: int
    from_status: ApplicationStatus | None
    to_status: ApplicationStatus
    at: AwareDatetime
    note: str | None
