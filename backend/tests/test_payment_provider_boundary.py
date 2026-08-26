from decimal import Decimal

from fastapi.testclient import TestClient

from app.api import payments as payments_api
from app.main import app
from app.payments.providers import PaymentCallbackEvent, PaymentInitiation, PaymentProvider, RefundInitiation


class FakeProvider(PaymentProvider):
    name = "fake-payzen-shape"

    def __init__(self) -> None:
        self.initiations = 0
        self.callback_event: PaymentCallbackEvent | None = None
        self.callback_error = False

    async def initiate_payment(self, *, reference, amount, currency, method, return_url=None):
        self.initiations += 1
        psid = f"PSID-{self.initiations:010d}"
        return PaymentInitiation(
            provider=self.name,
            provider_reference=psid,
            status="pending",
            redirect_url=f"https://payments.example/{psid}",
            client_payload={"psid": psid, "channel": method},
            provider_metadata={"provider_stage": "bill_generated"},
        )

    async def initiate_refund(self, *, provider_reference, amount, currency, reason):
        return RefundInitiation(provider_reference="RF-1", status="requested")

    async def verify_callback(self, payload: bytes, headers: dict[str, str]) -> PaymentCallbackEvent:
        if self.callback_error:
            raise ValueError("bad signature")
        assert headers.get("x-provider-test") == "verified"
        assert self.callback_event is not None
        return self.callback_event


def player_headers(client: TestClient) -> dict[str, str]:
    login = client.post(
        "/api/v1/auth/login",
        json={"identifier": "player@sbppadel.local", "password": "PadelDemo2026!"},
    )
    assert login.status_code == 200
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


def create_booking(
    client: TestClient,
    headers: dict[str, str],
    *,
    booking_date: str = "2026-12-20",
    start_time: str = "16:00",
) -> dict:
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
            "booking_date": booking_date,
            "slots": [{"start_time": start_time}],
            "policy_version_id": policy["id"],
            "policy_accepted": True,
        },
    )
    assert created.status_code == 200, created.text
    return created.json()


def initiate(client: TestClient, headers: dict[str, str], booking: dict) -> dict:
    response = client.post(
        "/api/v1/payments/initiate",
        headers=headers,
        json={"booking_id": booking["id"], "method": "1bill"},
    )
    assert response.status_code == 200, response.text
    return response.json()


def callback(client: TestClient) -> dict:
    response = client.post(
        "/api/v1/payments/provider-callback",
        content=b'{"provider":"test"}',
        headers={"X-Provider-Test": "verified", "Content-Type": "application/json"},
    )
    assert response.status_code == 200, response.text
    return response.json()


def test_payment_initiation_uses_provider_and_is_idempotent(monkeypatch):
    provider = FakeProvider()
    monkeypatch.setattr(payments_api, "payment_provider", provider)

    with TestClient(app) as client:
        headers = player_headers(client)
        booking = create_booking(client, headers)

        first = initiate(client, headers, booking)
        assert first["provider"] == provider.name
        assert first["provider_reference"] == "PSID-0000000001"
        assert first["redirect_url"] == "https://payments.example/PSID-0000000001"
        assert first["client_payload"]["psid"] == "PSID-0000000001"
        assert first["requires_provider_integration"] is False
        assert provider.initiations == 1

        repeated = initiate(client, headers, booking)
        assert repeated["payment_id"] == first["payment_id"]
        assert repeated["provider_reference"] == "PSID-0000000001"
        assert provider.initiations == 1


def test_verified_paid_callback_confirms_once_and_duplicate_is_safe(monkeypatch):
    provider = FakeProvider()
    monkeypatch.setattr(payments_api, "payment_provider", provider)

    with TestClient(app) as client:
        headers = player_headers(client)
        booking = create_booking(client, headers, booking_date="2026-12-21")
        payment = initiate(client, headers, booking)
        provider.callback_event = PaymentCallbackEvent(
            provider_reference=payment["provider_reference"],
            status="paid",
            amount=Decimal(payment["amount"]),
            currency=payment["currency"],
            transaction_reference="BANK-TXN-001",
            provider_metadata={"verified": True},
        )

        first = callback(client)
        assert first["payment_status"] == "paid"
        assert first["booking_status"] == "confirmed"
        assert first["reconciliation_required"] is False

        duplicate = callback(client)
        assert duplicate["payment_status"] == "paid"
        assert duplicate["booking_status"] == "confirmed"
        assert duplicate["reconciliation_required"] is False

        detail = client.get(f"/api/v1/payments/{payment['payment_id']}", headers=headers)
        assert detail.status_code == 200
        assert detail.json()["status"] == "paid"


def test_paid_callback_after_hold_expiry_opens_one_refund_and_never_confirms(monkeypatch):
    provider = FakeProvider()
    monkeypatch.setattr(payments_api, "payment_provider", provider)

    with TestClient(app) as client:
        headers = player_headers(client)
        booking = create_booking(client, headers, booking_date="2026-12-22")
        payment = initiate(client, headers, booking)
        provider.callback_event = PaymentCallbackEvent(
            provider_reference=payment["provider_reference"],
            status="paid",
            amount=Decimal(payment["amount"]),
            currency="PKR",
            transaction_reference="BANK-LATE-001",
        )
        monkeypatch.setattr(payments_api, "_hold_expired", lambda _booking: True)

        late = callback(client)
        assert late["payment_status"] == "paid"
        assert late["booking_status"] == "expired"
        assert late["reconciliation_required"] is True
        assert late["refund_status"] == "requested"

        duplicate = callback(client)
        assert duplicate["refund_id"] == late["refund_id"]
        assert duplicate["booking_status"] == "expired"
        assert duplicate["reconciliation_required"] is True


def test_callback_rejects_bad_verification_and_financial_mismatch(monkeypatch):
    provider = FakeProvider()
    monkeypatch.setattr(payments_api, "payment_provider", provider)

    with TestClient(app) as client:
        headers = player_headers(client)
        booking = create_booking(client, headers, booking_date="2026-12-23")
        payment = initiate(client, headers, booking)

        provider.callback_error = True
        rejected = client.post(
            "/api/v1/payments/provider-callback",
            content=b"{}",
            headers={"X-Provider-Test": "verified"},
        )
        assert rejected.status_code == 401

        provider.callback_error = False
        provider.callback_event = PaymentCallbackEvent(
            provider_reference=payment["provider_reference"],
            status="paid",
            amount=Decimal(payment["amount"]) + Decimal("1.00"),
            currency="PKR",
        )
        mismatch = client.post(
            "/api/v1/payments/provider-callback",
            content=b"{}",
            headers={"X-Provider-Test": "verified"},
        )
        assert mismatch.status_code == 409
