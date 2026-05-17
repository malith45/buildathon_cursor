"""End-to-end smoke test against a running backend + GCS bucket + OpenAI key.

Run from the backend/ directory while the backend is up:

    python -m scripts.e2e_test [--keep-test-user]

Exits 0 on success, non-zero on any failure. Costs ~$0.001 in OpenAI usage
(one tiny probe + one real decision call). Uses a unique throwaway email
per run so it never collides with your real account.
"""

from __future__ import annotations

import argparse
import os
import sys
import time
import uuid
from typing import Any, Callable

import httpx

# Make app.* importable for the GCS cleanup at the end.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

BASE = os.environ.get("E2E_BASE", "http://127.0.0.1:4000")
FRONTEND = os.environ.get("E2E_FRONTEND", "http://127.0.0.1:3000")
TIMEOUT = httpx.Timeout(45.0, connect=10.0)


# ---------------------------------------------------------------------------
# Tiny test harness
# ---------------------------------------------------------------------------


class Step:
    def __init__(self, name: str) -> None:
        self.name = name
        self.start = 0.0
        self.elapsed_ms = 0.0
        self.status = "PENDING"
        self.detail = ""

    def passed(self, detail: str = "") -> None:
        self.status = "PASS"
        self.detail = detail

    def failed(self, detail: str) -> None:
        self.status = "FAIL"
        self.detail = detail[:300]


_steps: list[Step] = []


def run(name: str, fn: Callable[[Step], None]) -> Step:
    step = Step(name)
    _steps.append(step)
    step.start = time.perf_counter()
    print(f"  -> {name} ...", end="", flush=True)
    try:
        fn(step)
        if step.status == "PENDING":
            step.passed()
    except AssertionError as exc:
        step.failed(f"AssertionError: {exc}")
    except httpx.HTTPStatusError as exc:
        body = exc.response.text[:200]
        step.failed(f"HTTP {exc.response.status_code} {exc.request.method} {exc.request.url}: {body}")
    except Exception as exc:
        step.failed(f"{type(exc).__name__}: {exc}")
    step.elapsed_ms = (time.perf_counter() - step.start) * 1000
    glyph = "OK" if step.status == "PASS" else "FAIL"
    print(f"\r  [{glyph:4}] {name:<55} {step.elapsed_ms:>6.0f}ms  {step.detail}")
    return step


def summary_table() -> int:
    print("\n" + "=" * 78)
    print(f"{'#':<3} {'Status':<6} {'Step':<55} {'Time':>10}")
    print("-" * 78)
    passed = 0
    for i, s in enumerate(_steps, 1):
        marker = "PASS" if s.status == "PASS" else "FAIL"
        print(f"{i:<3} {marker:<6} {s.name:<55} {s.elapsed_ms:>7.0f}ms")
        if s.status == "PASS":
            passed += 1
    print("=" * 78)
    total = len(_steps)
    print(f"  {passed}/{total} passed")
    return 0 if passed == total else 1


