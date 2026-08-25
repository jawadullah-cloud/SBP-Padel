'use client';
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';
export default function HQTabBridge(){const pathname=usePathname();useEffect(()=>{if(pathname!=='/hq')return;const tab=(new URLSearchParams(window.location.search).get('tab')||'').trim().toLowerCase();if(!tab)return;let tries=0;const timer=window.setInterval(()=>{tries++;const buttons=[...document.querySelectorAll<HTMLButtonElement>('.hqHomeSidebar .hqNavGroup button')];const target=buttons.find(b=>b.textContent?.trim().toLowerCase()===tab);if(target){target.click();window.clearInterval(timer)}else if(tries>20)window.clearInterval(timer)},50);return()=>window.clearInterval(timer)},[pathname]);return null}
