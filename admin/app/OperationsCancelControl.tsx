'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';

type Booking={id:string;booking_code:string;status:string;player:{full_name:string}};
const API=process.env.NEXT_PUBLIC_API_URL||'http://127.0.0.1:8000/api/v1';

export default function OperationsCancelControl(){
 const pathname=usePathname();
 const[host,setHost]=useState<Element|null>(null),[booking,setBooking]=useState<Booking|null>(null),[open,setOpen]=useState(false),[reason,setReason]=useState('Venue operational cancellation'),[error,setError]=useState(''),[loading,setLoading]=useState(false);
 const token=typeof window!=='undefined'?localStorage.getItem('sbp_padel_ops_token')||'':'';
 async function api<T=unknown>(path:string,options:RequestInit={}):Promise<T>{const r=await fetch(`${API}${path}`,{...options,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},cache:'no-store'});let b:any=null;try{b=await r.json()}catch{}if(!r.ok)throw new Error(typeof b?.detail==='string'?b.detail:`Request failed (${r.status})`);return b as T}
 async function submit(){if(!booking)return;if(reason.trim().length<3){setError('Enter a reason for the cancellation.');return}setLoading(true);setError('');try{await api(`/operations/bookings/${booking.id}/cancel`,{method:'POST',body:JSON.stringify({reason:reason.trim()})});setOpen(false);setBooking(null);(document.querySelector('.drawerClose') as HTMLButtonElement|null)?.click();setTimeout(()=>{const refresh=[...document.querySelectorAll<HTMLButtonElement>('.opsFilters .btn')].find(b=>b.textContent?.trim()==='REFRESH');refresh?.click()},50)}catch(e){setError(e instanceof Error?e.message:'Unable to cancel booking')}finally{setLoading(false)}}
 useEffect(()=>{
  if(pathname!=='/'){setHost(null);setBooking(null);return}
  let cancelled=false;
  const scan=async()=>{
   const drawer=document.querySelector('.bookingDrawer');
   if(!drawer){if(!cancelled){setHost(null);setBooking(null)}return}
   const role=document.querySelector('.sideFoot span')?.textContent?.trim().toLowerCase();
   if(role!=='manager'&&role!=='admin'){setHost(null);setBooking(null);return}
   const code=drawer.querySelector('h2')?.textContent?.trim();
   const venueId=(document.querySelector('header.top select[aria-label="Active venue"]') as HTMLSelectElement|null)?.value;
   if(!code||!venueId)return;
   setHost(drawer);
   try{const rows=await api<Booking[]>(`/operations/bookings?venue_id=${venueId}&q=${encodeURIComponent(code)}`);if(cancelled)return;const found=rows.find(b=>b.booking_code===code)||null;setBooking(found&&['pending_payment','confirmed','rescheduled'].includes(found.status)?found:null)}catch{if(!cancelled)setBooking(null)}
  };
  const observer=new MutationObserver(()=>void scan());observer.observe(document.body,{childList:true,subtree:true});void scan();
  return()=>{cancelled=true;observer.disconnect()}
 },[pathname,token]);
 if(!host||!booking)return null;
 return <>{createPortal(<button className="btn drawerAction danger" onClick={()=>{setReason('Venue operational cancellation');setError('');setOpen(true)}}>CANCEL BOOKING</button>,host)}{open&&createPortal(<div className="opsRescheduleBackdrop" onClick={()=>setOpen(false)}><section className="opsRescheduleModal" onClick={e=>e.stopPropagation()}><div className="opsRescheduleHead"><div><small>MANAGER ACTION</small><h2>Cancel {booking.booking_code}</h2><p>{booking.player.full_name}</p></div><button onClick={()=>setOpen(false)}>×</button></div><label className="opsRescheduleReason">Cancellation reason<input value={reason} onChange={e=>setReason(e.target.value)} maxLength={500}/></label><p className="opsRescheduleNote">This is a venue-side cancellation. The booked slots will be released immediately. If the booking is paid, a refund request will be created for venue/HQ processing and the player will be notified.</p>{error&&<div className="error errorBar">{error}</div>}<div className="opsRescheduleActions"><button className="btn secondaryBtn" onClick={()=>setOpen(false)}>KEEP BOOKING</button><button className="btn danger" disabled={loading} onClick={submit}>{loading?'CANCELLING…':'CONFIRM CANCELLATION'}</button></div></section></div>,document.body)}</>;
}