# ---------------------------------------------------------------------------
# Test body
# ---------------------------------------------------------------------------


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--keep-test-user",
        action="store_true",
        help="Do not delete the test user from GCS after running.",
    )
    args = parser.parse_args()

    suffix = uuid.uuid4().hex[:8]
    # @example.com is RFC 2606 reserved for docs/tests — pydantic.EmailStr accepts it.
    test_email = f"e2e-{suffix}@example.com"
    test_password = "Sup3rSafe!Pass"
    test_name = f"E2E Bot {suffix}"

    print(f"\nE2E smoke test — backend={BASE} frontend={FRONTEND}")
    print(f"Test user: {test_email}\n")

    state: dict[str, Any] = {}

    with httpx.Client(timeout=TIMEOUT) as client:
        # Warmup: opens the TCP socket to the backend so the first measured
        # call below isn't blocked by a slow cold-start handshake on Windows.
        for attempt in range(3):
            try:
                client.get(f"{BASE}/api/health", timeout=httpx.Timeout(5.0, connect=2.0))
                break
            except (httpx.ConnectError, httpx.ConnectTimeout, httpx.ReadTimeout):
                if attempt == 2:
                    print(f"WARNING: backend warmup failed after 3 tries — is it up at {BASE}?")
                time.sleep(0.5)

        # 1. Frontend reachable
        def t_frontend(step: Step) -> None:
            r = client.get(FRONTEND, follow_redirects=True)
            assert r.status_code == 200, f"got {r.status_code}"
            step.detail = f"HTTP {r.status_code}, {len(r.text)} bytes"

        run("Frontend GET /", t_frontend)

        # 2. Health endpoint baseline
        def t_health(step: Step) -> None:
            r = client.get(f"{BASE}/api/health")
            r.raise_for_status()
            data = r.json()
            assert data["status"] == "ok", data
            assert data["aiConfigured"] is True, "OPENAI_API_KEY not loaded"
            assert data["storageConfigured"] is True, "GCS_BUCKET not configured"
            assert data["storageConnected"] is True, f"GCS unreachable: {data.get('storageMessage')}"
            assert data["diseasesReady"] is True, "Disease catalog not seeded"
            state["aiModel"] = data["aiModel"]
            state["storageBucket"] = data["storageBucket"]
            step.detail = f"model={data['aiModel']} bucket={data['storageBucket']}"

        run("GET /api/health (status + connectivity)", t_health)

        # 3. Live OpenAI probe
        def t_probe(step: Step) -> None:
            r = client.get(f"{BASE}/api/health?probe=true")
            r.raise_for_status()
            ai = r.json().get("ai") or {}
            assert ai.get("working") is True, f"OpenAI not working: {ai.get('message')}"
            step.detail = f"sample={ai.get('sample')!r}"

        run("GET /api/health?probe=true (live OpenAI)", t_probe)

        # 4. Disease search returns results
        def t_diseases(step: Step) -> None:
            r = client.get(f"{BASE}/api/diseases", params={"search": "asthma", "limit": 5})
            r.raise_for_status()
            diseases = r.json()["diseases"]
            assert any(d["name"].lower() == "asthma" for d in diseases), diseases
            step.detail = f"{len(diseases)} hit(s), first={diseases[0]['name']!r}"

        run("GET /api/diseases?search=asthma", t_diseases)

        # 5. Signup
        def t_signup(step: Step) -> None:
            r = client.post(
                f"{BASE}/api/auth/signup",
                json={"email": test_email, "password": test_password, "name": test_name},
            )
            assert r.status_code == 201, f"got {r.status_code}: {r.text[:200]}"
            data = r.json()
            assert data["user"]["email"] == test_email
            assert data["token"], "no token"
            state["user_id"] = data["user"]["id"]
            state["token"] = data["token"]
            step.detail = f"user_id={data['user']['id']}"

        if not run("POST /api/auth/signup", t_signup).status == "PASS":
            return summary_table()

        auth_headers = {"Authorization": f"Bearer {state['token']}"}

        # 6. Login with same credentials
        def t_login(step: Step) -> None:
            r = client.post(
                f"{BASE}/api/auth/login",
                json={"email": test_email, "password": test_password},
            )
            r.raise_for_status()
            data = r.json()
            assert data["user"]["email"] == test_email
            assert data["user"]["id"] == state["user_id"], "user id changed!"
            step.detail = "credentials accepted"

        run("POST /api/auth/login (same credentials)", t_login)

        # 7. Login with wrong password should 401
        def t_login_bad(step: Step) -> None:
            r = client.post(
                f"{BASE}/api/auth/login",
                json={"email": test_email, "password": "WRONG-password-1"},
            )
            assert r.status_code == 401, f"expected 401, got {r.status_code}"
            step.detail = "rejected as expected"

        run("POST /api/auth/login (bad password -> 401)", t_login_bad)

        # 8. /auth/me with token
        def t_me(step: Step) -> None:
            r = client.get(f"{BASE}/api/auth/me", headers=auth_headers)
            r.raise_for_status()
            data = r.json()
            assert data["user"]["email"] == test_email
            step.detail = f"name={data['user']['name']!r}"

        run("GET /api/auth/me", t_me)

        # 9. PATCH profile (updates name + healthProfile)
        def t_patch_profile(step: Step) -> None:
            r = client.patch(
                f"{BASE}/api/auth/profile",
                headers=auth_headers,
                json={
                    "name": f"{test_name} Updated",
                    "healthProfile": {
                        "ageRange": "35-44",
                        "gender": "female",
                        "conditions": ["Asthma"],
                        "allergies": ["penicillin"],
                        "medications": "albuterol",
                        "pregnant": False,
                    },
                },
            )
            r.raise_for_status()
            data = r.json()
            assert data["user"]["name"].endswith("Updated"), data
            assert data["user"]["healthProfile"]["ageRange"] == "35-44"
            assert data["user"]["healthProfile"]["conditions"] == ["Asthma"]
            step.detail = f"name+profile updated"

        run("PATCH /api/auth/profile", t_patch_profile)

        # 10. POST /health/decision — real OpenAI call (~$0.0004)
        def t_decision(step: Step) -> None:
            r = client.post(
                f"{BASE}/api/health/decision",
                json={
                    "profile": {
                        "ageRange": "35-44",
                        "gender": "female",
                        "conditions": ["Asthma"],
                        "allergies": [],
                        "medications": "albuterol",
                        "pregnant": False,
                    },
                    "messages": [
                        {
                            "role": "user",
                            "text": "I've had a mild sore throat and a low fever (37.5C) for two days. No trouble breathing.",
                        }
                    ],
                },
                timeout=httpx.Timeout(60.0, connect=10.0),
            )
            r.raise_for_status()
            data = r.json()
            assert data["urgency"] in {"self_care", "see_doctor_soon", "urgent_care", "emergency"}, data
            assert isinstance(data["summary"], str) and len(data["summary"]) > 10
            assert isinstance(data["careSteps"], list) and len(data["careSteps"]) >= 1
            assert isinstance(data["redFlags"], list)
            assert isinstance(data["education"], list)
            assert not data.get("fallback"), "got fallback response (OpenAI failed)"
            step.detail = f"urgency={data['urgency']} steps={len(data['careSteps'])} edu={len(data['education'])}"

        run("POST /api/health/decision (live OpenAI triage)", t_decision)

        # 11. Sync a chat session to GCS
        chat_id = str(uuid.uuid4())
        state["chat_id"] = chat_id

        def t_sync_chat(step: Step) -> None:
            session = {
                "id": chat_id,
                "title": "E2E test — sore throat",
                "messages": [
                    {"role": "user", "text": "sore throat for 2 days"},
                    {"role": "model", "text": "Rest, fluids, and monitor."},
                ],
                "lastDecision": {
                    "urgency": "self_care",
                    "summary": "Symptoms are mild; manage at home and monitor.",
                    "careSteps": ["Rest", "Drink fluids"],
                    "education": ["Most viral sore throats resolve in 3-7 days"],
                    "redFlags": ["Difficulty breathing"],
                    "disclaimer": "Educational only.",
                },
                "updatedAt": "2026-05-17T20:00:00.000Z",
            }
            r = client.put(
                f"{BASE}/api/chats",
                headers=auth_headers,
                json={"sessions": [session]},
            )
            r.raise_for_status()
            sessions = r.json()["sessions"]
            assert any(s["id"] == chat_id for s in sessions), sessions
            step.detail = f"{len(sessions)} session(s) returned"

        run("PUT /api/chats (sync to GCS)", t_sync_chat)

        # 12. List chats
        def t_list_chats(step: Step) -> None:
            r = client.get(f"{BASE}/api/chats", headers=auth_headers)
            r.raise_for_status()
            sessions = r.json()["sessions"]
            target = next((s for s in sessions if s["id"] == chat_id), None)
            assert target is not None, f"chat {chat_id} not in {sessions}"
            assert target["title"].startswith("E2E"), target
            assert len(target["messages"]) == 2
            assert target["lastDecision"]["urgency"] == "self_care"
            step.detail = f"chat {chat_id[:8]}... found, {len(target['messages'])} msgs"

        run("GET /api/chats (read-back)", t_list_chats)

        # 13. Verify GCS objects directly
        def t_gcs_objects(step: Step) -> None:
            from app.storage import client as storage_client
            from app.storage.users_store import _load_email_index

            user_blob = f"users/{state['user_id']}.json"
            chat_blob = f"chats/{state['user_id']}/{chat_id}.json"

            user_data, _ = storage_client.read_json(user_blob)
            assert user_data and user_data.get("email") == test_email, user_data
            chat_data, _ = storage_client.read_json(chat_blob)
            assert chat_data and chat_data.get("id") == chat_id, chat_data

            index, _ = _load_email_index()
            assert index.get(test_email) == state["user_id"], f"email index missing entry: {index}"

            step.detail = f"user.json + chat.json + email_index present"

        run("GCS: user.json + chat.json + email index", t_gcs_objects)

        # 14. DELETE chats
        def t_delete_chats(step: Step) -> None:
            r = client.delete(f"{BASE}/api/chats", headers=auth_headers)
            assert r.status_code == 204, f"got {r.status_code}"
            r2 = client.get(f"{BASE}/api/chats", headers=auth_headers)
            r2.raise_for_status()
            sessions = r2.json()["sessions"]
            assert not any(s["id"] == chat_id for s in sessions), "chat still listed after delete"
            step.detail = "all chats cleared"

        run("DELETE /api/chats then re-list", t_delete_chats)

        # 15. Unauthorized requests should 401
        def t_no_auth(step: Step) -> None:
            r = client.get(f"{BASE}/api/auth/me")
            assert r.status_code == 401, f"expected 401, got {r.status_code}"
            r2 = client.get(f"{BASE}/api/chats")
            assert r2.status_code == 401, f"expected 401, got {r2.status_code}"
            step.detail = "401 on /me and /chats without token"

        run("Auth: 401 without token", t_no_auth)

        # 16. Duplicate signup with same email -> 409
        def t_duplicate(step: Step) -> None:
            r = client.post(
                f"{BASE}/api/auth/signup",
                json={"email": test_email, "password": test_password, "name": "Dup"},
            )
            assert r.status_code == 409, f"expected 409, got {r.status_code}: {r.text[:200]}"
            step.detail = "rejected as expected"

        run("POST /api/auth/signup duplicate -> 409", t_duplicate)

    # Cleanup: remove the test user from GCS so the bucket stays tidy.
    if not args.keep_test_user and "user_id" in state:
        try:
            from app.storage import users_store

            users_store.delete_user(state["user_id"])
            print(f"\nCleanup: deleted test user {state['user_id'][:8]}... from GCS")
        except Exception as exc:
            print(f"\nCleanup WARNING: could not delete test user from GCS: {exc}")

    return summary_table()


if __name__ == "__main__":
    raise SystemExit(main())
