'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

type Venue = { id: string; name: string; city: string; role: string };
type Booking = { id: string; booking_code: string; date: string; status: string; slots: string[]; total: string; currency: string; checked_in: boolean };
type Block = { id: string; date: string; start_time: string; end_time: string; type: string; reason: string; court_id: string | null };

const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';

export default function Page() {
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('manager@sbppadel.local');
  const [password, setPassword] = useState('PadelManager2026!');
  const [error, setError] = useState('');
  const [venues, setVenues] = useState<Venue[]>([]);
  const [venueId, setVenueId] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [tab, setTab] = useState<'overview'|'closures'>('overview');
  const [blockDate, setBlockDate] = useState('2026-09-10');
  const [blockStart, setBlockStart] = useState('19:00');
  const [blockEnd, setBlockEnd] = useState('21:00');
  const [blockType, setBlockType] = useState('maintenance');
  const [blockReason, setBlockReason] = useState('Scheduled maintenance');

  const auth = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);
  const currentVenue = venues.find(v=>v.id===venueId);

  async function api(path: string, options: RequestInit = {}) {
    const res = await fetch(`${API}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(token ? auth : {}), ...(options.headers || {}) } });
    if (!res.ok) throw new Error((await res.json()).detail || 'Request failed');
    return res.json();
  }

  async function login(event: FormEvent) {
    event.preventDefault(); setError('');
    try { const data = await api('/auth/login', { method: 'POST', body: JSON.stringify({ identifier: email, password }) }); setToken(data.access_token); localStorage.setItem('sbp_padel_ops_token', data.access_token); }
    catch (e) { setError(e instanceof Error ? e.message : 'Login failed'); }
  }

  async function loadBookings(id=venueId){ if(id) setBookings(await api(`/operations/bookings?venue_id=${id}`)); }
  async function loadBlocks(id=venueId){ if(id) setBlocks(await api(`/operations/blocks?venue_id=${id}`)); }

  useEffect(() => { const saved = localStorage.getItem('sbp_padel_ops_token'); if (saved) setToken(saved); }, []);
  useEffect(() => { if (!token) return; api('/operations/my-venues').then((v: Venue[]) => { setVenues(v); if (v[0]) setVenueId(v[0].id); }).catch(() => { setToken(''); localStorage.removeItem('sbp_padel_ops_token'); }); }, [token]);
  useEffect(() => { if (!token || !venueId) return; Promise.all([loadBookings(venueId),loadBlocks(venueId)]).catch(e=>setError(e.message)); }, [token, venueId]);

  async function checkIn(id: string) { try { await api(`/operations/bookings/${id}/check-in`, { method: 'POST', body: '{}' }); setBookings(rows => rows.map(r => r.id === id ? { ...r, checked_in: true } : r)); } catch (e) { setError(e instanceof Error ? e.message : 'Check-in failed'); } }
  async function createBlock(event: FormEvent) { event.preventDefault(); setError(''); try { await api('/operations/blocks',{method:'POST',body:JSON.stringify({venue_id:venueId,block_date:blockDate,start_time:blockStart,end_time:blockEnd,block_type:blockType,reason:blockReason})}); await loadBlocks(); } catch(e){setError(e instanceof Error?e.message:'Closure failed');} }
  async function removeBlock(id:string){ try{await api(`/operations/blocks/${id}`,{method:'DELETE'});await loadBlocks();}catch(e){setError(e instanceof Error?e.message:'Unable to remove closure');} }

  if (!token) return <main className="login"><form className="loginCard" onSubmit={login}><div className="brand"><small>SPORTS BOARD PUNJAB</small>SBP Padel Operations</div><h1>Staff sign in</h1><p>Administration and venue operations portal.</p><input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email"/><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password"/><button className="btn">SIGN IN</button>{error&&<div className="error">{error}</div>}</form></main>;

  const confirmed=bookings.filter(b=>b.status==='confirmed').length, checked=bookings.filter(b=>b.checked_in).length;
  return <div className="shell"><aside className="sidebar"><div className="brand"><small>SPORTS BOARD PUNJAB</small>SBP Padel</div><div className="nav"><button className={tab==='overview'?'active':''} onClick={()=>setTab('overview')}>Overview</button><button className={tab==='closures'?'active':''} onClick={()=>setTab('closures')}>Closures & Maintenance</button><button>Courts</button><button>Pricing</button><button>Reports</button></div></aside><main className="main"><header className="top"><div><h1>{tab==='overview'?'Venue Operations':'Closures & Maintenance'}</h1><p>{currentVenue?`${currentVenue.name} · ${currentVenue.city}`:'Loading assigned venue...'}</p></div><div className="toolbar"><select value={venueId} onChange={e=>setVenueId(e.target.value)}>{venues.map(v=><option key={v.id} value={v.id}>{v.name} · {v.city}</option>)}</select><div className="pill">{currentVenue?.role?.toUpperCase()||'OPERATIONS'}</div></div></header>{error&&<div className="error">{error}</div>}{tab==='overview'?<><section className="grid"><div className="card metric"><b>{bookings.length}</b><span>Bookings loaded</span></div><div className="card metric"><b>{confirmed}</b><span>Confirmed</span></div><div className="card metric"><b>{checked}</b><span>Checked in</span></div><div className="card metric"><b>{blocks.length}</b><span>Active closures</span></div></section><section className="section"><div className="sectionHead"><h2>Bookings</h2><button className="btn" onClick={()=>loadBookings()}>REFRESH</button></div><div className="table"><table><thead><tr><th>BOOKING</th><th>DATE</th><th>TIME</th><th>STATUS</th><th>AMOUNT</th><th>ACTION</th></tr></thead><tbody>{bookings.map(b=><tr key={b.id}><td><b>{b.booking_code}</b></td><td>{b.date}</td><td>{b.slots.join(', ')}</td><td><span className="status">{b.status.toUpperCase()}</span></td><td>{b.currency} {b.total}</td><td>{b.checked_in?<span className="status">CHECKED IN</span>:b.status==='confirmed'?<button className="btn" onClick={()=>checkIn(b.id)}>CHECK IN</button>:'—'}</td></tr>)}</tbody></table></div></section></>:<><section className="card closureForm"><div><h2>Block booking time</h2><p>Use for maintenance, official events, weather or other operational closures. New player bookings will be stopped immediately.</p></div><form onSubmit={createBlock}><label>Date<input type="date" value={blockDate} onChange={e=>setBlockDate(e.target.value)}/></label><label>From<input type="time" value={blockStart} onChange={e=>setBlockStart(e.target.value)}/></label><label>To<input type="time" value={blockEnd} onChange={e=>setBlockEnd(e.target.value)}/></label><label>Type<select value={blockType} onChange={e=>setBlockType(e.target.value)}><option value="maintenance">Maintenance</option><option value="official_event">Official event</option><option value="weather">Weather</option><option value="private_closure">Private closure</option><option value="other">Other</option></select></label><label className="wide">Reason<input value={blockReason} onChange={e=>setBlockReason(e.target.value)}/></label><button className="btn">CREATE CLOSURE</button></form></section><section className="section"><div className="sectionHead"><h2>Active closures</h2><button className="btn" onClick={()=>loadBlocks()}>REFRESH</button></div><div className="table"><table><thead><tr><th>DATE</th><th>TIME</th><th>TYPE</th><th>REASON</th><th>SCOPE</th><th>ACTION</th></tr></thead><tbody>{blocks.map(b=><tr key={b.id}><td>{b.date}</td><td>{b.start_time}–{b.end_time}</td><td>{b.type.replace('_',' ')}</td><td>{b.reason}</td><td>{b.court_id?'Court':'All courts'}</td><td>{currentVenue?.role==='manager'||currentVenue?.role==='admin'?<button className="btn danger" onClick={()=>removeBlock(b.id)}>REMOVE</button>:'View only'}</td></tr>)}</tbody></table></div></section></>}</main></div>;
}
