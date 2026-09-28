from collections.abc import Iterator
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, text
from sqlmodel import Session

from app.db import get_session
from app.main import create_app

Json = dict[str, Any]


@pytest.fixture
def client(engine: Engine) -> Iterator[TestClient]:
    """App wired to the migrated temporary DB from conftest (never data/)."""
    app = create_app()

    def override_session() -> Iterator[Session]:
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_session] = override_session
    with TestClient(app) as test_client:
        yield test_client


def create(client: TestClient, path: str, body: Json) -> Json:
    response = client.post(path, json=body)
    assert response.status_code == 201, response.text
    return response.json()


def make_experience(client: TestClient, **overrides: Any) -> Json:
    body: Json = {
        "kind": "job",
        "org": "Example Widgets Inc.",
        "title": "Engineer",
        "start_date": "2024-01-01",
        "end_date": "2025-06-30",
        "location": "Springfield",
    }
    return create(client, "/api/experiences", body | overrides)


def make_skill(client: TestClient, name: str = "Python") -> Json:
    return create(client, "/api/skills", {"name": name, "category": "language"})


# Profile


def test_profile_is_404_until_saved(client: TestClient) -> None:
    response = client.get("/api/profile")
    assert response.status_code == 404


def test_put_profile_creates_then_updates_single_row(client: TestClient, engine: Engine) -> None:
    body: Json = {
        "name": "Jane Placeholder",
        "email": "jane@example.com",
        "links": ["https://example.com/jane"],
    }
    created = client.put("/api/profile", json=body)
    assert created.status_code == 200
    assert created.json()["links"] == ["https://example.com/jane"]
    assert created.json()["phone"] is None

    changes: Json = {"phone": "555-0100", "links": []}
    updated = client.put("/api/profile", json=body | changes)
    assert updated.status_code == 200
    assert updated.json()["phone"] == "555-0100"
    assert updated.json()["links"] == []
    assert updated.json()["created_at"] == created.json()["created_at"]

    fetched = client.get("/api/profile")
    assert fetched.json() == updated.json()
    with engine.connect() as connection:
        assert connection.execute(text("SELECT count(*) FROM profile")).scalar_one() == 1


def test_profile_requires_name_and_email(client: TestClient) -> None:
    assert client.put("/api/profile", json={"name": "Jane"}).status_code == 422
    assert client.put("/api/profile", json={"name": " ", "email": "x"}).status_code == 422


def test_timestamps_serialize_as_utc_iso(client: TestClient) -> None:
    profile = client.put("/api/profile", json={"name": "Jane", "email": "j@example.com"}).json()
    skill = make_skill(client)
    for record in (profile, skill):
        for key in ("created_at", "updated_at"):
            assert record[key].endswith("Z"), record[key]


# Experiences


def test_experience_crud(client: TestClient) -> None:
    experience = make_experience(client)
    assert experience["kind"] == "job"
    assert experience["start_date"] == "2024-01-01"
    experience_id = experience["id"]

    assert client.get(f"/api/experiences/{experience_id}").json() == experience
    assert [e["id"] for e in client.get("/api/experiences").json()] == [experience_id]

    replacement: Json = {"kind": "project", "org": "Side Project", "title": "Maker"}
    updated = client.put(f"/api/experiences/{experience_id}", json=replacement)
    assert updated.status_code == 200
    assert updated.json()["kind"] == "project"
    assert updated.json()["start_date"] is None

    assert client.delete(f"/api/experiences/{experience_id}").status_code == 204
    assert client.get(f"/api/experiences/{experience_id}").status_code == 404
    assert client.get("/api/experiences").json() == []


def test_experience_404s(client: TestClient) -> None:
    body: Json = {"kind": "job", "org": "Org", "title": "Title"}
    assert client.get("/api/experiences/999").status_code == 404
    assert client.put("/api/experiences/999", json=body).status_code == 404
    assert client.delete("/api/experiences/999").status_code == 404


