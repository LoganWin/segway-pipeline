"""Append-only application history and allowed transitions.

Current status     | Allowed next statuses
-------------------|-------------------------------------------------
saved              | preparing, rejected, withdrawn
preparing          | ready_for_review, rejected, withdrawn
ready_for_review   | applied, rejected, withdrawn
applied            | interviewing, rejected, withdrawn
interviewing       | offer, rejected, withdrawn
offer              | (terminal)
rejected           | (terminal)
withdrawn          | (terminal)

The initial saved event has no from_status. Every successful transition appends
one event atomically with the status update. Recording applied only tracks a
manually submitted application; this service never submits anything to an ATS.
"""

from fastapi import HTTPException
from sqlalchemy import update
from sqlmodel import Session, col, select

from app.models import Application, ApplicationStatus, Job, StatusEvent
from app.models.entities import utc_now

ALLOWED_TRANSITIONS: dict[ApplicationStatus, frozenset[ApplicationStatus]] = {
    ApplicationStatus.SAVED: frozenset(
        (ApplicationStatus.PREPARING, ApplicationStatus.REJECTED, ApplicationStatus.WITHDRAWN)
    ),
    ApplicationStatus.PREPARING: frozenset(
        (
            ApplicationStatus.READY_FOR_REVIEW,
            ApplicationStatus.REJECTED,
            ApplicationStatus.WITHDRAWN,
        )
    ),
    ApplicationStatus.READY_FOR_REVIEW: frozenset(
        (ApplicationStatus.APPLIED, ApplicationStatus.REJECTED, ApplicationStatus.WITHDRAWN)
    ),
    ApplicationStatus.APPLIED: frozenset(
        (ApplicationStatus.INTERVIEWING, ApplicationStatus.REJECTED, ApplicationStatus.WITHDRAWN)
    ),
    ApplicationStatus.INTERVIEWING: frozenset(
        (ApplicationStatus.OFFER, ApplicationStatus.REJECTED, ApplicationStatus.WITHDRAWN)
    ),
    ApplicationStatus.OFFER: frozenset(),
    ApplicationStatus.REJECTED: frozenset(),
    ApplicationStatus.WITHDRAWN: frozenset(),
}


def get_application(session: Session, application_id: int) -> Application:
    application = session.get(Application, application_id)
    if application is None:
        raise HTTPException(status_code=404, detail=f"Application {application_id} not found")
    return application


def transition(
    session: Session, application_id: int, to_status: ApplicationStatus, note: str | None
) -> Application:
    application = get_application(session, application_id)
    from_status = application.status
    allowed = ALLOWED_TRANSITIONS[from_status]
    if to_status not in allowed:
        choices = ", ".join(sorted(allowed)) or "none (terminal status)"
        raise HTTPException(
            status_code=409,
            detail=f"Cannot transition from {from_status} to {to_status}. Allowed: {choices}",
        )

    now = utc_now()
    # Compare-and-set prevents stale requests from writing inconsistent history.
    result = session.exec(
        update(Application)
        .where(col(Application.id) == application_id, col(Application.status) == from_status)
        .values(status=to_status, updated_at=now)
        .execution_options(synchronize_session=False)
    )
    if result.rowcount != 1:
        session.rollback()
        raise HTTPException(status_code=409, detail="Application status changed; reload and retry")
    session.exec(update(Job).where(col(Job.id) == application.job_id).values(updated_at=now))
    session.add(
        StatusEvent(
            application_id=application_id,
            from_status=from_status,
            to_status=to_status,
            at=now,
            note=note,
        )
    )
    session.commit()
    session.refresh(application)
    return application


def history(session: Session, application_id: int) -> list[StatusEvent]:
    get_application(session, application_id)
    return list(
        session.exec(
            select(StatusEvent)
            .where(StatusEvent.application_id == application_id)
            .order_by(col(StatusEvent.at), col(StatusEvent.id))
        )
    )
