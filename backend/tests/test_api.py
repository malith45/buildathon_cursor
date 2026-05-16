from functools import lru_cache
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.db.connection import ping_database
from app.main import app
from app.services import auth_service

client = TestClient(app)


@lru_cache
def _database_reachable() -> bool:
    settings = get_settings()
    if not settings.database_configured:
        return False
    try:
        ping_database()
        return True
    except Exception:
        return False


@pytest.fixture(autouse=True)
def clear_users():
    if not _database_reachable():
        yield
        return
    try:
        auth_service.clear_users_for_tests()
    except Exception:
        pass
    yield
    try:
        auth_service.clear_users_for_tests()
    except Exception:
        pass


requires_db = pytest.mark.skipif(
    not _database_reachable(),
    reason="DATABASE_* not configured or Supabase unreachable",
)


def test_health_check():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert "geminiConfigured" in data
    assert "databaseConfigured" in data
    assert "databaseConnected" in data


@requires_db
def test_diseases_search():
    from app.db.seed_diseases import seed_diseases_if_needed

    seed_diseases_if_needed()
    res = client.get("/api/diseases?search=asthma")
    assert res.status_code == 200
    diseases = res.json()["diseases"]
    assert any(d["name"] == "Asthma" for d in diseases)


@patch("app.services.gemini_service.probe_gemini")
def test_health_check_gemini_probe(mock_probe):
    mock_probe.return_value = {
        "configured": True,
        "working": True,
        "message": "Connected via gemini-2.5-flash",
        "model": "gemini-2.5-flash",
        "sample": "OK",
    }
    res = client.get("/api/health?probe=true")
    assert res.status_code == 200
    data = res.json()
    assert data["gemini"]["working"] is True
    mock_probe.assert_called_once()


@requires_db
def test_signup_login_me_profile():
    signup = client.post(
        "/api/auth/signup",
        json={
            "email": "test@example.com",
            "password": "password123",
            "name": "Test User",
        },
    )
    assert signup.status_code == 201
    token = signup.json()["token"]
    assert signup.json()["user"]["email"] == "test@example.com"

    login = client.post(
        "/api/auth/login",
        json={"email": "test@example.com", "password": "password123"},
    )
    assert login.status_code == 200
    assert "token" in login.json()

    me = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me.status_code == 200
    assert me.json()["user"]["name"] == "Test User"

    patch_res = client.patch(
        "/api/auth/profile",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Updated Name", "healthProfile": {"ageRange": "18-24", "conditions": [], "allergies": [], "medications": ""}},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["user"]["name"] == "Updated Name"
    assert patch_res.json()["user"]["healthProfile"]["ageRange"] == "18-24"


def test_decision_validation_400():
    res = client.post("/api/health/decision", json={"profile": {}, "messages": []})
    assert res.status_code == 400


@patch("app.services.health_decision_service.gemini_service.generate_json")
def test_decision_success(mock_gemini):
    mock_gemini.return_value = """{
        "urgency": "self_care",
        "summary": "Rest and fluids may help.",
        "careSteps": ["Stay hydrated"],
        "education": ["Viruses often resolve in days"],
        "redFlags": ["High fever over 3 days"],
        "disclaimer": "Educational only."
    }"""

    res = client.post(
        "/api/health/decision",
        json={
            "profile": {
                "ageRange": "25-34",
                "conditions": [],
                "allergies": [],
                "medications": "",
            },
            "messages": [{"role": "user", "text": "Mild sore throat"}],
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["urgency"] == "self_care"
    assert "summary" in data
