"""Smoke tests for the FastAPI surface.

These tests do not require GCS or a live OpenAI key. The decision test
mocks openai_service.generate_json. To exercise real persistence, run
the app manually with a configured backend/.env.
"""

from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_check():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert "aiConfigured" in data
    assert "storageConfigured" in data
    assert "storageConnected" in data


@patch("app.routers.health.openai_service.probe_openai")
def test_health_check_ai_probe(mock_probe):
    mock_probe.return_value = {
        "configured": True,
        "working": True,
        "message": "Connected via gpt-4o-mini",
        "model": "gpt-4o-mini",
        "sample": "OK",
    }
    res = client.get("/api/health?probe=true")
    assert res.status_code == 200
    data = res.json()
    assert data["ai"]["working"] is True
    mock_probe.assert_called_once()


def test_decision_validation_400():
    res = client.post("/api/health/decision", json={"profile": {}, "messages": []})
    assert res.status_code == 400


@patch("app.services.health_decision_service.openai_service.generate_json")
def test_decision_success(mock_generate):
    mock_generate.return_value = """{
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
    assert "evidenceSnippets" in data
    assert isinstance(data["evidenceSnippets"], list)


@patch("app.services.health_decision_service.openai_service.generate_json")
def test_decision_emergency_keyword_escalation(mock_generate):
    """Model says self_care but user text triggers rule-based emergency escalation."""
    mock_generate.return_value = """{
        "urgency": "self_care",
        "summary": "Sounds mild.",
        "careSteps": ["Rest"],
        "education": ["Monitor"],
        "redFlags": [],
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
            "messages": [
                {"role": "user", "text": "I have chest pain and I can't breathe"}
            ],
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["urgency"] == "emergency"
    assert data.get("safetyEscalation") is True
    assert data.get("safetyNote")
    assert len(data.get("redFlags", [])) >= 1
