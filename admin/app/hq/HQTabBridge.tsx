'use client';
import {useEffect} from 'react';
import {usePathname,useSearchParams} from 'next/navigation';
export default function HQTabBridge(){const pathname=usePathname(),params=useSearchParams();useEffect(()=>{if(pathname!=='/hq')return;const tab=(params.get('tab')||'').trim().toLowerCase();if(!tab)return;let tries=0;const timer=setInterval(()=>{tries++;const buttons=[...document.querySelectorAll<HTMLButtonElement>('.hqHomeSidebar .hqNavGroup button')];const target=buttons.find(b=>b.textContent?.trim().toLowerCase()===tab);if(target){target.click();clearInterval(timer)}else if(tries>20)clearInterval(timer)},50);return()=>clearInterval(timer)},[pathname,params]);return null}
