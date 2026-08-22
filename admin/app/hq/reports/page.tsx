'use client';

import { useEffect, useMemo, useState } from 'react';

const API=process.env.NEXT_PUBLIC_API_URL||'http://127.0.0.1:8000/api/v1';
type Row={venue_id:string;venue_name:string;city:string;confirmed_completed_bookings:number;booked_hours:number;gross_paid:string;currency:string};

export default function ReportsPage(){
 const [token,setToken]=useState('');const [fromDate,setFromDate]=useState('2026-08-01');const [toDate,setToDate]=useState('2026-08-31');const [rows,setRows]=useState<Row[]>([]);const [error,setError]=useState('');const auth=useMemo(()=>({Authorization:`Bearer ${token}`}),[token]);
 async function load(){try{const r=await fetch(`${API}/admin/reports/venue-performance?from_date=${fromDate}&to_date=${toDate}`,{headers:auth});if(!r.ok)throw new Error((await r.json()).detail||'Request failed');setRows(await r.json())}catch(e){setError(e instanceof Error?e.message:'Unable to load report')}}
 useEffect(()=>{setToken(localStorage.getItem('sbp_padel_hq_token')||'')},[]);useEffect(()=>{if(token)load()},[token]);
 return <main className="main"><header className="top"><div><h1>Venue Performance</h1><p>Bookings, court-hours and gross paid collections by facility.</p></div><a className="btn" href="/hq">BACK TO HQ</a></header><section className="card bookingFilters"><input type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)}/><input type="date" value={toDate} onChange={e=>setToDate(e.target.value)}/><button className="btn" onClick={load}>RUN REPORT</button></section>{error&&<div className="error">{error}</div>}<section className="section"><div className="table"><table><thead><tr><th>VENUE</th><th>CITY</th><th>BOOKINGS</th><th>BOOKED HOURS</th><th>GROSS PAID</th></tr></thead><tbody>{rows.map(r=><tr key={r.venue_id}><td><b>{r.venue_name}</b></td><td>{r.city}</td><td>{r.confirmed_completed_bookings}</td><td>{r.booked_hours}</td><td>{r.currency} {r.gross_paid}</td></tr>)}</tbody></table></div></section></main>
}
