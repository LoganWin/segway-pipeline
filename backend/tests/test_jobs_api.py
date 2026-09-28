from collections.abc import Iterator
from datetime import UTC, datetime

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import Engine
from sqlmodel import Session, select

from app.db import get_session
from app.main import create_app
from app.models import Application, ApplicationStatus, Job, StatusEvent
from app.services.applications import transition


@pytest.fixture
def client(engine: Engine) -> Iterator[TestClient]:
    app = create_app()

    def test_session() -> Iterator[Session]:
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_session] = test_session
    with TestClient(app) as client:
        yield client


def create_job(client: TestClient, company: str = "Example Widgets") -> int:
    response = client.post(
        "/api/jobs",
        json={"title": "Test Engineer", "url": "https://example.test/jobs/1", "company": company},
    )
    assert response.status_code == 201
    return int(response.json()["id"])


def application_id(client: TestClient, job_id: int) -> int:
    return int(client.get(f"/api/jobs/{job_id}").json()["application"]["id"])


def assert_utc(value: str) -> None:
    assert value.endswith("Z") or value.endswith("+00:00")
    assert datetime.fromisoformat(value).tzinfo == UTC


def test_minimal_create_and_initial_history(client: TestClient, session: Session) -> None:
    response = client.post(
        "/api/jobs", json={"title": "Test Engineer", "url": "https://example.test/jobs/1"}
    )
    assert response.status_code == 201
    job = response.json()
    assert job["company"] == job["description"] == ""
    assert job["source"] is job["location"] is job["ats_type"] is None
    application = job["application"]
    assert application["job_id"] == job["id"]
    assert application["status"] == "saved"
    for record in (job, application):
        assert_utc(record["created_at"])
        assert_utc(record["updated_at"])
    history = client.get(f"/api/applications/{application['id']}/history")
    assert history.status_code == 200
    events = history.json()
    assert len(events) == 1
    assert events[0]["application_id"] == application["id"]
    assert events[0]["from_status"] is None
    assert events[0]["to_status"] == "saved"
    assert events[0]["note"] is None
    assert_utc(events[0]["at"])
    assert len(session.exec(select(Job)).all()) == 1
    assert len(session.exec(select(Application)).all()) == 1
    assert len(session.exec(select(StatusEvent)).all()) == 1


def test_job_crud_preserves_application_and_cascades_delete(
    client: TestClient, session: Session
) -> None:
    job_id = create_job(client)
    original = client.get(f"/api/jobs/{job_id}").json()
    app_id = original["application"]["id"]
    assert (
        client.post(
            f"/api/applications/{app_id}/transition", json={"to_status": "preparing"}
        ).status_code
        == 200
    )
    fields = {
        "title": "Senior Test Engineer",
        "url": "https://example.test/jobs/2",
        "company": "Fictional Tools",
        "description": "Build fictional widgets.",
        "source": "manual",
        "location": "Remote",
        "ats_type": "greenhouse",
    }
    response = client.put(f"/api/jobs/{job_id}", json=fields)
    assert response.status_code == 200
    updated = response.json()
    for key, value in fields.items():
        assert updated[key] == value
    assert updated["created_at"] == original["created_at"]
    assert updated["updated_at"] > original["updated_at"]
    assert updated["application"]["id"] == app_id
    assert updated["application"]["status"] == "preparing"
    assert client.get(f"/api/jobs/{job_id}").json() == updated
    replacement = client.put(
        f"/api/jobs/{job_id}", json={"title": "Replacement", "url": fields["url"]}
    )
    assert replacement.status_code == 200
    assert replacement.json()["description"] == ""
    assert replacement.json()["location"] is None
    deleted = client.delete(f"/api/jobs/{job_id}")
    assert deleted.status_code == 204
    assert deleted.content == b""
    assert client.get(f"/api/jobs/{job_id}").status_code == 404
    assert client.get(f"/api/applications/{app_id}/history").status_code == 404
    assert session.exec(select(Job)).all() == []
    assert session.exec(select(Application)).all() == []
    assert session.exec(select(StatusEvent)).all() == []


def test_filters_combine_and_sort_by_last_update(client: TestClient) -> None:
    assert client.get("/api/jobs").json() == []
    first = create_job(client)
    second = create_job(client, "Fictional Tools")
    third = create_job(client)
    app_id = application_id(client, first)
    assert (
        client.post(
            f"/api/applications/{app_id}/transition", json={"to_status": "preparing"}
        ).status_code
        == 200
    )
    jobs = client.get("/api/jobs").json()
    assert [job["id"] for job in jobs] == [first, third, second]
    preparing = client.get("/api/jobs", params={"status": "preparing"}).json()
    assert [job["id"] for job in preparing] == [first]
    company = client.get("/api/jobs", params={"company": "Example Widgets"}).json()
    assert [job["id"] for job in company] == [first, third]
    both = client.get("/api/jobs", params={"company": "Example Widgets", "status": "saved"}).json()
    assert [job["id"] for job in both] == [third]
    assert client.get("/api/jobs", params={"company": "Example"}).json() == []
    assert client.get("/api/jobs", params={"status": "unknown"}).status_code == 422


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"title": "Missing URL"},
        {"url": "https://example.test"},
        {"title": " ", "url": "https://example.test"},
        {"title": "Example", "url": ""},
        {"title": "Example", "url": "https://example.test", "company": None},
        {"title": "Example", "url": "https://example.test", "status": "applied"},
        {"title": "Example", "url": "https://example.test", "application": {"status": "applied"}},
    ],
)
def test_invalid_job_creation_writes_nothing(
    client: TestClient, session: Session, payload: dict[str, object]
) -> None:
    assert client.post("/api/jobs", json=payload).status_code == 422
    assert session.exec(select(Job)).all() == []
    assert session.exec(select(Application)).all() == []
    assert session.exec(select(StatusEvent)).all() == []


