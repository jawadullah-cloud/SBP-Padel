from uuid import UUID
from fastapi import APIRouter,Depends,HTTPException
from pydantic import BaseModel
from sqlalchemy import func,select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.booking_policy import booking_change_context
from app.core.security import require_roles
from app.db.session import get_db
from app.models.domain import Booking,BookingSlot,Court,Payment,Refund,RefundStatus,User,UserRole,Venue
from app.models.operations import BookingCheckIn,UserVenueAssignment
from app.models.platform import AuditLog

router=APIRouter(prefix='/admin',tags=['central administration'])
admin_user=require_roles(UserRole.admin)
class ActiveRequest(BaseModel): is_active:bool

@router.get('/refunds-detailed')
async def detailed_refunds(_:User=Depends(admin_user),db:AsyncSession=Depends(get_db))->list[dict]:
    refunds=(await db.scalars(select(Refund).order_by(Refund.created_at.desc()).limit(500))).all(); out=[]
    for r in refunds:
        b=await db.get(Booking,r.booking_id); p=await db.get(Payment,r.payment_id)
        if not b: continue
        player=await db.get(User,b.user_id); venue=await db.get(Venue,b.venue_id); court=await db.get(Court,b.court_id)
        slots=(await db.scalars(select(BookingSlot).where(BookingSlot.booking_id==b.id).order_by(BookingSlot.start_time))).all()
        checkin=await db.scalar(select(BookingCheckIn).where(BookingCheckIn.booking_id==b.id)); policy=await booking_change_context(b,db)
        out.append({"id":str(r.id),"status":r.status.value,"amount":f"{r.amount:.2f}","currency":r.currency,"reason":r.reason,"provider_reference":r.provider_reference,"requested_at":r.created_at.isoformat(),"booking":{"id":str(b.id),"booking_code":b.booking_code,"date":b.booking_date.isoformat(),"status":b.status.value,"cancelled_at":b.cancelled_at.isoformat() if b.cancelled_at else None,"cancellation_reason":b.cancellation_reason,"slots":[{"start":s.start_time.isoformat(timespec='minutes'),"end":s.end_time.isoformat(timespec='minutes')} for s in slots],"venue":venue.name if venue else None,"city":venue.city if venue else None,"court":court.name if court else None,"player_name":player.full_name if player else None,"player_email":player.email if player else None,"player_phone":player.phone if player else None,"checked_in":bool(checkin),"checked_in_at":checkin.checked_in_at.isoformat() if checkin else None,"first_start":policy.get('first_start'),"hours_before_start":policy.get('hours_before'),"cutoff_hours":policy.get('cutoff_hours')},"payment":{"method":p.method if p else None,"provider":p.provider if p else None,"reference":p.provider_reference if p else None,"amount":f"{p.amount:.2f}" if p else None,"status":p.status.value if p else None}})
    return out

@router.patch('/staff/{user_id}/active')
async def set_staff_active(user_id:UUID,payload:ActiveRequest,current:User=Depends(admin_user),db:AsyncSession=Depends(get_db))->dict:
    user=await db.get(User,user_id)
    if not user or user.role==UserRole.player: raise HTTPException(404,'Staff account not found')
    if user.id==current.id and not payload.is_active: raise HTTPException(409,'You cannot disable your own HQ account')
    user.is_active=payload.is_active; await db.commit(); return {"id":str(user.id),"is_active":user.is_active}

@router.delete('/staff/{user_id}')
async def delete_staff(user_id:UUID,current:User=Depends(admin_user),db:AsyncSession=Depends(get_db))->dict:
    user=await db.get(User,user_id)
    if not user or user.role==UserRole.player: raise HTTPException(404,'Staff account not found')
    if user.id==current.id: raise HTTPException(409,'You cannot delete your own HQ account')
    assignments=await db.scalar(select(func.count()).select_from(UserVenueAssignment).where(UserVenueAssignment.user_id==user_id)) or 0
    audit=await db.scalar(select(func.count()).select_from(AuditLog).where(AuditLog.actor_user_id==user_id)) or 0
    checkins=await db.scalar(select(func.count()).select_from(BookingCheckIn).where(BookingCheckIn.checked_in_by_user_id==user_id)) or 0
    if assignments or audit or checkins: raise HTTPException(409,'This account has operational history and must be disabled rather than deleted')
    await db.delete(user); await db.commit(); return {"id":str(user_id),"deleted":True}

@router.get('/role-permissions')
async def role_permissions(_:User=Depends(admin_user))->list[dict]:
    return [
      {"role":"admin","label":"HQ Admin","permissions":["Province-wide dashboard and bookings","Venue provisioning and pricing","Staff and assignments","Policies","Finance, refunds and reconciliation","Reports and audit trail"]},
      {"role":"venue_manager","label":"Venue Manager","permissions":["Venue bookings and check-in","Player lookup and front-desk booking","Court closures and status","Bookable hours and pricing","Venue finance, refunds and reports"]},
      {"role":"venue_operator","label":"Venue Operator","permissions":["Venue bookings and check-in","Player lookup and registration","Front-desk booking","View pricing, finance and reports"]},
      {"role":"player","label":"Player","permissions":["Player app","Book and manage own bookings","Digital pass","Saved players and favourite venues"]},
    ]
