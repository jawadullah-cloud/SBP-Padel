'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';

export default function PlayersSidebarLink(){
  const pathname=usePathname();
  const[host,setHost]=useState<Element|null>(null);

  useEffect(()=>{
    setHost(null);
    if(pathname==='/players'||pathname==='/scan-pass'||pathname.startsWith('/hq'))return;

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

  if(!host)return null;
  return createPortal(<><a className="sidebarRouteLink" href="/players">Players</a><a className="sidebarRouteLink" href="/scan-pass">Scan Pass</a></>,host);
}