def test_experience_validation(client: TestClient) -> None:
    bad_kind: Json = {"kind": "hobby", "org": "Org", "title": "Title"}
    assert client.post("/api/experiences", json=bad_kind).status_code == 422
    reversed_dates: Json = {
        "kind": "job",
        "org": "Org",
        "title": "Title",
        "start_date": "2025-01-01",
        "end_date": "2024-01-01",
    }
    assert client.post("/api/experiences", json=reversed_dates).status_code == 422


# Bullets


def test_bullet_crud_with_skills_and_verified(client: TestClient) -> None:
    experience_id = make_experience(client)["id"]
    python = make_skill(client, "Python")
    sql = make_skill(client, "SQL")
    base = f"/api/experiences/{experience_id}/bullets"

    bullet = create(
        client,
        base,
        {"text": "Built a fictional widget pipeline", "skill_ids": [sql["id"], python["id"]]},
    )
    assert bullet["experience_id"] == experience_id
    assert bullet["verified"] is False
    assert bullet["skill_ids"] == sorted([python["id"], sql["id"]])
    bullet_url = f"{base}/{bullet['id']}"
    assert client.get(bullet_url).json() == bullet
    assert [b["id"] for b in client.get(base).json()] == [bullet["id"]]

    updated = client.put(
        bullet_url,
        json={
            "text": "Built a faster widget pipeline",
            "metrics": "40% faster",
            "verified": True,
            "skill_ids": [python["id"], python["id"]],
        },
    )
    assert updated.status_code == 200
    assert updated.json()["verified"] is True
    assert updated.json()["metrics"] == "40% faster"
    assert updated.json()["skill_ids"] == [python["id"]]

    unlinked = client.put(bullet_url, json={"text": "No skills"})
    assert unlinked.json()["skill_ids"] == []
    assert unlinked.json()["verified"] is False

    assert client.delete(bullet_url).status_code == 204
    assert client.get(bullet_url).status_code == 404
    assert client.get(base).json() == []
    assert len(client.get("/api/skills").json()) == 2


def test_bullet_rejects_unknown_skill_ids(client: TestClient) -> None:
    experience_id = make_experience(client)["id"]
    base = f"/api/experiences/{experience_id}/bullets"
    response = client.post(base, json={"text": "Did things", "skill_ids": [42]})
    assert response.status_code == 422
    assert "42" in response.json()["detail"]
    assert client.get(base).json() == []


def test_bullet_404s(client: TestClient) -> None:
    experience_id = make_experience(client)["id"]
    other_id = make_experience(client, org="Other Org")["id"]
    body: Json = {"text": "Did things"}
    bullet = create(client, f"/api/experiences/{experience_id}/bullets", body)

    assert client.get("/api/experiences/999/bullets").status_code == 404
    assert client.post("/api/experiences/999/bullets", json=body).status_code == 404
    missing = f"/api/experiences/{experience_id}/bullets/999"
    assert client.get(missing).status_code == 404
    assert client.put(missing, json=body).status_code == 404
    assert client.delete(missing).status_code == 404
    # A bullet is only reachable through its own experience.
    wrong_parent = f"/api/experiences/{other_id}/bullets/{bullet['id']}"
    assert client.get(wrong_parent).status_code == 404
    assert client.put(wrong_parent, json=body).status_code == 404
    assert client.delete(wrong_parent).status_code == 404


