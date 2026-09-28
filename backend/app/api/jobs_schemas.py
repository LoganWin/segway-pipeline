"""Job write and read contracts; application state changes only via transitions."""

from typing import Annotated

from pydantic import AwareDatetime, BaseModel, ConfigDict, StringConstraints

from app.api.applications_schemas import ApplicationResponse

NonEmptyString = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class JobWrite(BaseModel):
    """Create or replace job fields. URL and title are the minimum required data."""

    model_config = ConfigDict(extra="forbid")

    title: NonEmptyString
    url: NonEmptyString
    company: str = ""
    description: str = ""
    source: str | None = None
    location: str | None = None
    ats_type: str | None = None


class JobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    url: str
    company: str
    description: str
    source: str | None
    location: str | None
    ats_type: str | None
    created_at: AwareDatetime
    updated_at: AwareDatetime
    application: ApplicationResponse
