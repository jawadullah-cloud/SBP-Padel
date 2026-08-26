'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';

type OpsTab='schedule'|'bookings'|'new'|'payments'|'pricing'|'closures'|'courts'|'reports';

const operationalTabs:[OpsTab,string][]=[
  ['schedule','Court Schedule'],
  ['bookings','Bookings'],
  ['new','New Booking'],
  ['payments','Payments & Refunds'],
  ['pricing','Bookable Hours & Pricing'],
  ['closures','Closures & Maintenance'],
  ['courts','Courts'],
  ['reports','Reports'],
];

export default function PlayersSidebarLink(){
  const pathname=usePathname();
  const router=useRouter();
  const[host,setHost]=useState<Element|null>(null);

  useEffect(()=>{
    setHost(null);
    if(pathname.startsWith('/hq'))return;
    const findHost=()=>{
      const nav=document.querySelector('.sidebar .nav');
      if(nav){setHost(nav);return true}
      return false;
    };
    if(findHost())return;
    const observer=new MutationObserver(()=>{if(findHost())observer.disconnect()});
    observer.observe(document.body,{childList:true,subtree:true});
    return()=>observer.disconnect();
  },[pathname]);

  useEffect(()=>{
    if(pathname!=='/')return;
    const requested=(sessionStorage.getItem('sbp_padel_ops_target_tab')||new URLSearchParams(location.search).get('tab')||'') as OpsTab;
    if(!operationalTabs.some(([id])=>id===requested))return;
    sessionStorage.removeItem('sbp_padel_ops_target_tab');
    let tries=0;
    const open=()=>{
      const label=operationalTabs.find(([id])=>id===requested)?.[1];
      const button=[...document.querySelectorAll<HTMLButtonElement>('.sidebar .nav button')].find(el=>el.textContent?.trim()===label);
      if(button){button.click();history.replaceState(null,'',location.pathname);return}
      if(++tries<30)setTimeout(open,40);
    };
    open();
  },[pathname]);

  useEffect(()=>{
    if(pathname!=='/players'&&pathname!=='/scan-pass')return;
    const intercept=(event:MouseEvent)=>{
      const anchor=(event.target as Element|null)?.closest?.('a[href="/"]');
      if(!anchor)return;
      event.preventDefault();
      if(sessionStorage.getItem('sbp_padel_ops_utility_origin')==='console'){
        sessionStorage.removeItem('sbp_padel_ops_utility_origin');
        router.back();
      }else router.push('/');
    };
    document.addEventListener('click',intercept,true);
    return()=>document.removeEventListener('click',intercept,true);
  },[pathname,router]);

  if(!host)return null;

  if(pathname==='/players'||pathname==='/scan-pass'){
    const go=(tab:OpsTab)=>{
      sessionStorage.setItem('sbp_padel_ops_target_tab',tab);
      if(sessionStorage.getItem('sbp_padel_ops_utility_origin')==='console'){
        sessionStorage.removeItem('sbp_padel_ops_utility_origin');
        router.back();
      }else router.push(`/?tab=${tab}`);
    };
    return createPortal(<div className="opsRouteNavExtension">{operationalTabs.map(([id,label])=><button type="button" key={id} onClick={()=>go(id)}>{label}</button>)}{pathname==='/players'&&<button type="button" onClick={()=>router.push('/scan-pass')}>Scan Pass</button>}</div>,host);
  }

  const openUtility=(path:string)=>{sessionStorage.setItem('sbp_padel_ops_utility_origin','console');router.push(path)};
  return createPortal(<><button type="button" className="sidebarRouteLink" onClick={()=>openUtility('/players')}>Players</button><button type="button" className="sidebarRouteLink" onClick={()=>openUtility('/scan-pass')}>Scan Pass</button></>,host);
}
