from typing import Annotated

from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.api.applications_schemas import (
    ApplicationResponse,
    StatusEventResponse,
    TransitionRequest,
)
from app.api.errors import CONFLICT, NOT_FOUND, http_error
from app.db import get_session
from app.services import applications

router = APIRouter(prefix="/applications", tags=["applications"])
SessionDep = Annotated[Session, Depends(get_session)]


@router.post(
    "/{application_id}/transition",
    response_model=ApplicationResponse,
    responses={**NOT_FOUND, **CONFLICT},
)
def transition(
    application_id: int, data: TransitionRequest, session: SessionDep
) -> ApplicationResponse:
    try:
        application = applications.transition(session, application_id, data.to_status, data.note)
    except applications.NotFoundError as error:
        raise http_error(404, str(error)) from error
    except applications.ConflictError as error:
        raise http_error(409, str(error)) from error
    return ApplicationResponse.model_validate(application)


@router.get(
    "/{application_id}/history", response_model=list[StatusEventResponse], responses={**NOT_FOUND}
)
def history(application_id: int, session: SessionDep) -> list[StatusEventResponse]:
    try:
        events = applications.history(session, application_id)
    except applications.NotFoundError as error:
        raise http_error(404, str(error)) from error
    return [StatusEventResponse.model_validate(event) for event in events]
