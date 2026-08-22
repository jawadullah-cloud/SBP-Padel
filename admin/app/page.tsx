'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

type Venue = { id: string; name: string; city: string; role: string };
type Booking = { id: string; booking_code: string; date: string; status: string; slots: string[]; total: string; currency: string; checked_in: boolean };

const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';

export default function Page() {
  const [token, setToken] = useState<string>('');
  const [email, setEmail] = useState('manager@sbppadel.local');
  const [password, setPassword] = useState('PadelManager2026!');
  const [error, setError] = useState('');
  const [venues, setVenues] = useState<Venue[]>([]);
  const [venueId, setVenueId] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);

  const auth = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  async function api(path: string, options: RequestInit = {}) {
    const res = await fetch(`${API}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(token ? auth : {}), ...(options.headers || {}) } });
    if (!res.ok) throw new Error((await res.json()).detail || 'Request failed');
    return res.json();
  }

  async function login(event: FormEvent) {
    event.preventDefault(); setError('');
    try {
      const data = await api('/auth/login', { method: 'POST', body: JSON.stringify({ identifier: email, password }) });
      setToken(data.access_token); localStorage.setItem('sbp_padel_ops_token', data.access_token);
    } catch (e) { setError(e instanceof Error ? e.message : 'Login failed'); }
  }

  useEffect(() => { const saved = localStorage.getItem('sbp_padel_ops_token'); if (saved) setToken(saved); }, []);
  useEffect(() => { if (!token) return; api('/operations/my-venues').then((v: Venue[]) => { setVenues(v); if (v[0]) setVenueId(v[0].id); }).catch(() => { setToken(''); localStorage.removeItem('sbp_padel_ops_token'); }); }, [token]);
  useEffect(() => { if (!token || !venueId) return; api(`/operations/bookings?venue_id=${venueId}`).then(setBookings).catch(e => setError(e.message)); }, [token, venueId]);

  async function checkIn(id: string) {
    try { await api(`/operations/bookings/${id}/check-in`, { method: 'POST', body: JSON.stringify({}) }); setBookings(rows => rows.map(r => r.id === id ? { ...r, checked_in: true } : r)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Check-in failed'); }
  }

  if (!token) return <main className="login"><form className="loginCard" onSubmit={login}><div className="brand"><small>SPORTS BOARD PUNJAB</small>SBP Padel Operations</div><h1>Staff sign in</h1><p>Administration and venue operations portal.</p><input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email"/><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password"/><button className="btn">SIGN IN</button>{error&&<div className="error">{error}</div>}</form></main>;

  const confirmed = bookings.filter(b=>b.status==='confirmed').length;
  const checked = bookings.filter(b=>b.checked_in).length;
  return <div className="shell"><aside className="sidebar"><div className="brand"><small>SPORTS BOARD PUNJAB</small>SBP Padel</div><div className="nav"><button className="active">Overview</button><button>Bookings</button><button>Courts</button><button>Closures</button><button>Pricing</button><button>Reports</button></div></aside><main className="main"><header className="top"><div><h1>Venue Operations</h1><p>Live court, booking and front-desk control.</p></div><div className="pill">OPERATIONS ONLINE</div></header><section className="grid"><div className="card metric"><b>{bookings.length}</b><span>Bookings loaded</span></div><div className="card metric"><b>{confirmed}</b><span>Confirmed</span></div><div className="card metric"><b>{checked}</b><span>Checked in</span></div><div className="card metric"><b>{venues.length}</b><span>Assigned venues</span></div></section><section className="section"><div className="sectionHead"><h2>Bookings</h2><div className="toolbar"><select value={venueId} onChange={e=>setVenueId(e.target.value)}>{venues.map(v=><option key={v.id} value={v.id}>{v.name} · {v.city}</option>)}</select><button className="btn" onClick={()=>api(`/operations/bookings?venue_id=${venueId}`).then(setBookings)}>REFRESH</button></div></div>{error&&<div className="error">{error}</div>}<div className="table"><table><thead><tr><th>BOOKING</th><th>DATE</th><th>TIME</th><th>STATUS</th><th>AMOUNT</th><th>ACTION</th></tr></thead><tbody>{bookings.map(b=><tr key={b.id}><td><b>{b.booking_code}</b></td><td>{b.date}</td><td>{b.slots.join(', ')}</td><td><span className="status">{b.status.toUpperCase()}</span></td><td>{b.currency} {b.total}</td><td>{b.checked_in?<span className="status">CHECKED IN</span>:b.status==='confirmed'?<button className="btn" onClick={()=>checkIn(b.id)}>CHECK IN</button>:'—'}</td></tr>)}</tbody></table></div></section></main></div>;
}
