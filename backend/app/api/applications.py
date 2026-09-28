from typing import Annotated

from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.api.applications_schemas import (
    ApplicationResponse,
    StatusEventResponse,
    TransitionRequest,
)
from app.db import get_session
from app.services import applications

router = APIRouter(prefix="/applications", tags=["applications"])
SessionDep = Annotated[Session, Depends(get_session)]


@router.post("/{application_id}/transition", response_model=ApplicationResponse)
def transition(
    application_id: int, data: TransitionRequest, session: SessionDep
) -> ApplicationResponse:
    return ApplicationResponse.model_validate(
        applications.transition(session, application_id, data.to_status, data.note)
    )


@router.get("/{application_id}/history", response_model=list[StatusEventResponse])
def history(application_id: int, session: SessionDep) -> list[StatusEventResponse]:
    return [
        StatusEventResponse.model_validate(event)
        for event in applications.history(session, application_id)
    ]
