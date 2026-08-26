from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from decimal import Decimal


@dataclass
class PaymentInitiation:
    provider: str
    provider_reference: str
    status: str = "pending"
    redirect_url: str | None = None
    client_payload: dict = field(default_factory=dict)
    provider_metadata: dict = field(default_factory=dict)


@dataclass
class RefundInitiation:
    provider_reference: str | None
    status: str
    provider_metadata: dict = field(default_factory=dict)


@dataclass
class PaymentCallbackEvent:
    """Provider-authenticated payment state normalized for core booking logic.

    Provider implementations own signature/authentication and provider-specific
    payload parsing. Core payment code only consumes this normalized event.
    """

    provider_reference: str
    status: str
    amount: Decimal | None = None
    currency: str | None = None
    transaction_reference: str | None = None
    provider_metadata: dict = field(default_factory=dict)


class PaymentProvider(ABC):
    name: str

    @abstractmethod
    async def initiate_payment(
        self,
        *,
        reference: str,
        amount: Decimal,
        currency: str,
        method: str,
        return_url: str | None = None,
    ) -> PaymentInitiation:
        raise NotImplementedError

    @abstractmethod
    async def initiate_refund(
        self,
        *,
        provider_reference: str,
        amount: Decimal,
        currency: str,
        reason: str | None,
    ) -> RefundInitiation:
        raise NotImplementedError

    @abstractmethod
    async def verify_callback(self, payload: bytes, headers: dict[str, str]) -> PaymentCallbackEvent:
        """Authenticate a provider callback and return its normalized event."""
        raise NotImplementedError


class UnconfiguredPaymentProvider(PaymentProvider):
    name = "unconfigured"

    async def initiate_payment(
        self,
        *,
        reference: str,
        amount: Decimal,
        currency: str,
        method: str,
        return_url: str | None = None,
    ) -> PaymentInitiation:
        return PaymentInitiation(
            provider=self.name,
            provider_reference=reference,
            provider_metadata={"stage": "provider_selection_pending", "method": method},
        )

    async def initiate_refund(
        self,
        *,
        provider_reference: str,
        amount: Decimal,
        currency: str,
        reason: str | None,
    ) -> RefundInitiation:
        return RefundInitiation(
            provider_reference=None,
            status="requested",
            provider_metadata={"stage": "provider_selection_pending"},
        )

    async def verify_callback(self, payload: bytes, headers: dict[str, str]) -> PaymentCallbackEvent:
        raise RuntimeError("No payment provider is configured")


payment_provider: PaymentProvider = UnconfiguredPaymentProvider()
