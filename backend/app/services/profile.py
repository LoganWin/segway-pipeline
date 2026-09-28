"""Business logic for the profile, experiences, bullets, skills, and reusable answers.

Writes take this module's frozen dataclasses (full replacements, like the API's requests), and
failures raise the domain exceptions below; the route layer maps them to HTTP errors.
"""

from collections.abc import Sequence
from dataclasses import asdict, dataclass, field
from datetime import date

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload
from sqlmodel import Session, col, select

from app.models import Answer, Bullet, Experience, ExperienceKind, Profile, Skill
from app.models.entities import utc_now

PROFILE_ID = 1


class NotFoundError(Exception):
    """The requested profile record does not exist."""


class ConflictError(Exception):
    """The write would duplicate a unique skill name or answer question key."""


class InvalidReferenceError(Exception):
    """Field `field` of the written data refers to records that don't exist."""

    def __init__(self, message: str, field: str, value: object) -> None:
        super().__init__(message)
        self.field = field
        self.value = value


@dataclass(frozen=True)
class ProfileData:
    name: str
    email: str
    phone: str | None = None
    location: str | None = None
    links: list[str] = field(default_factory=list[str])
    work_authorization: str | None = None


@dataclass(frozen=True)
class ExperienceData:
    kind: ExperienceKind
    org: str
    title: str
    start_date: date | None = None
    end_date: date | None = None
    location: str | None = None


@dataclass(frozen=True)
class BulletData:
    """`skill_ids` replaces the bullet's linked skills."""

    text: str
    metrics: str | None = None
    verified: bool = False
    skill_ids: list[int] = field(default_factory=list[int])


@dataclass(frozen=True)
class SkillData:
    name: str
    category: str | None = None
    proficiency: str | None = None


@dataclass(frozen=True)
class AnswerData:
    question_key: str
    text: str


def _bullet_fields(data: BulletData) -> dict[str, object]:
    return {"text": data.text, "metrics": data.metrics, "verified": data.verified}


def _save[T: (Profile, Experience, Bullet, Skill, Answer)](
    session: Session, record: T, conflict: str | None = None
) -> T:
    """Commit `record`. With `conflict`, a unique-constraint race becomes a ConflictError."""
    session.add(record)
    try:
        session.commit()
    except IntegrityError as error:
        session.rollback()
        if conflict is None:
            raise
        raise ConflictError(conflict) from error
    session.refresh(record)
    return record


# Profile (single row)


def get_profile(session: Session) -> Profile:
    profile = session.get(Profile, PROFILE_ID)
    if profile is None:
        raise NotFoundError("Profile has not been saved yet")
    return profile


def put_profile(session: Session, data: ProfileData) -> Profile:
    profile = session.get(Profile, PROFILE_ID)
    if profile is None:
        profile = Profile(id=PROFILE_ID, **asdict(data))
    else:
        profile.sqlmodel_update(asdict(data))
    return _save(session, profile)


# Experiences


def list_experiences(session: Session) -> Sequence[Experience]:
    return session.exec(select(Experience).order_by(col(Experience.id))).all()


def get_experience(session: Session, experience_id: int) -> Experience:
    experience = session.get(Experience, experience_id)
    if experience is None:
        raise NotFoundError(f"Experience {experience_id} not found")
    return experience


def create_experience(session: Session, data: ExperienceData) -> Experience:
    return _save(session, Experience(**asdict(data)))


def update_experience(session: Session, experience_id: int, data: ExperienceData) -> Experience:
    experience = get_experience(session, experience_id)
    experience.sqlmodel_update(asdict(data))
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
        raise InvalidReferenceError(f"Unknown skill ids: {missing}", "skill_ids", skill_ids)
    return list(found)


def list_bullets(session: Session, experience_id: int) -> Sequence[Bullet]:
    get_experience(session, experience_id)
    statement = (
        select(Bullet)
        .where(Bullet.experience_id == experience_id)
        .options(selectinload(Bullet.skills))  # pyright: ignore[reportArgumentType]
        .order_by(col(Bullet.id))
    )
    return session.exec(statement).all()


def get_bullet(session: Session, experience_id: int, bullet_id: int) -> Bullet:
    get_experience(session, experience_id)
    bullet = session.get(Bullet, bullet_id)
    if bullet is None or bullet.experience_id != experience_id:
        raise NotFoundError(f"Bullet {bullet_id} not found in experience {experience_id}")
    return bullet


def create_bullet(session: Session, experience_id: int, data: BulletData) -> Bullet:
    get_experience(session, experience_id)
    skills = _resolve_skills(session, data.skill_ids)
    bullet = Bullet(
        experience_id=experience_id, text=data.text, metrics=data.metrics, verified=data.verified
    )
    bullet.skills = skills
    return _save(session, bullet)


def update_bullet(session: Session, experience_id: int, bullet_id: int, data: BulletData) -> Bullet:
    bullet = get_bullet(session, experience_id, bullet_id)
    skills = _resolve_skills(session, data.skill_ids)
    bullet.sqlmodel_update(_bullet_fields(data))
    bullet.skills = skills
    # Link-table changes don't touch the bullet row, so onupdate wouldn't fire for them.
    bullet.updated_at = utc_now()
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
        raise ConflictError(_skill_conflict(name))


def _skill_conflict(name: str) -> str:
    return f"Skill {name!r} already exists"


def create_skill(session: Session, data: SkillData) -> Skill:
    _ensure_skill_name_free(session, data.name)
    return _save(session, Skill(**asdict(data)), _skill_conflict(data.name))


def update_skill(session: Session, skill_id: int, data: SkillData) -> Skill:
    skill = get_skill(session, skill_id)
    _ensure_skill_name_free(session, data.name, skill_id)
    skill.sqlmodel_update(asdict(data))
    return _save(session, skill, _skill_conflict(data.name))


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
        raise ConflictError(_answer_conflict(question_key))


def _answer_conflict(question_key: str) -> str:
    return f"Answer for {question_key!r} already exists"


def create_answer(session: Session, data: AnswerData) -> Answer:
    _ensure_question_key_free(session, data.question_key)
    return _save(session, Answer(**asdict(data)), _answer_conflict(data.question_key))


def update_answer(session: Session, answer_id: int, data: AnswerData) -> Answer:
    answer = get_answer(session, answer_id)
    _ensure_question_key_free(session, data.question_key, answer_id)
    answer.sqlmodel_update(asdict(data))
    return _save(session, answer, _answer_conflict(data.question_key))


def delete_answer(session: Session, answer_id: int) -> None:
    session.delete(get_answer(session, answer_id))
    session.commit()
