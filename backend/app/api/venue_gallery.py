import base64
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

def _validate_image(value:str)->str:
    allowed={
        'data:image/jpeg;base64,':'jpeg',
        'data:image/png;base64,':'png',
        'data:image/webp;base64,':'webp',
    }
    prefix=next((p for p in allowed if value.startswith(p)),None)
    if prefix is None: raise HTTPException(400,'Venue image must be JPEG, PNG or WebP')
    try: raw=base64.b64decode(value[len(prefix):],validate=True)
    except Exception: raise HTTPException(400,'Venue image is not valid base64 image data')
    if not raw or len(raw)>6_000_000: raise HTTPException(400,'Venue image is too large')
    kind=allowed[prefix]
    valid=(kind=='jpeg' and raw.startswith(b'\xff\xd8\xff')) or (kind=='png' and raw.startswith(b'\x89PNG\r\n\x1a\n')) or (kind=='webp' and len(raw)>=12 and raw[:4]==b'RIFF' and raw[8:12]==b'WEBP')
    if not valid: raise HTTPException(400,'Venue image content does not match its declared image type')
    return value

@router.get('/venues/{venue_id}/gallery',tags=['venues'])
async def public_gallery(venue_id:UUID,db:AsyncSession=Depends(get_db))->list[dict]:
    venue=await db.get(Venue,venue_id)
    if not venue or not venue.is_active: raise HTTPException(404,'Venue not found')
    rows=(await db.scalars(select(VenueImage).where(VenueImage.venue_id==venue_id).order_by(VenueImage.position,VenueImage.created_at))).all()
    return [{"id":str(r.id),"image_data_url":r.image_data_url,"caption":r.caption,"position":r.position,"is_cover":r.is_cover} for r in rows]

@router.get('/admin/venues/{venue_id}/images',tags=['administration'])
async def admin_images(venue_id:UUID,_:User=Depends(admin_user),db:AsyncSession=Depends(get_db))->list[dict]:
    rows=(await db.scalars(select(VenueImage).where(VenueImage.venue_id==venue_id).order_by(VenueImage.position,VenueImage.created_at))).all()
    return [{"id":str(r.id),"image_data_url":r.image_data_url,"caption":r.caption,"position":r.position,"is_cover":r.is_cover} for r in rows]

@router.post('/admin/venues/{venue_id}/images',tags=['administration'])
async def add_image(venue_id:UUID,payload:ImageCreate,_:User=Depends(admin_user),db:AsyncSession=Depends(get_db))->dict:
    if not await db.get(Venue,venue_id): raise HTTPException(404,'Venue not found')
    image_data=_validate_image(payload.image_data_url)
    count=await db.scalar(select(func.count()).select_from(VenueImage).where(VenueImage.venue_id==venue_id)) or 0
    if count>=12: raise HTTPException(409,'A venue can have up to 12 gallery images')
    if payload.is_cover or count==0: await db.execute(update(VenueImage).where(VenueImage.venue_id==venue_id).values(is_cover=False))
    row=VenueImage(venue_id=venue_id,image_data_url=image_data,caption=payload.caption.strip() if payload.caption else None,position=count,is_cover=payload.is_cover or count==0)
    db.add(row); await db.commit(); await db.refresh(row)
    return {"id":str(row.id),"position":row.position,"is_cover":row.is_cover}

async def _apply_order(db:AsyncSession, rows:list[VenueImage], image_ids:list[UUID])->None:
    by_id={r.id:r for r in rows}
    if len(image_ids)!=len(rows) or len(set(image_ids))!=len(image_ids) or set(image_ids)!=set(by_id):
        raise HTTPException(400,'Image order must include every venue image exactly once')
    for pos,image_id in enumerate(image_ids): by_id[image_id].position=1000+pos
    await db.flush()
    for pos,image_id in enumerate(image_ids): by_id[image_id].position=pos
    await db.flush()

@router.patch('/admin/venues/{venue_id}/images/{image_id}/cover',tags=['administration'])
async def set_cover(venue_id:UUID,image_id:UUID,_:User=Depends(admin_user),db:AsyncSession=Depends(get_db))->dict:
    rows=(await db.scalars(select(VenueImage).where(VenueImage.venue_id==venue_id).order_by(VenueImage.position,VenueImage.created_at))).all()
    row=next((x for x in rows if x.id==image_id),None)
    if not row: raise HTTPException(404,'Image not found')
    ordered=[row.id,*[x.id for x in rows if x.id!=row.id]]
    await _apply_order(db,rows,ordered)
    for item in rows: item.is_cover=item.id==row.id
    await db.commit()
    return {"id":str(row.id),"is_cover":True,"position":0}

@router.patch('/admin/venues/{venue_id}/images/order',tags=['administration'])
async def reorder(venue_id:UUID,payload:ImageOrder,_:User=Depends(admin_user),db:AsyncSession=Depends(get_db))->dict:
    rows=(await db.scalars(select(VenueImage).where(VenueImage.venue_id==venue_id).order_by(VenueImage.position,VenueImage.created_at))).all()
    await _apply_order(db,rows,payload.image_ids)
    await db.commit()
    return {"ordered":True,"image_ids":[str(x) for x in payload.image_ids]}

@router.delete('/admin/venues/{venue_id}/images/{image_id}',tags=['administration'])
async def delete_image(venue_id:UUID,image_id:UUID,_:User=Depends(admin_user),db:AsyncSession=Depends(get_db))->dict:
    row=await db.get(VenueImage,image_id)
    if not row or row.venue_id!=venue_id: raise HTTPException(404,'Image not found')
    was_cover=row.is_cover; await db.delete(row); await db.flush()
    remaining=(await db.scalars(select(VenueImage).where(VenueImage.venue_id==venue_id).order_by(VenueImage.position,VenueImage.created_at))).all()
    if remaining:
        await _apply_order(db,remaining,[x.id for x in remaining])
    if was_cover and remaining: remaining[0].is_cover=True
    await db.commit(); return {"id":str(image_id),"deleted":True}
