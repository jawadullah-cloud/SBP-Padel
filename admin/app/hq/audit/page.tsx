'use client';

import { useEffect, useMemo, useState } from 'react';

const API=process.env.NEXT_PUBLIC_API_URL||'http://127.0.0.1:8000/api/v1';
type Audit={id:string;actor_user_id:string|null;actor_role:string|null;action:string;entity_type:string;entity_id:string|null;summary:string;created_at:string};

export default function AuditPage(){
 const [token,setToken]=useState('');const [rows,setRows]=useState<Audit[]>([]);const [error,setError]=useState('');const auth=useMemo(()=>({Authorization:`Bearer ${token}`}),[token]);
 async function load(){try{const r=await fetch(`${API}/admin/audit?limit=300`,{headers:auth});if(!r.ok)throw new Error((await r.json()).detail||'Request failed');setRows(await r.json())}catch(e){setError(e instanceof Error?e.message:'Unable to load audit log')}}
 useEffect(()=>{setToken(localStorage.getItem('sbp_padel_hq_token')||'')},[]);useEffect(()=>{if(token)load()},[token]);
 return <main className="main"><header className="top"><div><h1>Audit Log</h1><p>Administrative and venue-operation changes across SBP Padel.</p></div><div className="toolbar"><button className="btn" onClick={load}>REFRESH</button><a className="btn" href="/hq">BACK TO HQ</a></div></header>{error&&<div className="error">{error}</div>}<section className="section"><div className="table"><table><thead><tr><th>TIME</th><th>ROLE</th><th>ACTION</th><th>SUMMARY</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{new Date(r.created_at).toLocaleString()}</td><td><span className="status">{(r.actor_role||'system').toUpperCase()}</span></td><td>{r.action}</td><td>{r.summary}</td></tr>)}</tbody></table></div></section></main>
}
