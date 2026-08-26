'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';

type Booking={id:string;booking_code:string;date:string;status:string;court_id:string;court_name:string;slots:string[];total:string;currency:string;player:{full_name:string}};
type Slot={start_time:string;end_time:string;available:boolean;unavailable_reason:string|null;hourly_rate:string|null;currency:string};
type CourtAvailability={court_id:string;court_name:string;court_type:string;slots:Slot[]};
const API=process.env.NEXT_PUBLIC_API_URL||'http://127.0.0.1:8000/api/v1';
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};

export default function OperationsRescheduleControl(){
 const pathname=usePathname();
 const[host,setHost]=useState<Element|null>(null),[booking,setBooking]=useState<Booking|null>(null),[open,setOpen]=useState(false),[date,setDate]=useState(today()),[courtId,setCourtId]=useState(''),[slots,setSlots]=useState<string[]>([]),[courts,setCourts]=useState<CourtAvailability[]>([]),[reason,setReason]=useState('Venue operational adjustment'),[error,setError]=useState(''),[loading,setLoading]=useState(false);
 const token=typeof window!=='undefined'?localStorage.getItem('sbp_padel_ops_token')||'':'';
 const currentCourt=courts.find(c=>c.court_id===courtId);
 const requiredSlots=booking?.slots.length||1;

 async function api<T=unknown>(path:string,options:RequestInit={}):Promise<T>{const r=await fetch(`${API}${path}`,{...options,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},cache:'no-store'});let b:any=null;try{b=await r.json()}catch{}if(!r.ok)throw new Error(typeof b?.detail==='string'?b.detail:`Request failed (${r.status})`);return b as T}
 async function loadAvailability(day:string){const venueSelect=document.querySelector('header.top select[aria-label="Active venue"]') as HTMLSelectElement|null;const venueId=venueSelect?.value;if(!venueId)return;setLoading(true);setError('');try{const d=await api<{courts:CourtAvailability[]}>(`/venues/${venueId}/availability?date=${day}&_=${Date.now()}`);setCourts(d.courts);setCourtId(current=>d.courts.some(c=>c.court_id===current)?current:(d.courts[0]?.court_id||''));setSlots([])}catch(e){setError(e instanceof Error?e.message:'Unable to load availability')}finally{setLoading(false)}}
 function chooseSlot(start:string){setSlots(rows=>{if(rows.includes(start))return rows.filter(x=>x!==start);if(rows.length>=requiredSlots)return rows;return [...rows,start].sort()})}
 async function submit(){if(!booking||!courtId||slots.length!==requiredSlots){setError(`Select exactly ${requiredSlots} replacement slot${requiredSlots===1?'':'s'}.`);return}if(reason.trim().length<3){setError('Enter a reason for the reschedule.');return}setLoading(true);setError('');try{await api(`/operations/bookings/${booking.id}/reschedule`,{method:'POST',body:JSON.stringify({court_id:courtId,booking_date:date,slots,reason:reason.trim()})});setOpen(false);setBooking(null);(document.querySelector('.drawerClose') as HTMLButtonElement|null)?.click();setTimeout(()=>{const refresh=[...document.querySelectorAll<HTMLButtonElement>('.opsFilters .btn')].find(b=>b.textContent?.trim()==='REFRESH');refresh?.click()},50)}catch(e){setError(e instanceof Error?e.message:'Unable to reschedule booking')}finally{setLoading(false)}}

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
   try{const rows=await api<Booking[]>(`/operations/bookings?venue_id=${venueId}&q=${encodeURIComponent(code)}`);if(cancelled)return;const found=rows.find(b=>b.booking_code===code)||null;setBooking(found&&['confirmed','rescheduled'].includes(found.status)?found:null)}catch{if(!cancelled)setBooking(null)}
  };
  const observer=new MutationObserver(()=>void scan());observer.observe(document.body,{childList:true,subtree:true});void scan();
  return()=>{cancelled=true;observer.disconnect()}
 },[pathname,token]);

 if(!host||!booking)return null;
 return <>{createPortal(<button className="btn drawerAction opsRescheduleLaunch" onClick={()=>{setDate(booking.date>=today()?booking.date:today());setCourtId(booking.court_id);setSlots([]);setReason('Venue operational adjustment');setError('');setOpen(true);void loadAvailability(booking.date>=today()?booking.date:today())}}>RESCHEDULE BOOKING</button>,host)}{open&&createPortal(<div className="opsRescheduleBackdrop" onClick={()=>setOpen(false)}><section className="opsRescheduleModal" onClick={e=>e.stopPropagation()}><div className="opsRescheduleHead"><div><small>MANAGER ACTION</small><h2>Reschedule {booking.booking_code}</h2><p>{booking.player.full_name} · current: {booking.date} · {booking.court_name} · {booking.slots.join(', ')}</p></div><button onClick={()=>setOpen(false)}>×</button></div><div className="opsRescheduleGrid"><label>New date<input type="date" min={today()} value={date} onChange={e=>{setDate(e.target.value);void loadAvailability(e.target.value)}}/></label><label>New court<select value={courtId} onChange={e=>{setCourtId(e.target.value);setSlots([])}}>{courts.map(c=><option key={c.court_id} value={c.court_id}>{c.court_name} · {c.court_type}</option>)}</select></label></div><div><span className="fieldTitle">Choose exactly {requiredSlots} replacement slot{requiredSlots===1?'':'s'}</span><div className="opsRescheduleSlots">{loading&&!courts.length?<div className="emptyPanel">Loading live availability…</div>:(currentCourt?.slots||[]).map(s=><button type="button" disabled={!s.available} className={`${slots.includes(s.start_time)?'selected':''} ${!s.available?'unavailable':''}`} key={s.start_time} onClick={()=>chooseSlot(s.start_time)}><b>{s.start_time}–{s.end_time}</b><small>{s.available?(s.hourly_rate?`PKR ${Number(s.hourly_rate).toLocaleString()}`:'Available'):(s.unavailable_reason||'Unavailable')}</small></button>)}</div></div><label className="opsRescheduleReason">Reason<input value={reason} onChange={e=>setReason(e.target.value)} maxLength={500}/></label><p className="opsRescheduleNote">The player will receive a reschedule notification. Venue staff rescheduling is allowed for operational reasons even inside the player self-service cutoff. The replacement must currently have the same total price to keep the paid transaction reconciled.</p>{error&&<div className="error errorBar">{error}</div>}<div className="opsRescheduleActions"><button className="btn secondaryBtn" onClick={()=>setOpen(false)}>CANCEL</button><button className="btn" disabled={loading||slots.length!==requiredSlots} onClick={submit}>{loading?'SAVING…':'CONFIRM RESCHEDULE'}</button></div></section></div>,document.body)}</>;
}
