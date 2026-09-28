"""Business logic for the profile, experiences, bullets, skills, and reusable answers."""

from collections.abc import Sequence

from sqlmodel import Session, col, select

from app.api.profile_schemas import (
    AnswerRequest,
    BulletRequest,
    ExperienceRequest,
    ProfileRequest,
    SkillRequest,
)
from app.models import Answer, Bullet, Experience, Profile, Skill

PROFILE_ID = 1


class ServiceError(Exception):
    status_code = 400


class NotFoundError(ServiceError):
    status_code = 404


class ConflictError(ServiceError):
    status_code = 409


class InvalidReferenceError(ServiceError):
    status_code = 422


def _save[T: (Profile, Experience, Bullet, Skill, Answer)](session: Session, record: T) -> T:
    session.add(record)
    session.commit()
    session.refresh(record)
    return record


# Profile (single row)


def get_profile(session: Session) -> Profile:
    profile = session.get(Profile, PROFILE_ID)
    if profile is None:
        raise NotFoundError("Profile has not been saved yet")
    return profile


def put_profile(session: Session, data: ProfileRequest) -> Profile:
    profile = session.get(Profile, PROFILE_ID)
    if profile is None:
        profile = Profile(id=PROFILE_ID, **data.model_dump())
    else:
        profile.sqlmodel_update(data.model_dump())
    return _save(session, profile)


# Experiences


def list_experiences(session: Session) -> Sequence[Experience]:
    return session.exec(select(Experience).order_by(col(Experience.id))).all()


def get_experience(session: Session, experience_id: int) -> Experience:
    experience = session.get(Experience, experience_id)
    if experience is None:
        raise NotFoundError(f"Experience {experience_id} not found")
    return experience


def create_experience(session: Session, data: ExperienceRequest) -> Experience:
    return _save(session, Experience(**data.model_dump()))


def update_experience(session: Session, experience_id: int, data: ExperienceRequest) -> Experience:
    experience = get_experience(session, experience_id)
    experience.sqlmodel_update(data.model_dump())
    return _save(session, experience)


def delete_experience(session: Session, experience_id: int) -> None:
    """Bullets and their skill links are removed by the database's ON DELETE CASCADE."""
    session.delete(get_experience(session, experience_id))
    session.commit()


# Bullets (nested under an experience)


def _resolve_skills(session: Session, skill_ids: list[int]) -> list[Skill]:
    wanted = list(dict.fromkeys(skill_ids))
    if not wanted:
        return []
    found = session.exec(select(Skill).where(col(Skill.id).in_(wanted))).all()
    missing = sorted(set(wanted) - {skill.id for skill in found})
    if missing:
        raise InvalidReferenceError(f"Unknown skill ids: {missing}")
    return list(found)


def list_bullets(session: Session, experience_id: int) -> Sequence[Bullet]:
    get_experience(session, experience_id)
    statement = select(Bullet).where(Bullet.experience_id == experience_id).order_by(col(Bullet.id))
    return session.exec(statement).all()


def get_bullet(session: Session, experience_id: int, bullet_id: int) -> Bullet:
    get_experience(session, experience_id)
    bullet = session.get(Bullet, bullet_id)
    if bullet is None or bullet.experience_id != experience_id:
        raise NotFoundError(f"Bullet {bullet_id} not found in experience {experience_id}")
    return bullet


def create_bullet(session: Session, experience_id: int, data: BulletRequest) -> Bullet:
    get_experience(session, experience_id)
    skills = _resolve_skills(session, data.skill_ids)
    bullet = Bullet(experience_id=experience_id, **data.model_dump(exclude={"skill_ids"}))
    bullet.skills = skills
    return _save(session, bullet)


def update_bullet(
    session: Session, experience_id: int, bullet_id: int, data: BulletRequest
) -> Bullet:
    bullet = get_bullet(session, experience_id, bullet_id)
    skills = _resolve_skills(session, data.skill_ids)
    bullet.sqlmodel_update(data.model_dump(exclude={"skill_ids"}))
    bullet.skills = skills
    return _save(session, bullet)


def delete_bullet(session: Session, experience_id: int, bullet_id: int) -> None:
    session.delete(get_bullet(session, experience_id, bullet_id))
    session.commit()


# Skills


def list_skills(session: Session) -> Sequence[Skill]:
    return session.exec(select(Skill).order_by(col(Skill.id))).all()


def get_skill(session: Session, skill_id: int) -> Skill:
    skill = session.get(Skill, skill_id)
    if skill is None:
        raise NotFoundError(f"Skill {skill_id} not found")
    return skill


def _ensure_skill_name_free(session: Session, name: str, skill_id: int | None = None) -> None:
    existing = session.exec(select(Skill).where(Skill.name == name)).first()
    if existing is not None and existing.id != skill_id:
        raise ConflictError(f"Skill {name!r} already exists")


def create_skill(session: Session, data: SkillRequest) -> Skill:
    _ensure_skill_name_free(session, data.name)
    return _save(session, Skill(**data.model_dump()))


def update_skill(session: Session, skill_id: int, data: SkillRequest) -> Skill:
    skill = get_skill(session, skill_id)
    _ensure_skill_name_free(session, data.name, skill_id)
    skill.sqlmodel_update(data.model_dump())
    return _save(session, skill)


def delete_skill(session: Session, skill_id: int) -> None:
    """Removes the skill's bullet links; the bullets themselves are kept."""
    session.delete(get_skill(session, skill_id))
    session.commit()


# Answers


def list_answers(session: Session) -> Sequence[Answer]:
    return session.exec(select(Answer).order_by(col(Answer.id))).all()


def get_answer(session: Session, answer_id: int) -> Answer:
    answer = session.get(Answer, answer_id)
    if answer is None:
        raise NotFoundError(f"Answer {answer_id} not found")
    return answer


def _ensure_question_key_free(
    session: Session, question_key: str, answer_id: int | None = None
) -> None:
    existing = session.exec(select(Answer).where(Answer.question_key == question_key)).first()
    if existing is not None and existing.id != answer_id:
        raise ConflictError(f"Answer for {question_key!r} already exists")


def create_answer(session: Session, data: AnswerRequest) -> Answer:
    _ensure_question_key_free(session, data.question_key)
    return _save(session, Answer(**data.model_dump()))


def update_answer(session: Session, answer_id: int, data: AnswerRequest) -> Answer:
    answer = get_answer(session, answer_id)
    _ensure_question_key_free(session, data.question_key, answer_id)
    answer.sqlmodel_update(data.model_dump())
    return _save(session, answer)


def delete_answer(session: Session, answer_id: int) -> None:
    session.delete(get_answer(session, answer_id))
    session.commit()