def test_deleting_experience_cascades_to_bullets(client: TestClient, engine: Engine) -> None:
    experience_id = make_experience(client)["id"]
    kept_id = make_experience(client, org="Kept Org")["id"]
    skill = make_skill(client)
    body: Json = {"text": "Linked bullet", "skill_ids": [skill["id"]]}
    create(client, f"/api/experiences/{experience_id}/bullets", body)
    create(client, f"/api/experiences/{experience_id}/bullets", {"text": "Second"})
    kept = create(client, f"/api/experiences/{kept_id}/bullets", body)

    assert client.delete(f"/api/experiences/{experience_id}").status_code == 204

    assert client.get(f"/api/experiences/{experience_id}/bullets").status_code == 404
    assert [b["id"] for b in client.get(f"/api/experiences/{kept_id}/bullets").json()] == [
        kept["id"]
    ]
    with engine.connect() as connection:
        assert connection.execute(text("SELECT count(*) FROM bullet")).scalar_one() == 1
        links = connection.execute(text("SELECT bullet_id FROM bulletskill")).scalars().all()
        assert links == [kept["id"]]
    assert client.get(f"/api/skills/{skill['id']}").status_code == 200


def test_deleting_skill_unlinks_but_keeps_bullets(client: TestClient) -> None:
    experience_id = make_experience(client)["id"]
    python = make_skill(client, "Python")
    sql = make_skill(client, "SQL")
    base = f"/api/experiences/{experience_id}/bullets"
    bullet = create(client, base, {"text": "Query work", "skill_ids": [python["id"], sql["id"]]})

    assert client.delete(f"/api/skills/{sql['id']}").status_code == 204

    reloaded = client.get(f"{base}/{bullet['id']}")
    assert reloaded.status_code == 200
    assert reloaded.json()["skill_ids"] == [python["id"]]


# Skills


def test_skill_crud(client: TestClient) -> None:
    skill = make_skill(client, "Python")
    skill_url = f"/api/skills/{skill['id']}"
    assert client.get(skill_url).json() == skill
    assert [s["id"] for s in client.get("/api/skills").json()] == [skill["id"]]

    updated = client.put(skill_url, json={"name": "Python 3", "proficiency": "expert"})
    assert updated.status_code == 200
    assert updated.json()["name"] == "Python 3"
    assert updated.json()["category"] is None

    assert client.delete(skill_url).status_code == 204
    assert client.get(skill_url).status_code == 404


def test_skill_404s_and_conflicts(client: TestClient) -> None:
    body: Json = {"name": "Go"}
    assert client.get("/api/skills/999").status_code == 404
    assert client.put("/api/skills/999", json=body).status_code == 404
    assert client.delete("/api/skills/999").status_code == 404

    python = make_skill(client, "Python")
    go = make_skill(client, "Go")
    assert client.post("/api/skills", json={"name": "Python"}).status_code == 409
    assert client.put(f"/api/skills/{go['id']}", json={"name": "Python"}).status_code == 409
    # Re-saving a skill under its own name is not a conflict.
    assert client.put(f"/api/skills/{python['id']}", json={"name": "Python"}).status_code == 200


# Answers


def test_answer_crud(client: TestClient) -> None:
    answer = create(
        client, "/api/answers", {"question_key": "why_company", "text": "Fictional reasons."}
    )
    answer_url = f"/api/answers/{answer['id']}"
    assert client.get(answer_url).json() == answer
    assert [a["id"] for a in client.get("/api/answers").json()] == [answer["id"]]

    updated = client.put(answer_url, json={"question_key": "why_us", "text": "Better reasons."})
    assert updated.status_code == 200
    assert updated.json()["question_key"] == "why_us"
    assert updated.json()["text"] == "Better reasons."

    assert client.delete(answer_url).status_code == 204
    assert client.get(answer_url).status_code == 404


def test_answer_404s_and_conflicts(client: TestClient) -> None:
    body: Json = {"question_key": "salary", "text": "Negotiable."}
    assert client.get("/api/answers/999").status_code == 404
    assert client.put("/api/answers/999", json=body).status_code == 404
    assert client.delete("/api/answers/999").status_code == 404

    create(client, "/api/answers", body)
    other = create(client, "/api/answers", {"question_key": "start", "text": "Soon."})
    assert client.post("/api/answers", json=body).status_code == 409
    assert client.put(f"/api/answers/{other['id']}", json=body).status_code == 409
    assert client.post("/api/answers", json={"question_key": "x", "text": ""}).status_code == 422
