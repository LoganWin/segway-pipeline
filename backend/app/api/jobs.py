from typing import Annotated

from fastapi import APIRouter, Depends, Response
from sqlmodel import Session

from app.api.jobs_schemas import JobResponse, JobWrite
from app.db import get_session
from app.models import ApplicationStatus
from app.services import jobs

router = APIRouter(prefix="/jobs", tags=["jobs"])
SessionDep = Annotated[Session, Depends(get_session)]


@router.get("", response_model=list[JobResponse])
def list_jobs(
    session: SessionDep, status: ApplicationStatus | None = None, company: str | None = None
) -> list[JobResponse]:
    """List jobs newest-updated first; company is exact and filters combine with AND."""
    return [JobResponse.model_validate(job) for job in jobs.list_jobs(session, status, company)]


@router.post("", response_model=JobResponse, status_code=201)
def create_job(data: JobWrite, session: SessionDep) -> JobResponse:
    return JobResponse.model_validate(jobs.create_job(session, data))


@router.get("/{job_id}", response_model=JobResponse)
def get_job(job_id: int, session: SessionDep) -> JobResponse:
    return JobResponse.model_validate(jobs.get_job(session, job_id))


@router.put("/{job_id}", response_model=JobResponse)
def replace_job(job_id: int, data: JobWrite, session: SessionDep) -> JobResponse:
    """Replace job fields; omitted optional fields reset to their defaults."""
    return JobResponse.model_validate(jobs.replace_job(session, job_id, data))


@router.delete("/{job_id}", status_code=204)
def delete_job(job_id: int, session: SessionDep) -> Response:
    jobs.delete_job(session, job_id)
    return Response(status_code=204)
