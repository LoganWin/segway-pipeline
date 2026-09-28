"""Job CRUD and atomic creation of a job's application and initial history."""

from dataclasses import asdict, dataclass

from sqlalchemy.orm import selectinload
from sqlmodel import Session, col, select

from app.models import Application, ApplicationStatus, Job, StatusEvent


class NotFoundError(Exception):
    """The requested job does not exist."""


@dataclass(frozen=True)
class JobData:
    title: str
    url: str
    company: str = ""
    description: str = ""
    source: str | None = None
    location: str | None = None
    ats_type: str | None = None


def get_job(session: Session, job_id: int) -> Job:
    job = session.get(Job, job_id)
    if job is None:
        raise NotFoundError(f"Job {job_id} not found")
    return job


def list_jobs(session: Session, status: ApplicationStatus | None, company: str | None) -> list[Job]:
    """Company is an exact match; status and company filters combine with AND."""
    statement = select(Job).options(selectinload(Job.application))  # pyright: ignore[reportArgumentType]
    if status is not None:
        statement = statement.join(Application).where(Application.status == status)
    if company is not None:
        statement = statement.where(Job.company == company)
    return list(session.exec(statement.order_by(col(Job.updated_at).desc(), col(Job.id).desc())))


def create_job(session: Session, data: JobData) -> Job:
    job = Job(**asdict(data))
    application = Application(job=job)
    event = StatusEvent(application=application, to_status=ApplicationStatus.SAVED)
    session.add_all([job, application, event])
    session.commit()
    session.refresh(job)
    return job


def replace_job(session: Session, job_id: int, data: JobData) -> Job:
    job = get_job(session, job_id)
    job.sqlmodel_update(asdict(data))
    session.add(job)
    session.commit()
    session.refresh(job)
    return job


def delete_job(session: Session, job_id: int) -> None:
    job = get_job(session, job_id)
    session.delete(job)
    session.commit()
