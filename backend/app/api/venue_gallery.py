from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.security import require_roles
from app.db.session import get_db
from app.models.domain import User, UserRole, Venue, VenueImage

router=APIRouter()
admin_user=require_roles(UserRole.admin)

class ImageCreate(BaseModel):
    image_data_url:str=Field(min_length=20,max_length=8_000_000)
    caption:str|None=Field(default=None,max_length=180)
    is_cover:bool=False
class ImageOrder(BaseModel):
    image_ids:list[UUID]=Field(min_length=1,max_length=20)

@router.get('/venues/{venue_id}/gallery',tags=['venues'])
async def public_gallery(venue_id:UUID,db:AsyncSession=Depends(get_db))->list[dict]:
    venue=await db.get(Venue,venue_id)
    if not venue or not venue.is_active: raise HTTPException(404,'Venue not found')
    rows=(await db.scalars(select(VenueImage).where(VenueImage.venue_id==venue_id).order_by(VenueImage.is_cover.desc(),VenueImage.position))).all()
    return [{"id":str(r.id),"image_data_url":r.image_data_url,"caption":r.caption,"position":r.position,"is_cover":r.is_cover} for r in rows]

@router.get('/admin/venues/{venue_id}/images',tags=['administration'])
async def admin_images(venue_id:UUID,_:User=Depends(admin_user),db:AsyncSession=Depends(get_db))->list[dict]:
    rows=(await db.scalars(select(VenueImage).where(VenueImage.venue_id==venue_id).order_by(VenueImage.position))).all()
    return [{"id":str(r.id),"image_data_url":r.image_data_url,"caption":r.caption,"position":r.position,"is_cover":r.is_cover} for r in rows]

@router.post('/admin/venues/{venue_id}/images',tags=['administration'])
async def add_image(venue_id:UUID,payload:ImageCreate,_:User=Depends(admin_user),db:AsyncSession=Depends(get_db))->dict:
    if not await db.get(Venue,venue_id): raise HTTPException(404,'Venue not found')
    if not payload.image_data_url.startswith('data:image/'): raise HTTPException(400,'Only image files are supported')
    count=await db.scalar(select(func.count()).select_from(VenueImage).where(VenueImage.venue_id==venue_id)) or 0
    if count>=12: raise HTTPException(409,'A venue can have up to 12 gallery images')
    if payload.is_cover or count==0: await db.execute(update(VenueImage).where(VenueImage.venue_id==venue_id).values(is_cover=False))
    row=VenueImage(venue_id=venue_id,image_data_url=payload.image_data_url,caption=payload.caption.strip() if payload.caption else None,position=count,is_cover=payload.is_cover or count==0)
    db.add(row); await db.commit(); await db.refresh(row)
    return {"id":str(row.id),"position":row.position,"is_cover":row.is_cover}

@router.patch('/admin/venues/{venue_id}/images/{image_id}/cover',tags=['administration'])
async def set_cover(venue_id:UUID,image_id:UUID,_:User=Depends(admin_user),db:AsyncSession=Depends(get_db))->dict:
    row=await db.get(VenueImage,image_id)
    if not row or row.venue_id!=venue_id: raise HTTPException(404,'Image not found')
    await db.execute(update(VenueImage).where(VenueImage.venue_id==venue_id).values(is_cover=False)); row.is_cover=True; await db.commit()
    return {"id":str(row.id),"is_cover":True}

@router.patch('/admin/venues/{venue_id}/images/order',tags=['administration'])
async def reorder(venue_id:UUID,payload:ImageOrder,_:User=Depends(admin_user),db:AsyncSession=Depends(get_db))->dict:
    rows=(await db.scalars(select(VenueImage).where(VenueImage.venue_id==venue_id))).all(); by_id={r.id:r for r in rows}
    if set(payload.image_ids)!=set(by_id): raise HTTPException(400,'Image order must include every venue image exactly once')
    for pos,image_id in enumerate(payload.image_ids): by_id[image_id].position=pos
    await db.commit(); return {"ordered":True}

@router.delete('/admin/venues/{venue_id}/images/{image_id}',tags=['administration'])
async def delete_image(venue_id:UUID,image_id:UUID,_:User=Depends(admin_user),db:AsyncSession=Depends(get_db))->dict:
    row=await db.get(VenueImage,image_id)
    if not row or row.venue_id!=venue_id: raise HTTPException(404,'Image not found')
    was_cover=row.is_cover; await db.delete(row); await db.flush()
    remaining=(await db.scalars(select(VenueImage).where(VenueImage.venue_id==venue_id).order_by(VenueImage.position))).all()
    for pos,item in enumerate(remaining): item.position=pos
    if was_cover and remaining: remaining[0].is_cover=True
    await db.commit(); return {"id":str(image_id),"deleted":True}
