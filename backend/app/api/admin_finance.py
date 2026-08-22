from datetime import date, datetime, time, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import write_audit
from app.core.security import require_roles
from app.db.session import get_db
from app.models.domain import Payment, PaymentStatus, Refund, RefundStatus, User, UserRole
from app.models.platform import AuditLog, ReconciliationBatch

router = APIRouter(prefix="/admin", tags=["finance and audit"])
admin_user = require_roles(UserRole.admin)


def bounds(from_date: date, to_date: date) -> tuple[datetime, datetime]:
    return (
        datetime.combine(from_date, time.min, tzinfo=timezone.utc),
        datetime.combine(to_date, time.max, tzinfo=timezone.utc),
    )


@router.get("/finance/summary")
async def finance_summary(
    from_date: date = Query(...),
    to_date: date = Query(...),
    provider: str | None = None,
    _: User = Depends(admin_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    start, end = bounds(from_date, to_date)
    payment_filters = [Payment.created_at >= start, Payment.created_at <= end]
    if provider:
        payment_filters.append(Payment.provider == provider)
    paid_stmt = select(func.count(Payment.id), func.coalesce(func.sum(Payment.amount), 0)).where(
        *payment_filters, Payment.status.in_([PaymentStatus.paid, PaymentStatus.refunded, PaymentStatus.partially_refunded])
    )
    payment_count, paid_amount = (await db.execute(paid_stmt)).one()

    refund_stmt = select(func.count(Refund.id), func.coalesce(func.sum(Refund.amount), 0)).where(
        Refund.created_at >= start,
        Refund.created_at <= end,
        Refund.status == RefundStatus.completed,
    )
    refund_count, refunded_amount = (await db.execute(refund_stmt)).one()
    pending_refunds = await db.scalar(
        select(func.count(Refund.id)).where(
            Refund.created_at >= start,
            Refund.created_at <= end,
            Refund.status.in_([RefundStatus.requested, RefundStatus.processing]),
        )
    ) or 0
    paid = Decimal(paid_amount or 0)
    refunded = Decimal(refunded_amount or 0)
    return {
        "from_date": from_date.isoformat(),
        "to_date": to_date.isoformat(),
        "provider": provider or "all",
        "currency": "PKR",
        "payment_count": int(payment_count or 0),
        "paid_amount": f"{paid:.2f}",
        "refund_count": int(refund_count or 0),
        "refunded_amount": f"{refunded:.2f}",
        "net_amount": f"{paid - refunded:.2f}",
        "pending_refunds": int(pending_refunds),
    }


@router.get("/finance/transactions")
async def finance_transactions(
    from_date: date,
    to_date: date,
    limit: int = Query(default=500, ge=1, le=2000),
    _: User = Depends(admin_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    start, end = bounds(from_date, to_date)
    rows = (
        await db.scalars(
            select(Payment)
            .where(Payment.created_at >= start, Payment.created_at <= end)
            .order_by(Payment.created_at.desc())
            .limit(limit)
        )
    ).all()
    return [
        {
            "id": str(p.id),
            "booking_id": str(p.booking_id),
            "provider": p.provider,
            "provider_reference": p.provider_reference,
            "method": p.method,
            "status": p.status.value,
            "amount": f"{p.amount:.2f}",
            "currency": p.currency,
            "created_at": p.created_at.isoformat(),
        }
        for p in rows
    ]


@router.post("/finance/reconciliation-batches")
async def create_reconciliation_batch(
    from_date: date,
    to_date: date,
    provider: str | None = None,
    actor: User = Depends(admin_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    summary = await finance_summary(from_date, to_date, provider, actor, db)
    row = ReconciliationBatch(
        period_from=from_date,
        period_to=to_date,
        provider=provider or "all",
        currency=summary["currency"],
        paid_amount=Decimal(summary["paid_amount"]),
        refunded_amount=Decimal(summary["refunded_amount"]),
        net_amount=Decimal(summary["net_amount"]),
        payment_count=summary["payment_count"],
        refund_count=summary["refund_count"],
        generated_by_user_id=actor.id,
        generated_at=datetime.now(timezone.utc),
    )
    db.add(row)
    await db.flush()
    await write_audit(db, actor, "finance.reconciliation.generated", "reconciliation_batch", row.id, f"Generated reconciliation {from_date} to {to_date}", payload=summary)
    await db.commit()
    await db.refresh(row)
    return {"id": str(row.id), **summary}


@router.get("/finance/reconciliation-batches")
async def list_reconciliation_batches(
    _: User = Depends(admin_user), db: AsyncSession = Depends(get_db)
) -> list[dict]:
    rows = (await db.scalars(select(ReconciliationBatch).order_by(ReconciliationBatch.generated_at.desc()).limit(200))).all()
    return [
        {
            "id": str(r.id), "from_date": r.period_from.isoformat(), "to_date": r.period_to.isoformat(),
            "provider": r.provider, "currency": r.currency, "paid_amount": f"{r.paid_amount:.2f}",
            "refunded_amount": f"{r.refunded_amount:.2f}", "net_amount": f"{r.net_amount:.2f}",
            "payment_count": r.payment_count, "refund_count": r.refund_count, "generated_at": r.generated_at.isoformat(),
        }
        for r in rows
    ]


@router.get("/audit")
async def audit_log(
    action: str | None = None,
    entity_type: str | None = None,
    venue_id: UUID | None = None,
    limit: int = Query(default=200, ge=1, le=1000),
    _: User = Depends(admin_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    stmt = select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit)
    if action:
        stmt = stmt.where(AuditLog.action == action)
    if entity_type:
        stmt = stmt.where(AuditLog.entity_type == entity_type)
    if venue_id:
        stmt = stmt.where(AuditLog.venue_id == venue_id)
    rows = (await db.scalars(stmt)).all()
    return [
        {
            "id": str(r.id), "actor_user_id": str(r.actor_user_id) if r.actor_user_id else None,
            "actor_role": r.actor_role, "action": r.action, "entity_type": r.entity_type,
            "entity_id": r.entity_id, "venue_id": str(r.venue_id) if r.venue_id else None,
            "summary": r.summary, "payload": r.payload, "created_at": r.created_at.isoformat(),
        }
        for r in rows
    ]
