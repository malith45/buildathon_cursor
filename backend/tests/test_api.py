import os

os.environ.setdefault("AUTH_SECRET", "test-secret")
os.environ.setdefault("GEMINI_API_KEY", "test-key")

from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services import auth_service

client = TestClient(app)


@pytest.fixture(autouse=True)
def clear_users():
    auth_service.clear_users_for_tests()
    yield
    auth_service.clear_users_for_tests()


def test_health_check():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert "geminiConfigured" in data


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
