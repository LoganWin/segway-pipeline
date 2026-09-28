"""Job CRUD and atomic creation of a job's application and initial history."""

from fastapi import HTTPException
from sqlalchemy.orm import selectinload
from sqlmodel import Session, col, select

from app.api.jobs_schemas import JobWrite
from app.models import Application, ApplicationStatus, Job, StatusEvent


def get_job(session: Session, job_id: int) -> Job:
    job = session.get(Job, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    return job


def list_jobs(session: Session, status: ApplicationStatus | None, company: str | None) -> list[Job]:
    """Company is an exact match; status and company filters combine with AND."""
    statement = select(Job).options(selectinload(Job.application))  # pyright: ignore[reportArgumentType]
    if status is not None:
        statement = statement.join(Application).where(Application.status == status)
    if company is not None:
        statement = statement.where(Job.company == company)
    return list(session.exec(statement.order_by(col(Job.updated_at).desc(), col(Job.id).desc())))


def create_job(session: Session, data: JobWrite) -> Job:
    job = Job(**data.model_dump())
    application = Application(job=job)
    event = StatusEvent(application=application, to_status=ApplicationStatus.SAVED)
    session.add_all([job, application, event])
    session.commit()
    session.refresh(job)
    return job


def replace_job(session: Session, job_id: int, data: JobWrite) -> Job:
    job = get_job(session, job_id)
    job.sqlmodel_update(data.model_dump())
    session.add(job)
    session.commit()
    session.refresh(job)
    return job


def delete_job(session: Session, job_id: int) -> None:
    job = get_job(session, job_id)
    session.delete(job)
    session.commit()
