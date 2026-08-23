'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';

export default function PlayersSidebarLink(){
  const pathname=usePathname();
  const[host,setHost]=useState<Element|null>(null);
  useEffect(()=>{
    if(pathname==='/players'){setHost(null);return}
    const nav=document.querySelector('.sidebar .nav');
    setHost(nav);
  },[pathname]);
  if(!host)return null;
  return createPortal(<a className="sidebarRouteLink" href="/players">Players</a>,host);
}
