from datetime import UTC, datetime, timedelta, timezone

import pytest
from sqlalchemy import Engine, text
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.models import (
    Answer,
    Application,
    ApplicationStatus,
    Bullet,
    BulletSkill,
    Document,
    DocumentKind,
    Experience,
    ExperienceKind,
    Job,
    Profile,
    Skill,
    StatusEvent,
)


def make_job() -> Job:
    return Job(
        company="Example Widgets",
        title="Engineer",
        url="https://example.com/jobs/1",
        description="Build fictional widgets.",
    )


def test_job_can_be_created_from_url_and_title(session: Session) -> None:
    job = Job(url="https://example.com/jobs/2", title="Widget engineer")
    session.add(job)
    session.commit()
    session.refresh(job)
    assert job.company == ""
    assert job.description == ""


@pytest.mark.parametrize("tz", [UTC, timezone(timedelta(hours=-5)), None])
def test_timestamps_reload_as_utc(session: Session, tz: timezone | None) -> None:
    timestamp = datetime(2026, 1, 2, 12, 30, tzinfo=tz)
    expected = timestamp.replace(tzinfo=UTC) if tz is None else timestamp.astimezone(UTC)
    job = Job(url="https://example.com/jobs/3", title="Engineer", created_at=timestamp)
    document = Document(kind=DocumentKind.RESUME, path="out/example.pdf", created_at=timestamp)
    event = StatusEvent(to_status=ApplicationStatus.SAVED, at=timestamp)
    application = Application(job=job, resume_document=document, status_events=[event])
    session.add(application)
    session.commit()
    session.expire_all()
    for reloaded in (job.created_at, document.created_at, event.at):
        assert reloaded.tzinfo is UTC
        assert reloaded == expected
    assert job.updated_at.tzinfo is UTC
    assert application.created_at.tzinfo is UTC
    stored = session.connection().execute(text("SELECT created_at FROM job")).scalar_one()
    assert datetime.fromisoformat(stored) == expected.replace(tzinfo=None)


def test_profile_answers_and_timestamps(session: Session) -> None:
    profile = Profile(
        name="Alex Example",
        email="alex@example.com",
        links=["https://example.com"],
        work_authorization="Example authorization",
        updated_at=datetime(2000, 1, 1, tzinfo=UTC),
    )
    answer = Answer(question_key="motivation", text="I enjoy fictional widgets.")
    session.add_all([profile, answer])
    session.commit()
    session.expire_all()
    assert profile.links == ["https://example.com"]
    assert answer.text == "I enjoy fictional widgets."
    created_at = profile.created_at
    profile.location = "Example City"
    session.commit()
    session.refresh(profile)
    assert profile.updated_at > datetime(2000, 1, 1, tzinfo=UTC)
    assert profile.created_at == created_at
    with pytest.raises(IntegrityError):
        session.add(Profile(id=2, name="Sam Sample", email="sam@example.com"))
        session.commit()


def test_experience_bullet_skill_relationships(session: Session) -> None:
    experience = Experience(kind=ExperienceKind.PROJECT, org="Example Lab", title="Widget study")
    skill = Skill(name="Python", category="Language", proficiency="Advanced")
    bullet = Bullet(text="Built 3 fictional widgets.", metrics="3 widgets", verified=True)
    bullet.skills.append(skill)
    experience.bullets.append(bullet)
    session.add(experience)
    session.commit()
    session.expire_all()
    assert experience.kind is ExperienceKind.PROJECT
    assert experience.bullets == [bullet]
    assert bullet.experience == experience
    assert bullet.skills == [skill]
    assert skill.bullets == [bullet]
    assert bullet.metrics == "3 widgets"
    assert bullet.verified

    session.delete(experience)
    session.commit()
    assert session.exec(select(Bullet)).all() == []
    assert session.exec(select(BulletSkill)).all() == []
    assert session.exec(select(Skill)).all() == [skill]


def test_deleting_shared_skill_preserves_bullets(session: Session) -> None:
    experience = Experience(kind=ExperienceKind.JOB, org="Example Lab", title="Widget tester")
    skill = Skill(name="Widget testing")
    experience.bullets = [Bullet(text="Tested widgets."), Bullet(text="Checked widgets.")]
    for bullet in experience.bullets:
        bullet.skills.append(skill)
    session.add(experience)
    session.commit()
    session.delete(skill)
    session.commit()
    assert len(session.exec(select(Bullet)).all()) == 2
    assert session.exec(select(BulletSkill)).all() == []


