'use client';

import { useEffect,useState } from 'react';
import { usePathname } from 'next/navigation';

export default function HQTools(){
 const pathname=usePathname();
 const[ready,setReady]=useState(false);
 useEffect(()=>{setReady(Boolean(localStorage.getItem('sbp_padel_hq_token')))},[pathname]);
 function signOut(){localStorage.removeItem('sbp_padel_hq_token');location.href='/hq'}
 if(!ready||pathname==='/hq')return null;
 const links=[['/hq','Overview'],['/hq/provisioning','Venue Directory'],['/hq/reports','Reports'],['/hq/finance','Finance'],['/hq/audit','Audit Log']];
 const active=(href:string)=>href==='/hq'?pathname==='/hq':pathname.startsWith(href);
 return <aside className="hqSharedNav">
   <div className="brand"><small>SPORTS BOARD PUNJAB</small>SBP Padel HQ</div>
   <div className="hqNavGroup"><span>HEADQUARTERS</span>{links.map(([href,label])=><a key={href} className={active(href)?'active':''} href={href}>{label}</a>)}</div>
   <div className="hqNavFoot"><span>CENTRAL ADMIN</span><button type="button" onClick={signOut}>Sign out</button></div>
 </aside>
}
