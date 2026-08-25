'use client';

import { useEffect,useState } from 'react';
import { usePathname } from 'next/navigation';

export default function HQTools(){
 const pathname=usePathname();
 const[ready,setReady]=useState(false);
 useEffect(()=>{setReady(Boolean(localStorage.getItem('sbp_padel_hq_token')))},[pathname]);
 function signOut(){localStorage.removeItem('sbp_padel_hq_token');location.href='/hq'}
 if(!ready||pathname==='/hq')return null;
 const links=[['/hq','Overview'],['/hq?tab=bookings','Bookings'],['/hq/staff','Staff'],['/hq?tab=policies','Policies'],['/hq?tab=refunds','Refunds'],['/hq/provisioning','Venue Directory'],['/hq/reports','Reports'],['/hq/finance','Finance'],['/hq/audit','Activity Trail']];
 const active=(href:string)=>href==='/hq'?false:href==='/hq/staff'?pathname.startsWith('/hq/staff'):href.startsWith('/hq/provisioning')?pathname.startsWith('/hq/provisioning'):href.startsWith('/hq/reports')?pathname.startsWith('/hq/reports'):href.startsWith('/hq/finance')?pathname.startsWith('/hq/finance'):href.startsWith('/hq/audit')?pathname.startsWith('/hq/audit'):false;
 return <aside className="hqSharedNav">
   <div className="brand"><small>SPORTS BOARD PUNJAB</small>SBP Padel HQ</div>
   <div className="hqNavGroup"><span>HEADQUARTERS</span>{links.map(([href,label])=><a key={href} className={active(href)?'active':''} href={href}>{label}</a>)}</div>
   <div className="hqNavFoot"><span>CENTRAL ADMIN</span><button type="button" onClick={signOut}>Sign out</button></div>
 </aside>
}