def test_job_application_document_and_history(session: Session) -> None:
    job = make_job()
    document = Document(kind=DocumentKind.RESUME, path="out/example-resume.pdf")
    application = Application(job=job, resume_document=document)
    application.status_events = [
        StatusEvent(
            to_status=ApplicationStatus.PREPARING,
            from_status=ApplicationStatus.SAVED,
            at=datetime(2026, 1, 2, tzinfo=UTC),
        ),
        StatusEvent(to_status=ApplicationStatus.SAVED, at=datetime(2026, 1, 1, tzinfo=UTC)),
    ]
    session.add(application)
    session.commit()
    session.expire_all()
    assert job.application == application
    assert application.job == job
    assert application.status is ApplicationStatus.SAVED
    assert document.applications == [application]
    assert document.kind is DocumentKind.RESUME
    assert [event.to_status for event in application.status_events] == [
        ApplicationStatus.SAVED,
        ApplicationStatus.PREPARING,
    ]
    assert application.status_events[0].from_status is None
    assert application.status_events[0].application == application

    session.delete(document)
    session.commit()
    session.refresh(application)
    assert application.resume_document_id is None
    assert application.resume_document is None
    session.delete(job)
    session.commit()
    assert session.exec(select(Application)).all() == []
    assert session.exec(select(StatusEvent)).all() == []


def test_one_application_per_job(session: Session) -> None:
    job = make_job()
    session.add(Application(job=job))
    session.commit()
    with pytest.raises(IntegrityError):
        session.add(Application(job_id=job.id))
        session.commit()


def test_foreign_keys_enforced_on_every_connection(engine: Engine) -> None:
    with engine.connect() as first, engine.connect() as second:
        for connection in (first, second):
            assert connection.execute(text("PRAGMA foreign_keys")).scalar_one() == 1
    with Session(engine) as session, pytest.raises(IntegrityError):
        session.add(Application(job_id=999))
        session.commit()


def test_database_cascades_without_orm(session: Session) -> None:
    application = Application(job=make_job())
    document = Document(kind=DocumentKind.RESUME, path="out/example.pdf")
    application.resume_document = document
    application.status_events.append(StatusEvent(to_status=ApplicationStatus.SAVED))
    session.add(application)
    session.commit()
    session.connection().execute(text("DELETE FROM job"))
    session.commit()
    assert session.exec(select(Application)).all() == []
    assert session.exec(select(StatusEvent)).all() == []
    assert session.exec(select(Document)).all() == [document]


def test_application_status_values() -> None:
    assert [status.value for status in ApplicationStatus] == [
        "saved",
        "preparing",
        "ready_for_review",
        "applied",
        "interviewing",
        "offer",
        "rejected",
        "withdrawn",
    ]
    with pytest.raises(ValueError):
        ApplicationStatus("submitted")


@pytest.mark.parametrize("status", list(ApplicationStatus))
def test_status_round_trip(session: Session, status: ApplicationStatus) -> None:
    application = Application(job=make_job(), status=status)
    application.status_events.append(StatusEvent(from_status=status, to_status=status))
    session.add(application)
    session.commit()
    session.expire_all()
    assert application.status is status
    assert application.status_events[0].from_status is status
    assert application.status_events[0].to_status is status
    assert (
        session.connection().execute(text("SELECT status FROM application")).scalar_one()
        == status.value
    )


@pytest.mark.parametrize(
    "table,column",
    [
        ("application", "status"),
        ("statusevent", "from_status"),
        ("statusevent", "to_status"),
    ],
)
def test_status_check_constraints(session: Session, table: str, column: str) -> None:
    application = Application(job=make_job())
    application.status_events.append(StatusEvent(to_status=ApplicationStatus.SAVED))
    session.add(application)
    session.commit()
    with pytest.raises(IntegrityError):
        session.connection().execute(text(f"UPDATE {table} SET {column} = 'submitted'"))


@pytest.mark.parametrize("kind", list(ExperienceKind))
def test_experience_kinds(session: Session, kind: ExperienceKind) -> None:
    experience = Experience(kind=kind, org="Example Institute", title="Example role")
    session.add(experience)
    session.commit()
    session.refresh(experience)
    assert experience.kind is kind


@pytest.mark.parametrize("kind", list(DocumentKind))
def test_document_kinds(session: Session, kind: DocumentKind) -> None:
    document = Document(kind=kind, path="out/example.txt")
    session.add(document)
    session.commit()
    session.refresh(document)
    assert document.kind is kind
