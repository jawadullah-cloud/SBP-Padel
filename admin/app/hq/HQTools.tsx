'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function HQTools(){
 const pathname=usePathname();
 const[ready,setReady]=useState(false);
 useEffect(()=>{setReady(Boolean(localStorage.getItem('sbp_padel_hq_token')))},[pathname]);
 function signOut(){localStorage.removeItem('sbp_padel_hq_token');location.href='/hq'}
 if(!ready)return null;
 const links=[['/hq','HQ HOME'],['/hq/provisioning','VENUES'],['/hq/reports','REPORTS'],['/hq/finance','FINANCE'],['/hq/audit','AUDIT LOG']];
 return <nav className="hqTools" aria-label="HQ navigation">
   {links.map(([href,label])=><a key={href} className={`btn ${pathname===href?'secondaryBtn':''}`} href={href} aria-current={pathname===href?'page':undefined}>{label}</a>)}
   <button className="btn danger" type="button" onClick={signOut}>SIGN OUT</button>
 </nav>
}
