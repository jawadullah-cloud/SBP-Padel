from dataclasses import dataclass

from fastapi.testclient import TestClient

from app.api import payments as payments_api
from app.main import app
from app.payments.providers import PaymentInitiation, PaymentProvider, RefundInitiation


class FakeProvider(PaymentProvider):
    name = "fake-payzen-shape"

    def __init__(self) -> None:
        self.initiations = 0

    async def initiate_payment(self, *, reference, amount, currency, method, return_url=None):
        self.initiations += 1
        return PaymentInitiation(
            provider=self.name,
            provider_reference="PSID-1234567890",
            status="pending",
            redirect_url="https://payments.example/PSID-1234567890",
            client_payload={"psid": "PSID-1234567890", "channel": method},
            provider_metadata={"provider_stage": "bill_generated"},
        )

    async def initiate_refund(self, *, provider_reference, amount, currency, reason):
        return RefundInitiation(provider_reference="RF-1", status="requested")

    async def verify_callback(self, payload: bytes, headers: dict[str, str]) -> dict:
        return {}


def player_headers(client: TestClient) -> dict[str, str]:
    login = client.post(
        "/api/v1/auth/login",
        json={"identifier": "player@sbppadel.local", "password": "PadelDemo2026!"},
    )
    assert login.status_code == 200
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


def create_booking(client: TestClient, headers: dict[str, str]) -> dict:
    policy = client.get("/api/v1/policies/active").json()
    venue = next(v for v in client.get("/api/v1/venues").json() if v["name"] == "Nishtar Park Sports Complex")
    detail = client.get(f"/api/v1/venues/{venue['id']}").json()
    court_id = next(c["id"] for c in detail["courts"] if c["code"] == "05")
    created = client.post(
        "/api/v1/bookings",
        headers=headers,
        json={
            "venue_id": venue["id"],
            "court_id": court_id,
            "booking_date": "2026-12-20",
            "slots": [{"start_time": "16:00"}],
            "policy_version_id": policy["id"],
            "policy_accepted": True,
        },
    )
    assert created.status_code == 200
    return created.json()


def test_payment_initiation_uses_provider_and_is_idempotent(monkeypatch):
    provider = FakeProvider()
    monkeypatch.setattr(payments_api, "payment_provider", provider)

    with TestClient(app) as client:
        headers = player_headers(client)
        booking = create_booking(client, headers)

        first = client.post(
            "/api/v1/payments/initiate",
            headers=headers,
            json={"booking_id": booking["id"], "method": "1bill"},
        )
        assert first.status_code == 200
        body = first.json()
        assert body["provider"] == provider.name
        assert body["provider_reference"] == "PSID-1234567890"
        assert body["redirect_url"] == "https://payments.example/PSID-1234567890"
        assert body["client_payload"]["psid"] == "PSID-1234567890"
        assert body["requires_provider_integration"] is False
        assert provider.initiations == 1

        repeated = client.post(
            "/api/v1/payments/initiate",
            headers=headers,
            json={"booking_id": booking["id"], "method": "1bill"},
        )
        assert repeated.status_code == 200
        assert repeated.json()["payment_id"] == body["payment_id"]
        assert repeated.json()["provider_reference"] == "PSID-1234567890"
        assert provider.initiations == 1