def test_unknown_ids(client: TestClient) -> None:
    assert client.get("/api/jobs/999").status_code == 404
    assert (
        client.put(
            "/api/jobs/999", json={"title": "Example", "url": "https://example.test"}
        ).status_code
        == 404
    )
    assert client.delete("/api/jobs/999").status_code == 404
    assert client.get("/api/applications/999/history").status_code == 404
    assert (
        client.post("/api/applications/999/transition", json={"to_status": "preparing"}).status_code
        == 404
    )


@pytest.mark.parametrize("payload", [{}, {"to_status": "unknown"}, {"to_status": None}])
def test_transition_validation(client: TestClient, payload: dict[str, object]) -> None:
    app_id = application_id(client, create_job(client))
    before = client.get(f"/api/applications/{app_id}/history").json()
    assert client.post(f"/api/applications/{app_id}/transition", json=payload).status_code == 422
    assert client.get(f"/api/applications/{app_id}/history").json() == before


# Independent expected policy exercises all 64 source/destination combinations.
FORWARD = {
    "saved": "preparing",
    "preparing": "ready_for_review",
    "ready_for_review": "applied",
    "applied": "interviewing",
    "interviewing": "offer",
}


@pytest.mark.parametrize("from_status", list(ApplicationStatus))
@pytest.mark.parametrize("to_status", list(ApplicationStatus))
def test_transition_matrix(
    client: TestClient,
    session: Session,
    from_status: ApplicationStatus,
    to_status: ApplicationStatus,
) -> None:
    job_id = create_job(client)
    app_id = application_id(client, job_id)
    application = session.get(Application, app_id)
    assert application is not None
    application.status = from_status
    session.add(application)
    session.commit()
    before = client.get(f"/api/jobs/{job_id}").json()
    old_history = client.get(f"/api/applications/{app_id}/history").json()
    allowed = from_status in FORWARD and (
        to_status == FORWARD[from_status] or to_status in ("rejected", "withdrawn")
    )
    response = client.post(
        f"/api/applications/{app_id}/transition",
        json={"to_status": to_status, "note": "Manual status update"},
    )
    history = client.get(f"/api/applications/{app_id}/history").json()
    after = client.get(f"/api/jobs/{job_id}").json()
    if allowed:
        assert response.status_code == 200
        assert response.json()["status"] == to_status
        assert after["application"] == response.json()
        assert after["updated_at"] > before["updated_at"]
        assert after["application"]["updated_at"] > before["application"]["updated_at"]
        assert history[:-1] == old_history
        event = history[-1]
        assert event["from_status"] == from_status
        assert event["to_status"] == to_status
        assert event["note"] == "Manual status update"
        assert event["application_id"] == app_id
        assert_utc(event["at"])
    else:
        assert response.status_code == 409
        assert f"from {from_status} to {to_status}" in response.json()["detail"]
        assert after == before
        assert history == old_history


def test_full_lifecycle_and_ordered_isolated_history(client: TestClient, session: Session) -> None:
    app_id = application_id(client, create_job(client))
    other_app_id = application_id(client, create_job(client))
    expected = ["saved", "preparing", "ready_for_review", "applied", "interviewing", "offer"]
    for status in expected[1:]:
        assert (
            client.post(
                f"/api/applications/{app_id}/transition", json={"to_status": status}
            ).status_code
            == 200
        )
    history = client.get(f"/api/applications/{app_id}/history").json()
    assert [event["to_status"] for event in history] == expected
    assert [event["from_status"] for event in history] == [None, *expected[:-1]]
    keys = [(event["at"], event["id"]) for event in history]
    assert keys == sorted(keys)
    assert len(client.get(f"/api/applications/{other_app_id}/history").json()) == 1
    # Timestamp ties use the id as a deterministic secondary key.
    for event in session.exec(select(StatusEvent)).all():
        event.at = datetime(2026, 1, 1, tzinfo=UTC)
        session.add(event)
    session.commit()
    tied = client.get(f"/api/applications/{app_id}/history").json()
    assert [event["to_status"] for event in tied] == expected


def test_stale_transition_does_not_append_history(client: TestClient, engine: Engine) -> None:
    app_id = application_id(client, create_job(client))
    with Session(engine, expire_on_commit=False) as stale:
        old = stale.get(Application, app_id)
        assert old is not None
        stale.commit()
        assert (
            client.post(
                f"/api/applications/{app_id}/transition", json={"to_status": "preparing"}
            ).status_code
            == 200
        )
        with pytest.raises(HTTPException) as error:
            transition(stale, app_id, ApplicationStatus.REJECTED, None)
        assert error.value.status_code == 409
        assert "reload and retry" in error.value.detail
    history = client.get(f"/api/applications/{app_id}/history").json()
    assert [event["to_status"] for event in history] == ["saved", "preparing"]
