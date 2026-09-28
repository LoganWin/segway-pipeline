"""Thin routes for the profile, experiences, bullets, skills, and answers.

`GET /profile` returns 404 until the profile has been saved once with `PUT /profile`.
"""

from collections.abc import Generator
from contextlib import contextmanager
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from app.api.profile_schemas import (
    AnswerRequest,
    AnswerResponse,
    BulletRequest,
    BulletResponse,
    ExperienceRequest,
    ExperienceResponse,
    ProfileRequest,
    ProfileResponse,
    SkillRequest,
    SkillResponse,
)
from app.db import get_session
from app.models import Bullet
from app.services import profile as service

SessionDep = Annotated[Session, Depends(get_session)]
Responses = dict[int | str, dict[str, Any]]
NOT_FOUND: Responses = {404: {"description": "Not found"}}


@contextmanager
def service_errors() -> Generator[None]:
    try:
        yield
    except service.ServiceError as error:
        raise HTTPException(status_code=error.status_code, detail=str(error)) from error


def bullet_response(bullet: Bullet) -> BulletResponse:
    return BulletResponse(
        id=bullet.id or 0,
        experience_id=bullet.experience_id or 0,
        text=bullet.text,
        metrics=bullet.metrics,
        verified=bullet.verified,
        skill_ids=sorted(skill.id for skill in bullet.skills if skill.id is not None),
        created_at=bullet.created_at,
        updated_at=bullet.updated_at,
    )


profile_router = APIRouter(prefix="/profile", tags=["profile"])


@profile_router.get("", responses=NOT_FOUND)
def get_profile(session: SessionDep) -> ProfileResponse:
    with service_errors():
        return ProfileResponse.model_validate(service.get_profile(session))


@profile_router.put("")
def put_profile(data: ProfileRequest, session: SessionDep) -> ProfileResponse:
    return ProfileResponse.model_validate(service.put_profile(session, data))


experiences_router = APIRouter(prefix="/experiences", tags=["experiences"])


@experiences_router.get("")
def list_experiences(session: SessionDep) -> list[ExperienceResponse]:
    return [ExperienceResponse.model_validate(e) for e in service.list_experiences(session)]


@experiences_router.post("", status_code=status.HTTP_201_CREATED)
def create_experience(data: ExperienceRequest, session: SessionDep) -> ExperienceResponse:
    return ExperienceResponse.model_validate(service.create_experience(session, data))


@experiences_router.get("/{experience_id}", responses=NOT_FOUND)
def get_experience(experience_id: int, session: SessionDep) -> ExperienceResponse:
    with service_errors():
        return ExperienceResponse.model_validate(service.get_experience(session, experience_id))


@experiences_router.put("/{experience_id}", responses=NOT_FOUND)
def update_experience(
    experience_id: int, data: ExperienceRequest, session: SessionDep
) -> ExperienceResponse:
    with service_errors():
        experience = service.update_experience(session, experience_id, data)
        return ExperienceResponse.model_validate(experience)


@experiences_router.delete(
    "/{experience_id}", status_code=status.HTTP_204_NO_CONTENT, responses=NOT_FOUND
)
def delete_experience(experience_id: int, session: SessionDep) -> None:
    with service_errors():
        service.delete_experience(session, experience_id)


@experiences_router.get("/{experience_id}/bullets", responses=NOT_FOUND)
def list_bullets(experience_id: int, session: SessionDep) -> list[BulletResponse]:
    with service_errors():
        return [bullet_response(b) for b in service.list_bullets(session, experience_id)]


@experiences_router.post(
    "/{experience_id}/bullets",
    status_code=status.HTTP_201_CREATED,
    responses=NOT_FOUND,
)
def create_bullet(experience_id: int, data: BulletRequest, session: SessionDep) -> BulletResponse:
    with service_errors():
        return bullet_response(service.create_bullet(session, experience_id, data))


@experiences_router.get("/{experience_id}/bullets/{bullet_id}", responses=NOT_FOUND)
def get_bullet(experience_id: int, bullet_id: int, session: SessionDep) -> BulletResponse:
    with service_errors():
        return bullet_response(service.get_bullet(session, experience_id, bullet_id))


@experiences_router.put("/{experience_id}/bullets/{bullet_id}", responses=NOT_FOUND)
def update_bullet(
    experience_id: int, bullet_id: int, data: BulletRequest, session: SessionDep
) -> BulletResponse:
    with service_errors():
        return bullet_response(service.update_bullet(session, experience_id, bullet_id, data))


@experiences_router.delete(
    "/{experience_id}/bullets/{bullet_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses=NOT_FOUND,
)
def delete_bullet(experience_id: int, bullet_id: int, session: SessionDep) -> None:
    with service_errors():
        service.delete_bullet(session, experience_id, bullet_id)


skills_router = APIRouter(prefix="/skills", tags=["skills"])
CONFLICT: Responses = {409: {"description": "Name already in use"}}


@skills_router.get("")
def list_skills(session: SessionDep) -> list[SkillResponse]:
    return [SkillResponse.model_validate(s) for s in service.list_skills(session)]


@skills_router.post("", status_code=status.HTTP_201_CREATED, responses=CONFLICT)
def create_skill(data: SkillRequest, session: SessionDep) -> SkillResponse:
    with service_errors():
        return SkillResponse.model_validate(service.create_skill(session, data))


@skills_router.get("/{skill_id}", responses=NOT_FOUND)
def get_skill(skill_id: int, session: SessionDep) -> SkillResponse:
    with service_errors():
        return SkillResponse.model_validate(service.get_skill(session, skill_id))


@skills_router.put("/{skill_id}", responses={**NOT_FOUND, **CONFLICT})
def update_skill(skill_id: int, data: SkillRequest, session: SessionDep) -> SkillResponse:
    with service_errors():
        return SkillResponse.model_validate(service.update_skill(session, skill_id, data))


@skills_router.delete("/{skill_id}", status_code=status.HTTP_204_NO_CONTENT, responses=NOT_FOUND)
def delete_skill(skill_id: int, session: SessionDep) -> None:
    with service_errors():
        service.delete_skill(session, skill_id)


answers_router = APIRouter(prefix="/answers", tags=["answers"])


@answers_router.get("")
def list_answers(session: SessionDep) -> list[AnswerResponse]:
    return [AnswerResponse.model_validate(a) for a in service.list_answers(session)]


@answers_router.post("", status_code=status.HTTP_201_CREATED, responses=CONFLICT)
def create_answer(data: AnswerRequest, session: SessionDep) -> AnswerResponse:
    with service_errors():
        return AnswerResponse.model_validate(service.create_answer(session, data))


@answers_router.get("/{answer_id}", responses=NOT_FOUND)
def get_answer(answer_id: int, session: SessionDep) -> AnswerResponse:
    with service_errors():
        return AnswerResponse.model_validate(service.get_answer(session, answer_id))


@answers_router.put("/{answer_id}", responses={**NOT_FOUND, **CONFLICT})
def update_answer(answer_id: int, data: AnswerRequest, session: SessionDep) -> AnswerResponse:
    with service_errors():
        return AnswerResponse.model_validate(service.update_answer(session, answer_id, data))


@answers_router.delete("/{answer_id}", status_code=status.HTTP_204_NO_CONTENT, responses=NOT_FOUND)
def delete_answer(answer_id: int, session: SessionDep) -> None:
    with service_errors():
        service.delete_answer(session, answer_id)


router = APIRouter()
for _router in (profile_router, experiences_router, skills_router, answers_router):
    router.include_router(_router)
