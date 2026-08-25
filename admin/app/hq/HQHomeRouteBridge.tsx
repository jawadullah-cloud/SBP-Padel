'use client';
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';
export default function HQHomeRouteBridge(){const path=usePathname();useEffect(()=>{if(path!=='/hq')return;const handler=(e:MouseEvent)=>{const button=(e.target as HTMLElement)?.closest?.('.hqHomeSidebar .hqNavGroup button') as HTMLButtonElement|null;if(!button||button.textContent?.trim().toLowerCase()!=='staff')return;e.preventDefault();e.stopImmediatePropagation();window.location.href='/hq/staff'};document.addEventListener('click',handler,true);return()=>document.removeEventListener('click',handler,true)},[path]);return null}
